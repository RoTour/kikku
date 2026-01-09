import { describe, expect, it } from 'vitest';
import { Message } from './Message';

describe('Message Domain Entity', () => {
    it('should create a new message', () => {
        const convId = 'conv-123';
        const msg = Message.create(convId, 'user', 'Hello Agent');

        expect(msg.id).toBeDefined();
        expect(msg.conversationId).toBe(convId);
        expect(msg.role).toBe('user');
        expect(msg.content).toBe('Hello Agent');
        expect(msg.createdAt).toBeInstanceOf(Date);
    });

    it('should rehydrate a message', () => {
        const id = 'msg-123';
        const date = new Date('2023-01-01');
        const msg = Message.rehydrate(
            id,
            'conv-456',
            'assistant',
            'I am here',
            date
        );

        expect(msg.id).toBe(id);
        expect(msg.role).toBe('assistant');
        expect(msg.content).toBe('I am here');
    });
});
