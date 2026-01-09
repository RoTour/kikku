import { Message } from '$chat/domain/Message';
import { PrismaChatRepository } from '$chat/infra/ChatRepository/PrismaChatRepository';
import { env } from '$env/dynamic/private';
import { prisma } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { z } from 'zod';

const chatRepo = new PrismaChatRepository(prisma);

const requestSchema = z.object({
    projectId: z.string(),
    message: z.string().min(1),
    isRetry: z.boolean().optional()
});

export const POST = async ({ request, locals }) => {
    // 1. Auth Check
    if (!locals.session || !locals.user) {
        throw error(401, 'Unauthorized');
    }

    // Fetch fresh user data including limits
    const user = await prisma.user.findUnique({
        where: { id: locals.user.id }
    });

    if (!user) throw error(401, 'User not found');

    // 2. Parse Request
    const json = await request.json();
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
        throw error(400, 'Invalid request');
    }
    const { projectId, message: userContent, isRetry } = parsed.data;

    // 3. Get/Create Conversation
    let conversationId = await chatRepo.findLatestConversationId(projectId);

    // [LIMIT CHECK]
    if (user.tier === 'DISCOVER') {
        if (conversationId) {
             const history = await chatRepo.getHistory(conversationId);
             // Limit to 40 messages (20 turns)
             if (history.length >= 40) {
                 throw error(403, 'Free tier limit reached (20 turns max). Please upgrade to continue.');
             }
        }
    } else {
        // Paid tiers: Check for positive balance
        if (user.tokenBalance <= 0) {
            throw error(403, 'Insufficient credits. Please top up your balance.');
        }
    }

    if (!conversationId) {
        conversationId = await chatRepo.createConversation(projectId);
    }

    // 4. Save User Message
    let shouldSaveUserMessage = true;
    if (isRetry && conversationId) {
        const history = await chatRepo.getHistory(conversationId);
        const lastMsg = history[history.length - 1];
        // If last message is user and same content, don't duplicate
        // If last message is ASSISTANT, we are retrying the USER message before it?
        // Wait, if I retry a message, usually it's MY last message.
        // If history: User(A), Assistant(B). Retry A.
        // Check history[length-2] == A?
        // Or if I just blindly resent A.
        // If I skip saving A, then history passed to LLM is A, B.
        // LLM sees A, B ... generates C.
        // History becomes A, B, C.
        // This is weird.
        
        // BETTER LOGIC: If retry, delete all messages AFTER the last user message that matches content?
        // OR simpler: just don't save. The user complaint is "duplicate".
        
        // If I verify specifically against DUPLICATION.
        // If last message is User(A) (maybe network error prevented assistant response), then skip.
        // If last message is Assistant(B), and I send A again.
        // If I skip A, history is A, B. Response C. -> A, B, C.
        // User sees: A... B... [Retry] -> A... C.
        // User sees ONE A.
        
        // If I save A: A, B, A, C.
        // User sees A... B... A... C.
        
        // So skipping saving A is the right direction for visuals.
        // Ideally we should maybe mark B as "stale" or delete it, but that's complex.
        // Let's simpler check if we are just appending a duplicate user message at the end?
        // But in A, B scenarios, we are appending A. A != B. So we WOULD append A.
        
        // HACK: Check if the message BEFORE last (if last is assistant) matches?
        // Or simple check: Does history contain this message as the *last* user message?
        
        // Refined Logic for "Retry": 
        // We assume the client sends the same text.
        // We want to avoid DB having ... User(A), Assistant(B), User(A), Assistant(C).
        // We want ... User(A), Assistant(B), Assistant(C) (if we allow multiple answers)
        // OR ... User(A), Assistant(C) (if we verify B is bad).
        
        // Let's implement: "Don't save user message if the LAST USER MESSAGE in history has same content".
        const lastUserMsg = [...history].reverse().find(m => m.role === 'user');
        if (lastUserMsg && lastUserMsg.content === userContent) {
             shouldSaveUserMessage = false;
        }
    }

    if (shouldSaveUserMessage) {
        const userMessage = Message.create(conversationId!, 'user', userContent);
        await chatRepo.saveMessage(userMessage);
    }

    // 5. Load History (Refresh to include new message if saved, or just get current state)
    const history = await chatRepo.getHistory(conversationId!);
    
    // 6. Prepare specific Prompt (System + History)
    const systemPrompt = {
        role: "system",
        content: `You are The Architect, an expert software consultant. Your goal is to help the user define a detailed specification for their app idea. 
        
        Guidelines:
        1. Ask clarifying questions one by one to build a complete spec.
        2. Be concise but insightful.
        3. IMPORTANT: If the user asks a question, provides ambiguous input, or generally digresses, ADDRESS THEIR INPUT DIRECTLY and DO NOT move to the next questionnaire step until the current topic is resolved.
        4. Only proceed to the next logical question when the user has provided a clear answer or decision for the current one.`
    };

    const messages = [
        systemPrompt,
        ...history.map(m => ({ role: m.role, content: m.content }))
    ];

    // 7. Call OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: (import.meta.env.DEV ? env.LLM_DISCUSSION_MODEL_DEV : env.LLM_DISCUSSION_MODEL_PROD) || "google/gemini-flash-1.5",
            messages,
            stream: true
        })
    });

    if (!response.ok || !response.body) {
         throw error(500, 'Failed to connect to LLM');
    }

    // 8. Stream Handling & Saving
    const [clientStream, dbStream] = response.body.tee();

    (async () => {
        const reader = dbStream.getReader();
        const decoder = new TextDecoder();
        let fullResponse = "";

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(line.slice(6));
                            const delta = data.choices[0]?.delta?.content;
                            if (delta) fullResponse += delta;
                        } catch (e) {}
                    }
                }
            }
        } finally {
            if (fullResponse) {
                const aiMessage = Message.create(conversationId!, 'assistant', fullResponse);
                await chatRepo.saveMessage(aiMessage);
            }
        }
    })();

    // 9. Return Stream
    return new Response(clientStream, {
        headers: {
            'content-type': 'text/event-stream'
        }
    });
};
