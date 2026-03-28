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

Hono HTTP server with TypeScript.

### Key Components

**Database** (`src/schemas/`, `drizzle.config.ts`, `docker-compose.yml`):
- Drizzle ORM with PostgreSQL (`pg` driver)
- Schema in `src/schemas/auth.schema.ts` — user, session, account, verification tables
- Custom user fields: gender, birthDate, educationalLevel, occupation, learningStyle
- Docker Compose for local PostgreSQL
- DB connection configured in `src/db/index.ts`

**Authentication** (`src/utils/auth.ts`, `src/middleware/auth.middleware.ts`):
- BetterAuth with email/password auth and OpenAPI plugin
- Auth middleware verifies session from request headers (not yet applied to routes)
- Auth routes mounted at `/api/auth/*`
- Trusted frontend origin: `http://localhost:5173`

**API Routes** (`src/routes/`):
- `/api/auth/*` — BetterAuth handler
- `/api/v1/courses` — Course CRUD endpoints (stub)
- `/api/v1/generations/triage` — Course generation triage (stub), accepts subject, knowledge level, depth
- CORS enabled for `http://localhost:5173`

### TypeScript Configuration

- ESNext target with NodeNext module resolution
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
