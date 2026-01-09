# Feature 2: Project Management

## Summary
Management of App Specifications (Projects).

## Technical Stack
- **ORM**: Prisma.
- **Validation**: Zod.
- **State**: Svelte 5 Runes ($state, $derived).

## Domain Modeling
### Entity: Project
- `id`: UUID
- `name`: String
- `userId`: UUID (FK -> User)
- `status`: Enum (DRAFT, COMPLETED, ARCHIVED)
- `createdAt`: DateTime
- `updatedAt`: DateTime

## Ports & Adapters Strategy
- **Driver Port**: `ProjectService` (actions/loaders).
- **Driver Adapter**: SvelteKit Actions (`schema` validated via Zod).
- **Driven Port**: `ProjectRepository`.
- **Driven Adapter**: `src/lib/server/db/project.ts` (Prisma calls).

## User Acceptance Criteria
1.  **Dashboard**: List projects (`SELECT * FROM Project WHERE userId = ?`).
2.  **Create**: Form validation (Zod) -> `INSERT INTO Project`.
3.  **Actions**: Delete/Edit project metadata.
