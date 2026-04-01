# Validation with Zod

## Validation with @hono/zod-validator

Use `zValidator` from `@hono/zod-validator` — this is the standard Hono way to validate requests with Zod. No custom middleware needed.

```typescript
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
```

`zValidator` takes two arguments: the validation target (`'json'`, `'query'`, `'param'`) and a Zod schema. Apply it inline as route middleware:

```typescript
// Validate JSON body
users.post('/', zValidator('json', createUserSchema), async (c) => {
  const data = c.req.valid('json') // fully typed from the schema
  const user = await userService.createUser(data)
  return created(c, user)
})

// Validate query parameters
users.get('/', zValidator('query', querySchema), async (c) => {
  const query = c.req.valid('query')
  const result = await userService.getUsers(query)
  return success(c, result)
})

// Validate route params
users.get('/:id', zValidator('param', idParamSchema), async (c) => {
  const { id } = c.req.valid('param')
  const user = await userService.getUserById(id)
  return success(c, user)
})
```

### Custom error hook (optional)

By default `zValidator` returns a 400 with Zod's raw error output. To match the standardized error envelope, pass a custom error hook as the third argument:

```typescript
import { zValidator } from '@hono/zod-validator'
import type { ZodSchema } from 'zod'
import { ValidationError } from '../errors'

// Helper that wraps zValidator with consistent error formatting
export const validate = <T>(target: 'json' | 'query' | 'param', schema: ZodSchema<T>) =>
  zValidator(target, schema, (result) => {
    if (!result.success) {
      throw new ValidationError(
        `${target} validation failed`,
        result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      )
    }
  })
```

This is optional — the default `zValidator` behavior is fine for most cases. Only add the custom hook if you need your validation errors to match the same envelope format as the rest of your API errors.

## Validator File Structure

One validator file per resource. Each file exports schemas named `<action><Resource>Schema`:

```typescript
// validators/userValidators.ts
import { z } from 'zod'

// POST /users — all required fields for creation
export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['user', 'admin']).default('user'),
})

// PATCH /users/:id — all fields optional for partial update
export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['user', 'admin']).optional(),
})

// Infer types from schemas to use in services/repositories
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
```

## Common Validators

Reusable schemas for patterns that repeat across resources:

```typescript
// validators/commonValidators.ts
import { z } from 'zod'

// UUID param validation
export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
})

// Standard query params for list endpoints
export const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
})

export type QueryParams = z.infer<typeof querySchema>
```

## Key Principles

1. **Validate at the edge** — Validation happens in middleware, before the handler runs. By the time your handler code executes, data is already validated and typed.

2. **Create schema = strict, Update schema = partial** — POST schemas have all required fields. PATCH schemas make fields optional because partial updates should only include what changed.

3. **Infer types from schemas** — Use `z.infer<typeof schema>` to derive TypeScript types. This is the single source of truth — never manually define a separate interface that mirrors a Zod schema.

4. **Coerce query params** — Query parameters arrive as strings from the URL. Use `z.coerce.number()` to automatically convert `"20"` → `20`.

5. **Meaningful error messages** — Always provide human-readable messages in Zod validators (`.min(8, 'Password must be at least 8 characters')`), not just rely on defaults.

6. **No validation in services** — Services trust that data is already validated. They handle business rules (like "email must be unique"), not structural validation (like "email must be a valid format").

## Connecting Zod to Drizzle

Use `drizzle-zod` to auto-generate Zod schemas from your Drizzle table definitions, then refine them:

```typescript
// validators/userValidators.ts
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { users } from '../db/schema'
import { z } from 'zod'

// Auto-generate base schema from Drizzle table
const baseInsertSchema = createInsertSchema(users)

// Refine with additional validation rules
export const createUserSchema = baseInsertSchema
  .pick({ name: true, email: true, password: true, role: true })
  .extend({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    email: z.string().email('Invalid email address'),
  })

export const updateUserSchema = createUserSchema
  .partial()
  .omit({ password: true })

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
```

This keeps your Drizzle schema as the single source of truth for table structure, while Zod adds the API-specific validation rules on top.
