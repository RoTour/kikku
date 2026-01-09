# Project Configuration & Libraries

This project is a **SvelteKit** application initialized with the following configuration and libraries.

## Core Framework
- **SvelteKit**: The specific framework used for building the application.
- **Adapter**: `@sveltejs/adapter-node` (Targeting Node.js environment).
- **Language**: TypeScript.

## Architecture & Data
- **Database**: PostgreSQL (via Docker).
- **ORM**: **Prisma**.
- **Validation**: **Zod**.
- **State Management**: Svelte 5 Runes.

## Authentication
- **Library**: **Better Auth**.
- **Providers**: Google, Email/Password.

## Styling
- **TailwindCSS v4**: Utility-first CSS framework.
- **Plugins**:
  - `@tailwindcss/typography`: For beautiful typographic defaults.
  - `@tailwindcss/forms`: For better default form styles.

## Testing
- **Vitest**: For unit and component testing.
- **Playwright**: For End-to-End (E2E) testing.

## Documentation & Components
- **Storybook**: For UI component development and documentation.
- **mdsvex**: For using Markdown in Svelte components.

## Quality & Tooling
- **Prettier**: Code formatting.
- **ESLint**: Linting.
