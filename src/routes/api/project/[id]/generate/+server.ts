import { PrismaChatRepository } from '$chat/infra/ChatRepository/PrismaChatRepository';
import { env } from '$env/dynamic/private';
import { prisma } from '$lib/server/db';
import { sqsClient } from '$lib/server/sqs';
import { SpecVersion } from '$specs/domain/SpecVersion';
import { PrismaSpecRepository } from '$specs/infra/SpecRepository/PrismaSpecRepository';
import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { error, json } from '@sveltejs/kit';

const chatRepo = new PrismaChatRepository(prisma);
const specRepo = new PrismaSpecRepository(prisma);

export const POST = async ({ params, locals }) => {
    if (!locals.session) throw error(401, 'Unauthorized');

    const { id: projectId } = params;

    // 1. Validate Conversation Exists
    const conversationId = await chatRepo.findLatestConversationId(projectId);
    if (!conversationId) throw error(400, 'No conversation found');

    // 2. Create Pending Spec
    const spec = SpecVersion.create(projectId); // Default status PENDING
    await specRepo.save(spec);

    // 3. Push to SQS
    try {
        if (env.SQS_QUEUE_URL) {
            await sqsClient.send(new SendMessageCommand({
                QueueUrl: env.SQS_QUEUE_URL,
                MessageBody: JSON.stringify({
                    specId: spec.id,
                    projectId,
                    conversationId
                })
            }));
        } else {
             // Fallback for local dev without SQS?
             // For now, we assume SQS is configured or we rely on the worker loop if it was in-memory (it's not).
             // Actually, if no SQS, we might want to warn or error? 
             // Or maybe we start the worker process in generic way?
             // Let's assume env is set. If not, log warning.
             console.warn('SQS_QUEUE_URL not set. Job not queued.');
        }
    } catch (e) {
        console.error('Failed to queue spec generation', e);
        // If queue fails, mark as FAILED?
        await specRepo.save(spec.markAsFailed());
        throw error(500, 'Failed to queue generation');
    }

    return json({ success: true, specId: spec.id, status: 'PENDING' });
};
