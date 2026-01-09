export type SpecStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';

export class SpecVersion {
    constructor(
        public readonly id: string,
        public readonly projectId: string,
        public readonly content: string, // Markdown content
        public readonly status: SpecStatus,
        public readonly createdAt: Date
    ) {}

    static create(projectId: string, content: string = ''): SpecVersion {
        return new SpecVersion(
            crypto.randomUUID(),
            projectId,
            content,
            'PENDING',
            new Date()
        );
    }

    static rehydrate(
        id: string,
        projectId: string,
        content: string,
        status: SpecStatus,
        createdAt: Date
    ): SpecVersion {
        return new SpecVersion(id, projectId, content, status, createdAt);
    }

    markAsCompleted(content: string): SpecVersion {
        return new SpecVersion(
            this.id,
            this.projectId,
            content,
            'COMPLETED',
            this.createdAt
        );
    }

    markAsFailed(): SpecVersion {
         return new SpecVersion(
            this.id,
            this.projectId,
            this.content,
            'FAILED',
            this.createdAt
        );
    }
}
