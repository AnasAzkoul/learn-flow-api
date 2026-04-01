# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Development**: `npm run dev` - runs the server with hot reload (tsx watch)
- **Build**: `npm run build` - compiles TypeScript to `dist/`
- **Production**: `npm run start` - runs compiled code from `dist/`
- **DB Up**: `npm run db:up` - start PostgreSQL via Docker
- **DB Down**: `npm run db:down` - stop PostgreSQL and remove volumes
- **DB Generate**: `npm run db:generate:migration` - generate Drizzle migration
- **DB Migrate**: `npm run db:migrate` - apply migrations
- **DB Studio**: `npm run db:studio` - open Drizzle Studio UI

Server runs on http://localhost:3000

## Architecture

Hono HTTP server with TypeScript, following **Handler → Service → Repository** layered architecture.

### Layered Architecture

- **Handlers** (`src/routes/`): Parse request, call service, format response. No business logic or DB access.
- **Services** (`src/services/`): Business logic, validation, orchestration. Throw `AppError` subclasses. No HTTP concepts.
- **Repositories** (`src/repositories/`): Data access only. Return domain objects. No business logic.

### Key Components

**Error Handling** (`src/errors/`, `src/middleware/error-handler.ts`):
- `AppError` base class with subclasses: `NotFoundError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`, `RateLimitError`, `ExternalServiceError`
- Domain errors: `ServiceError`, `TriageError`, `OutlineError` extend `AppError`
- Global error handler catches all errors and returns standardized envelope: `{ success, error: { code, message, details? } }`
- Anthropic SDK errors are caught in the service layer and re-thrown as `AppError` subclasses

**Response Format** (`src/utils/response.ts`):
- All endpoints return envelope format: `{ success: true, data, meta? }` for success
- Helpers: `success()`, `created()`, `noContent()`
- Pagination metadata included via `meta` field on list endpoints

**Validation** (`src/validators/`):
- `validate()` wrapper around `@hono/zod-validator` with custom error hook
- One validator file per resource, shared schemas for common patterns
- `drizzle-zod` derives course validators from Drizzle table definitions

**Database** (`src/schemas/`, `src/repositories/`, `drizzle.config.ts`):
- Drizzle ORM with PostgreSQL (`pg` driver)
- Schema in `src/schemas/auth.schema.ts` and `src/schemas/courses.schema.ts`
- Course repository handles atomic transactions (course + modules + lessons)
- Docker Compose for local PostgreSQL
- DB connection configured in `src/db/index.ts`

**Authentication** (`src/utils/auth.ts`, `src/middleware/auth.middleware.ts`):
- BetterAuth with email/password auth and OpenAPI plugin
- Auth middleware throws `UnauthorizedError` on missing session
- Applied to all course routes and outline generation
- Auth routes mounted at `/api/auth/*`
- Trusted frontend origin: `http://localhost:5173`

**API Routes** (`src/routes/`):
- `/api/auth/*` — BetterAuth handler
- `/api/v1/courses` — Full CRUD (GET list with pagination, GET by ID, PATCH, DELETE), all authenticated with ownership checks
- `/api/v1/generations/triage` — AI-powered course topic evaluation
- `/api/v1/generations/outline` — AI-powered course outline generation with SSE streaming, saves to DB
- CORS enabled for `http://localhost:5173`

**AI Services** (`src/services/triage/`, `src/services/outline/`):
- Anthropic Claude SDK with structured JSON output via Zod schemas
- Services wrap Anthropic API errors as `AppError` subclasses

### TypeScript Configuration

- `es2024` target with NodeNext module resolution
- `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `isolatedModules` enabled
- Hono JSX support configured (`jsxImportSource: "hono/jsx"`)
- Strict mode enabled

### Environment Variables

**Required:**
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — PostgreSQL credentials
- `DATABASE_URL` — Full PostgreSQL connection string
- `BETTER_AUTH_SECRET` — Auth session secret
- `BETTER_AUTH_URL` — Auth callback URL (http://localhost:3000)

**Required (AI):**
- `ANTHROPIC_API_KEY` — API key for the Anthropic Claude SDK (`@anthropic-ai/sdk`), used for AI-powered course generation
