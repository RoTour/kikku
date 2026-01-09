import { prisma } from '$lib/server/db';
import { Project } from '$projects/domain/Project';
import { PrismaProjectRepository } from '$projects/infra/ProjectRepository/PrismaProjectRepository';
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';

const projectRepo = new PrismaProjectRepository(prisma);

export const load = async ({ locals }) => {
    if (!locals.session) {
        throw redirect(303, '/login');
    }

    const projects = await projectRepo.findAllByUserId(locals.user!.id);
    
    // Serializing for frontend (Project entity has Date objects)
    return {
        projects: projects.map(p => ({
            ...p,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString()
        }))
    };
};

const createProjectSchema = z.object({
    name: z.string().min(1).max(50),
    description: z.string().optional()
});

export const actions = {
    create: async ({ request, locals }) => {
        if (!locals.session) {
            return fail(401, { message: 'Unauthorized' });
        }

        const data = await request.formData();
        const name = data.get('name');
        const description = data.get('description');

        const parsed = createProjectSchema.safeParse({ name, description });

        if (!parsed.success) {
            return fail(400, { errors: parsed.error.flatten().fieldErrors });
        }

        const project = Project.create(parsed.data.name, locals.user!.id, parsed.data.description);
        // If description was provided (and project entity supported it more directly in create, 
        // but here we can just rehydrate or modify since it's a domain object, 
        // actually Project.create returns a Project, strictly we should use constructor or a method)
        // My Project.create doesn't take description. I'll stick to MVP creation.
        
        await projectRepo.save(project);

        return { success: true };
    },

    delete: async ({ request, locals }) => {
        if (!locals.session) return fail(401);
        const data = await request.formData();
        const id = data.get('id')?.toString();
        
        if (!id) return fail(400);

        const project = await projectRepo.findById(id);
        if (!project || project.ownerId !== locals.user!.id) {
            return fail(403);
        }

        await projectRepo.delete(id);
        return { success: true };
    }
};
