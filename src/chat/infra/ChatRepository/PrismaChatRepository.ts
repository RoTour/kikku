import type { IChatRepository } from '$chat/domain/IChatRepository';
import { Message } from '$chat/domain/Message';
import type { PrismaClient, Message as PrismaMessage } from '@prisma/client';

class MessageMapper {
    static fromPrismaToDomain(prismaModel: PrismaMessage): Message {
        return Message.rehydrate(
            prismaModel.id,
            prismaModel.conversationId,
            prismaModel.role as 'user' | 'assistant' | 'system',
            prismaModel.content,
            prismaModel.createdAt
        );
    }

    static fromDomainToPrisma(domainModel: Message): PrismaMessage {
        return {
            id: domainModel.id,
            conversationId: domainModel.conversationId,
            role: domainModel.role,
            content: domainModel.content,
            createdAt: domainModel.createdAt
        };
    }
}

export class PrismaChatRepository implements IChatRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async createConversation(projectId: string): Promise<string> {
        const conversation = await this.prisma.conversation.create({
            data: { projectId }
        });
        return conversation.id;
    }

    async findLatestConversationId(projectId: string): Promise<string | null> {
        const conversation = await this.prisma.conversation.findFirst({
            where: { projectId },
            orderBy: { updatedAt: 'desc' }
        });
        return conversation?.id || null;
    }

    async saveMessage(message: Message): Promise<void> {
        const data = MessageMapper.fromDomainToPrisma(message);
        // Ensure conversation exists or throw? It should exist domain-wise.
        await this.prisma.message.create({
            data
        });
        
        // Update conversation timestamp
        await this.prisma.conversation.update({
            where: { id: message.conversationId },
            data: { updatedAt: new Date() }
        });
    }

    async getHistory(conversationId: string): Promise<Message[]> {
        const messages = await this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' }
        });
        return messages.map(MessageMapper.fromPrismaToDomain);
    }
}
