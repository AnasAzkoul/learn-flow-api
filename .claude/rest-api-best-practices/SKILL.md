---
name: rest-api-best-practices
description: >
  Best practices for designing, building, and reviewing RESTful APIs with Hono, TypeScript, and Drizzle ORM.
  Use this skill whenever the user is building a new REST API, adding endpoints, creating route handlers,
  writing services or repositories, designing request/response schemas, or asking for an API code review.
  Also trigger when the user mentions API design, endpoint naming, HTTP status codes, REST conventions,
  request validation, pagination, versioning, error handling in an API context, or any backend work
  involving Hono routes and Drizzle ORM. Even if the user just says "build me an API for X" or
  "add a CRUD endpoint", this skill applies.
---

# REST API Best Practices — Hono + TypeScript + Drizzle ORM

This skill enforces a strict, opinionated set of conventions for building RESTful APIs.
Every endpoint, file, and pattern should follow these rules unless the user explicitly asks to deviate.

## Project Structure

Always use the Handler → Service → Repository layered architecture with a separate Drizzle schema layer.

```
src/
├── index.ts                    # Hono app setup, global middleware, route mounting
├── db/
│   ├── index.ts                # Drizzle client instance & connection
│   └── schema/
│       ├── index.ts            # Re-exports all schemas
│       ├── users.ts            # Table definition: users
│       └── posts.ts            # Table definition: posts
├── routes/
│   ├── index.ts                # Mounts all route groups
│   ├── users.ts                # Hono route handlers for /users
│   └── posts.ts                # Hono route handlers for /posts
├── services/
│   ├── userService.ts          # Business logic for users
│   └── postService.ts          # Business logic for posts
├── repositories/
│   ├── userRepository.ts       # Drizzle queries for users
│   └── postRepository.ts       # Drizzle queries for posts
├── middleware/
│   ├── auth.ts                 # Authentication middleware (integrates with Better Auth)
│   └── errorHandler.ts         # Global error handling middleware
├── validators/
│   ├── userValidators.ts       # Zod schemas for user endpoints
│   └── postValidators.ts       # Zod schemas for post endpoints
├── errors/
│   └── index.ts                # Custom error classes (AppError, NotFoundError, etc.)
├── types/
│   └── index.ts                # Shared TypeScript types & interfaces
└── utils/
    ├── pagination.ts           # Pagination helpers
    └── response.ts             # Standardized response helpers
```

### Layer Responsibilities

Each layer has ONE job. Never mix responsibilities.

**Routes (Handlers)** — HTTP concerns only.
- Parse request params, query, body
- Call the service layer
- Return the response with correct status code
- Never contain business logic or direct database calls

**Services** — Business logic only.
- Orchestrate operations, enforce business rules
- Call one or more repositories
- Throw custom errors when rules are violated
- Never import Hono types (`Context`, `Request`) or Drizzle directly

**Repositories** — Data access only.
- Execute Drizzle queries (select, insert, update, delete)
- Return raw data — no business logic, no HTTP concepts
- One repository per database table/entity

**Drizzle Schema** — Table definitions only.
- Define table columns, types, relations
- No query logic, no business rules

### Naming Conventions

Follow these strictly:

| Item | Convention | Example |
|---|---|---|
| Files | camelCase | `userService.ts`, `postRepository.ts` |
| Route files | plural noun, camelCase | `users.ts`, `blogPosts.ts` |
| Route paths | kebab-case, plural nouns | `/api/v1/users`, `/api/v1/blog-posts` |
| Handler functions | verb + noun | `getUser`, `createPost`, `deleteComment` |
| Service functions | verb + noun | `getUserById`, `createNewPost` |
| Repository functions | data operation verb | `findById`, `findAll`, `insertOne`, `updateById`, `removeById` |
| Validator schemas | noun + action + "Schema" | `createUserSchema`, `updatePostSchema` |
| Drizzle tables | plural, camelCase variable, snake_case SQL | `export const users = pgTable('users', {...})` |
| Error classes | PascalCase + "Error" | `NotFoundError`, `ValidationError` |
| Middleware | descriptive camelCase | `requireAuth`, `validateBody` |
| Environment variables | SCREAMING_SNAKE_CASE | `DATABASE_URL`, `JWT_SECRET` |

### URL Design Rules

1. Use plural nouns for resources: `/users`, `/posts`, `/comments`
2. Use kebab-case for multi-word resources: `/blog-posts`, `/order-items`
3. Nest related resources max 2 levels deep: `/users/:userId/posts` (not `/users/:userId/posts/:postId/comments/:commentId/likes`)
4. Use query parameters for filtering, sorting, pagination: `/users?role=admin&sort=createdAt&order=desc`
5. Never use verbs in URLs — let HTTP methods convey the action:
   - `GET /users` — list users (not `/getUsers` or `/listUsers`)
   - `POST /users` — create a user (not `/createUser`)
   - `GET /users/:id` — get one user
   - `PATCH /users/:id` — partial update (not `/updateUser`)
   - `DELETE /users/:id` — delete a user

## Route Handler Pattern

Every route handler should follow this exact structure:

```typescript
// routes/users.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import * as userService from '../services/userService'
import { requireAuth } from '../middleware/auth'
import { createUserSchema, updateUserSchema } from '../validators/userValidators'
import { querySchema } from '../validators/commonValidators'
import { success, created, noContent } from '../utils/response'

const users = new Hono()

// GET /users
users.get('/', zValidator('query', querySchema), async (c) => {
  const query = c.req.valid('query')
  const result = await userService.getUsers(query)
  return success(c, result)
})

// GET /users/:id
users.get('/:id', async (c) => {
  const id = c.req.param('id')
  const user = await userService.getUserById(id)
  return success(c, user)
})

// POST /users
users.post('/', zValidator('json', createUserSchema), async (c) => {
  const data = c.req.valid('json')
  const user = await userService.createUser(data)
  return created(c, user)
})

// PATCH /users/:id
users.patch('/:id', requireAuth, zValidator('json', updateUserSchema), async (c) => {
  const id = c.req.param('id')
  const data = c.req.valid('json')
  const user = await userService.updateUser(id, data)
  return success(c, user)
})

// DELETE /users/:id
users.delete('/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  await userService.deleteUser(id)
  return noContent(c)
})

export default users
```

## Service Pattern

Services contain all business logic. They throw errors — they never return HTTP responses.

```typescript
// services/userService.ts
import * as userRepo from '../repositories/userRepository'
import { NotFoundError, ConflictError } from '../errors'
import type { CreateUserInput, UpdateUserInput, QueryParams } from '../types'

export const getUsers = async (query: QueryParams) => {
  return await userRepo.findAll(query)
}

export const getUserById = async (id: string) => {
  const user = await userRepo.findById(id)
  if (!user) throw new NotFoundError('User', id)
  return user
}

export const createUser = async (data: CreateUserInput) => {
  const existing = await userRepo.findByEmail(data.email)
  if (existing) throw new ConflictError(`Email ${data.email} is already in use`)
  return await userRepo.insertOne(data)
}

export const updateUser = async (id: string, data: UpdateUserInput) => {
  await getUserById(id) // throws NotFoundError if missing
  return await userRepo.updateById(id, data)
}

export const deleteUser = async (id: string) => {
  await getUserById(id)
  await userRepo.removeById(id)
}
```

## Repository Pattern

Repositories are thin wrappers around Drizzle queries. No business logic.

```typescript
// repositories/userRepository.ts
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { CreateUserInput, UpdateUserInput, QueryParams } from '../types'
import { applyPagination } from '../utils/pagination'

export const findAll = async (query: QueryParams) => {
  const baseQuery = db.select().from(users)
  return await applyPagination(baseQuery, query, users)
}

export const findById = async (id: string) => {
  const [user] = await db.select().from(users).where(eq(users.id, id))
  return user ?? null
}

export const findByEmail = async (email: string) => {
  const [user] = await db.select().from(users).where(eq(users.email, email))
  return user ?? null
}

export const insertOne = async (data: CreateUserInput) => {
  const [user] = await db.insert(users).values(data).returning()
  return user
}

export const updateById = async (id: string, data: UpdateUserInput) => {
  const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning()
  return user
}

export const removeById = async (id: string) => {
  await db.delete(users).where(eq(users.id, id))
}
```

## Standardized Response Format

Every API response follows a consistent envelope:

```typescript
// utils/response.ts
import type { Context } from 'hono'

interface ApiResponse<T> {
  success: boolean
  data: T
  meta?: Record<string, unknown>
}

interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export const success = <T>(c: Context, data: T, meta?: Record<string, unknown>) => {
  return c.json<ApiResponse<T>>({ success: true, data, ...(meta && { meta }) }, 200)
}

export const created = <T>(c: Context, data: T) => {
  return c.json<ApiResponse<T>>({ success: true, data }, 201)
}

export const noContent = (c: Context) => {
  return c.body(null, 204)
}
```

## Reference Docs

For detailed patterns on specific topics, read the relevant reference file:

- **Error handling & HTTP status codes** → Read `references/error-handling.md`
  When: building error classes, deciding which status code to use, or setting up the global error handler
- **Zod validation** → Read `references/validation.md`
  When: creating request validators using `@hono/zod-validator`, defining Zod schemas, or connecting Zod to Drizzle with `drizzle-zod`
- **Authentication & middleware** → Read `references/auth-middleware.md`
  When: adding auth to routes, creating session middleware, role-based access, or custom middleware. Note: actual auth setup (providers, sessions, config) is handled by Better Auth — defer to the `better-auth` skill for that. This reference covers how middleware integrates with Better Auth sessions.
- **Versioning & pagination** → Read `references/versioning-pagination.md`
  When: adding API versioning, cursor or offset pagination, or sorting/filtering

## Code Review Checklist

When reviewing existing API code, check for these violations in order:

1. **Layer violations** — Is there business logic in route handlers? Database calls in services? HTTP concerns in repositories?
2. **Naming** — Do files, functions, routes, and variables follow the naming table above?
3. **URL design** — Plural nouns? Kebab-case? No verbs? Max 2 nesting levels?
4. **Response format** — Is the envelope consistent? Correct status codes?
5. **Error handling** — Custom error classes? Global error handler catching everything? No `try/catch` in individual route handlers?
6. **Validation** — Zod schemas for every `POST`/`PATCH`/`PUT` body? Query param validation?
7. **Type safety** — Are inputs and outputs properly typed? No `any`?
8. **Missing middleware** — Auth on protected routes? Validation before handler logic?

When generating code, always produce all layers (route, service, repository, validator, schema) for a complete feature — never just a route handler by itself.
