export class Message {
    constructor(
        public readonly id: string,
        public readonly conversationId: string,
        public readonly role: 'user' | 'assistant' | 'system',
        public readonly content: string,
        public readonly createdAt: Date
    ) {}

    static create(conversationId: string, role: 'user' | 'assistant' | 'system', content: string): Message {
        return new Message(
            crypto.randomUUID(),
            conversationId,
            role,
            content,
            new Date()
        );
    }

    static rehydrate(
        id: string,
        conversationId: string,
        role: 'user' | 'assistant' | 'system',
        content: string,
        createdAt: Date
    ): Message {
        return new Message(id, conversationId, role, content, createdAt);
    }
}
