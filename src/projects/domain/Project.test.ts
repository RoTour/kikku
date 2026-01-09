import { describe, expect, it } from 'vitest';
import { Project } from './Project';

describe('Project Domain Entity', () => {
    it('should create a new project with default values', () => {
        const ownerId = 'user-123';
        const project = Project.create('My App', ownerId, 'A cool app');

        expect(project.id).toBeDefined();
        expect(project.name).toBe('My App');
        expect(project.ownerId).toBe(ownerId);
        expect(project.description).toBe('A cool app');
        expect(project.status).toBe('DRAFT');
        expect(project.createdAt).toBeInstanceOf(Date);
        expect(project.updatedAt).toBeInstanceOf(Date);
    });

    it('should rehydrate a project from existing data', () => {
        const id = 'proj-123';
        const date = new Date('2023-01-01');
        const project = Project.rehydrate(
            id,
            'Old App',
            'user-999',
            'COMPLETED',
            date,
            date,
            'desc'
        );

        expect(project.id).toBe(id);
        expect(project.name).toBe('Old App');
        expect(project.status).toBe('COMPLETED');
        expect(project.createdAt).toEqual(date);
    });
});
