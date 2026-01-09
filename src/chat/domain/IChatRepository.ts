import type { Message } from './Message';

export interface IChatRepository {
    // Actions
    createConversation(projectId: string): Promise<string>; // returns conversationId
    saveMessage(message: Message): Promise<void>;
    
    // Queries
    findLatestConversationId(projectId: string): Promise<string | null>;
    getHistory(conversationId: string): Promise<Message[]>;
}
