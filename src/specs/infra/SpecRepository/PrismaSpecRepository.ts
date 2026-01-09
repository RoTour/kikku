import type { ISpecRepository } from '$specs/domain/ISpecRepository';
import { SpecVersion } from '$specs/domain/SpecVersion';
import type { PrismaClient, SpecVersion as PrismaSpecVersion } from '@prisma/client';

class SpecMapper {
    static fromPrismaToDomain(prismaModel: PrismaSpecVersion): SpecVersion {
        return SpecVersion.rehydrate(
            prismaModel.id,
            prismaModel.projectId,
            prismaModel.content,
            prismaModel.status as any, // Cast prisma enum to domain type
            prismaModel.createdAt
        );
    }

    static fromDomainToPrisma(domainModel: SpecVersion): PrismaSpecVersion {
        return {
            id: domainModel.id,
            projectId: domainModel.projectId,
            content: domainModel.content,
            status: domainModel.status as any, // Cast domain type to prisma enum
            createdAt: domainModel.createdAt
        };
    }
}

export class PrismaSpecRepository implements ISpecRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async save(spec: SpecVersion): Promise<void> {
        const data = SpecMapper.fromDomainToPrisma(spec);
        await this.prisma.specVersion.upsert({
            where: { id: spec.id },
            update: data,
            create: data
        });
    }

    async findLatestByProjectId(projectId: string): Promise<SpecVersion | null> {
        const spec = await this.prisma.specVersion.findFirst({
            where: { projectId },
            orderBy: { createdAt: 'desc' }
        });
        
        if (!spec) return null;
        return SpecMapper.fromPrismaToDomain(spec);
    }

    async findAllByProjectId(projectId: string): Promise<SpecVersion[]> {
        const specs = await this.prisma.specVersion.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' }
        });

        return specs.map(SpecMapper.fromPrismaToDomain);
    }
}
