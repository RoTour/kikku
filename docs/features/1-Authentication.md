# Feature 1: User Authentication

## Summary
Secure user authentication using **Better Auth**.

## Technical Stack
- **Library**: `better-auth`
- **Providers**:
    - Email/Password
    - Google OAuth
- **Database Adapter**: Prisma (via `better-auth` Prisma adapter).
- **Session Management**: Handled by `better-auth` (Stateless JWT or Database Sessions).

## Domain Rules
- **Identity**: Users are identified by email.
- **Protection**: Middleware (or SvelteKit Hooks) protects `/app` routes.
- **Redirects**: Unauthenticated -> Login; Authenticated -> Dashboard.

## Ports & Adapters Strategy
- **Driver Port**: `AuthService` (managed by `better-auth` client).
- **Driver Adapter**: `src/lib/auth-client.ts` (Better Auth Client).
- **Driven Port**: `AuthRepository` (managed by `better-auth` server).
- **Driven Adapter**: PostgreSQL via Prisma.

## Implementation Details
1.  **Setup**: Install `better-auth` and `@prisma/client`.
2.  **Schema**: Add `better-auth` required models to `schema.prisma` (User, Session, Account, Verification).
3.  **Hooks**: Implement `handle` hook in `src/hooks.server.ts` to attach session to `locals`.
4.  **UI**: Create `/login` and `/signup` pages using client-side `signIn` methods.
