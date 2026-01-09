# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Kikku is a SvelteKit application that generates technical specifications through AI-powered conversations. It follows Domain-Driven Design (DDD) principles with a clear separation between domain logic and infrastructure concerns. The application uses PostgreSQL via Prisma, integrates with AWS SQS for async spec generation, and supports authentication via better-auth.

## Common Commands

### Development
```bash
npm run dev              # Start development server
npm run dev -- --open    # Start dev server and open browser
```

### Building & Preview
```bash
npm run build           # Build for production
npm run preview         # Preview production build
```

### Testing
```bash
npm run test:unit       # Run Vitest unit tests
npm run test:e2e        # Run Playwright E2E tests
npm run test            # Run all tests (unit + e2e)
```

### Code Quality
```bash
npm run lint            # Run Prettier check and ESLint
npm run format          # Format code with Prettier
npm run check           # Type-check with svelte-check
npm run check:watch     # Type-check in watch mode
```

### Database (Prisma)
```bash
npx prisma migrate dev  # Create and apply migration
npx prisma studio       # Open Prisma Studio GUI
npx prisma generate     # Generate Prisma Client
```

### Storybook
```bash
npm run storybook       # Start Storybook dev server (port 6006)
npm run build-storybook # Build Storybook for production
```

### Terraform (AWS Infrastructure)
```bash
# From terraform/ directory
terraform init                          # Initialize Terraform
terraform plan -var-file=envs/dev/main.tf   # Plan changes for dev
terraform apply -var-file=envs/dev/main.tf  # Apply changes for dev

# Or from environment directories
cd terraform/envs/dev
terraform init
terraform plan
terraform apply
```

### Worker (Async Spec Generation)
```bash
bun run src/worker/index.ts  # Run worker locally (requires .env with SQS_QUEUE_URL)
```

## Architecture

### Domain-Driven Design Structure

The codebase follows DDD with domain logic separated from infrastructure. Each bounded context has:
- `domain/` - Pure domain models and repository interfaces
- `infra/` - Infrastructure implementations (Prisma repositories, etc.)

**Bounded Contexts:**
- `src/projects/` - Project management aggregate
- `src/chat/` - Conversation and message handling
- `src/specs/` - Specification version management

**DDD Guidelines:**
Reference the `HowTo-DDD/` directory for detailed guidance on:
- Anti-Corruption Layers (ACL)
- Aggregate design rules
- Entity vs Value Object modeling
- Repository patterns (collection vs persistence-oriented)
- Domain events and pub/sub
- Dependency injection patterns

### Key Architectural Patterns

**Domain Models:**
- Use static factory methods: `Project.create()` for new instances
- Use `rehydrate()` for loading from persistence
- Domain models are pure TypeScript classes without framework dependencies

**Repository Pattern:**
- Interfaces defined in `domain/IXRepository.ts`
- Prisma implementations in `infra/XRepository/PrismaXRepository.ts`
- Repositories work with domain models, not Prisma types directly

**Async Processing:**
- SvelteKit API routes enqueue jobs to AWS SQS
- Worker (`src/worker/index.ts`) polls SQS and processes spec generation
- Specs transition through states: PENDING → GENERATING → COMPLETED/FAILED

### SvelteKit Configuration

**Path Aliases** (svelte.config.js):
- `$lib` - Standard SvelteKit lib directory
- `$projects` - src/projects
- `$chat` - src/chat
- `$specs` - src/specs

**MDsveX** is enabled for markdown processing in Svelte components.

**Adapter:** Uses `@sveltejs/adapter-node` for Node.js deployment.

### Database

**PostgreSQL** via Prisma with pg adapter. Connection pooling is configured in `src/lib/server/db.ts`.

**Schema Structure:**
- Auth models: User, Session, Account, Verification (better-auth)
- Domain models: Project, Conversation, Message, SpecVersion
- Status enums: SpecStatus (PENDING, GENERATING, COMPLETED, FAILED)

### AWS Infrastructure (Terraform)

Infrastructure is defined in `terraform/` with environment-specific configs in `envs/dev/` and `envs/prod/`.

**Resources:**
- SQS queue: `kikku-spec-generation-{env}` for async job processing
- SQS DLQ: Dead letter queue after 3 retries
- Lambda IAM role: For future worker deployment (resource TBD)

**Environment Variables:**
- `aws_region` - Defaults to eu-west-3
- `environment` - dev or prod

### Environment Configuration

Required environment variables (see `.env.example`):

**Database:**
- `DATABASE_URL` - PostgreSQL connection string

**LLM (OpenRouter):**
- `OPENROUTER_API_KEY` - Required for spec generation
- `LLM_DISCUSSION_MODEL_PROD/DEV` - Models for chat (default: gemini-flash-1.5)
- `LLM_SPEC_MODEL_PROD/DEV` - Models for specs (default: gemini-pro-1.5)
- `MOCK_LLM` - Set to "true" to use mock responses (testing)

**Auth:**
- `AUTH_SECRET` - Generate with: `openssl rand -base64 32`

**AWS (Worker):**
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `SQS_QUEUE_URL` - From Terraform outputs

## Development Workflow

1. **Local Development:** Run `npm run dev` with PostgreSQL running (via docker-compose.yml)
2. **Database Changes:** Create migrations with `npx prisma migrate dev`
3. **Testing:** Write domain tests alongside models (e.g., `Project.test.ts`)
4. **Infrastructure Changes:** Update Terraform files and apply per environment
5. **Worker Testing:** Set `MOCK_LLM=true` in .env for local testing without API costs
