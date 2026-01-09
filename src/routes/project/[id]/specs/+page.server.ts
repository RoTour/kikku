import { prisma } from '$lib/server/db';
import { PrismaSpecRepository } from '$specs/infra/SpecRepository/PrismaSpecRepository';
import { redirect } from '@sveltejs/kit';

const specRepo = new PrismaSpecRepository(prisma);

export const load = async ({ params, locals }) => {
    if (!locals.session) throw redirect(303, '/login');

    const user = await prisma.user.findUnique({
        where: { id: locals.user!.id },
        select: { tier: true }
    });

    const specs = await specRepo.findAllByProjectId(params.id);
    return {
        user: user || { tier: 'DISCOVER' }, // Fallback safely
        specs: specs.map(s => ({
            id: s.id,
            projectId: s.projectId,
            content: s.content,
            status: s.status,
            createdAt: s.createdAt.toISOString()
        }))
    };
};
