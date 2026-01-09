import type { Project } from './Project';

export interface IProjectRepository {
    save(project: Project): Promise<void>;
    findById(id: string): Promise<Project | null>;
    findAllByUserId(userId: string): Promise<Project[]>;
    delete(id: string): Promise<void>;
}
