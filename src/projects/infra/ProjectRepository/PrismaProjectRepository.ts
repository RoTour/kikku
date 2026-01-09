import type { IProjectRepository } from '$projects/domain/IProjectRepository';
import { Project } from '$projects/domain/Project';
import type { PrismaClient, Project as PrismaProject } from '@prisma/client';

class ProjectMapper {
    static fromPrismaToDomain(prismaModel: PrismaProject): Project {
        return Project.rehydrate(
            prismaModel.id,
            prismaModel.name,
            prismaModel.userId,
            prismaModel.status as 'DRAFT' | 'COMPLETED' | 'ARCHIVED',
            prismaModel.createdAt,
            prismaModel.updatedAt,
            prismaModel.description
        );
    }

    static fromDomainToPrisma(domainModel: Project): PrismaProject {
        return {
            id: domainModel.id,
            name: domainModel.name,
            userId: domainModel.ownerId,
            status: domainModel.status,
            createdAt: domainModel.createdAt,
            updatedAt: domainModel.updatedAt,
            description: domainModel.description
        };
    }
}

export class PrismaProjectRepository implements IProjectRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async save(project: Project): Promise<void> {
        const data = ProjectMapper.fromDomainToPrisma(project);
        await this.prisma.project.upsert({
            where: { id: project.id },
            create: data,
            update: data
        });
    }

    async findById(id: string): Promise<Project | null> {
        const currentProject = await this.prisma.project.findUnique({
            where: { id }
        });

        if (!currentProject) return null;

        return ProjectMapper.fromPrismaToDomain(currentProject);
    }

    async findAllByUserId(userId: string): Promise<Project[]> {
        const projects = await this.prisma.project.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' }
        });

        return projects.map(ProjectMapper.fromPrismaToDomain);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.project.delete({
            where: { id }
        });
    }
}
