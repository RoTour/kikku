# Feature 3: The Architect (Interview)

## Summary
Chat interface for requirements gathering.

## Technical Stack
- **LLM**: OpenRouter (Gemini Flash for dev/fast turns, Gemini Pro for summary).
- **Streaming**: SvelteKit `StreamData` or SSE.
- **State**: Svelte Runes for chat history UI.
- **Context Window**: Rolling summary window.

## Summarization Strategy
- **Config**: `SUMMARIZATION_THRESHOLD` (e.g., every 5 user turns).
- **Mechanism**:
    - When `current_turns > threshold`:
    - Trigger background job to summarize last N messages.
    - Append summary to `system_prompt` or `context` block.
    - Archive old raw messages from active context window.

## Ports & Adapters Strategy
- **Driver Port**: `ChatService` (send message).
- **Driver Adapter**: Chat UI Component.
- **Driven Port**: `LLMProvider` (OpenRouter).
- **Driven Port**: `ChatRepository` (Prisma).
    - Models: `Conversation`, `Message`, `Summary`.

## Implementation Details
1.  **Prisma Schema**: `Message` (role, content, projectId).
2.  **API**: `POST /api/chat` -> Saves User Msg -> Calls LLM -> Streams Response -> Saves AI Msg.
3.  **Optimization**: Background worker (or simple async function) checks for summarization trigger.
