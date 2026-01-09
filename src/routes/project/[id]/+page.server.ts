import { PrismaChatRepository } from '$chat/infra/ChatRepository/PrismaChatRepository';
import { prisma } from '$lib/server/db';
import { PrismaProjectRepository } from '$projects/infra/ProjectRepository/PrismaProjectRepository';
import { error, redirect } from '@sveltejs/kit';

const projectRepo = new PrismaProjectRepository(prisma);
const chatRepo = new PrismaChatRepository(prisma);

export const load = async ({ params, locals }) => {
    if (!locals.session) {
        throw redirect(303, '/login');
    }

    const { id } = params;

    // 1. Get Project & Verify Ownership
    const project = await projectRepo.findById(id);
    if (!project || project.ownerId !== locals.user!.id) {
        throw error(404, 'Project not found'); // 404 to check ownership subtly
    }

    // 2. Get History
    // We need conversationId. 
    let conversationId = await chatRepo.findLatestConversationId(project.id);
    let messages: any[] = [];
    
    if (conversationId) {
        const history = await chatRepo.getHistory(conversationId);
        messages = history.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt.toISOString()
        }));
    }

    return {
        project: {
            id: project.id,
            name: project.name,
            status: project.status
        },
        messages
    };
};
