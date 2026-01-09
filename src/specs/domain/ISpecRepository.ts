import type { SpecVersion } from './SpecVersion';

export interface ISpecRepository {
    save(spec: SpecVersion): Promise<void>;
    findLatestByProjectId(projectId: string): Promise<SpecVersion | null>;
    findAllByProjectId(projectId: string): Promise<SpecVersion[]>;
}
