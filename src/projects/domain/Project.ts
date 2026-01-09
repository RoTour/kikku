export class Project {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly ownerId: string,
        public readonly status: 'DRAFT' | 'COMPLETED' | 'ARCHIVED',
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
        public readonly description: string | null = null
    ) {}

    static create(name: string, ownerId: string, description?: string | null): Project {
        return new Project(
            crypto.randomUUID(),
            name,
            ownerId,
            'DRAFT',
            new Date(),
            new Date(),
            description ?? null
        );
    }

    static rehydrate(
        id: string,
        name: string,
        ownerId: string,
        status: 'DRAFT' | 'COMPLETED' | 'ARCHIVED',
        createdAt: Date,
        updatedAt: Date,
        description: string | null
    ): Project {
        return new Project(id, name, ownerId, status, createdAt, updatedAt, description);
    }
}
