# Feature 4: Specification Generation

## Summary
Generating and exporting Markdown specifications.

## Technical Stack
- **Template Engine**: Custom interpolation or just LLM prompt.
- **Download**: `jszip` (client-side) or server-side streaming.
- **GitHub**: GitHub API (Octokit).

## Domain Rules
- **Formatting**: Output valid Markdown.

## Ports & Adapters Strategy
- **Driver Port**: `SpecService`.
- **Driven Port**: `SpecRepository` (Prisma - store generated specs).
- **Driven Port**: `ExportService` (Zip/GitHub).

## Implementation Details
1.  **Generation**: Button trigger -> LLM reads full conversation/summary -> Outputs structured JSON/Markdown.
2.  **Versioning**: Store each generation event in `SpecVersion` table.
3.  **Export**:
    - **Zip**: Generate blob on client or stream from server.
    - **GitHub**: OAuth scope `repo` required (handled by Better Auth additional scope?).
