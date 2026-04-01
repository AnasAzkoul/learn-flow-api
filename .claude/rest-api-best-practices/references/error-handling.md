# Error Handling & HTTP Status Codes

## Custom Error Classes

Define a base `AppError` class and extend it for specific error types. This lets the global error handler map errors to status codes automatically.

```typescript
// errors/index.ts

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly isOperational: boolean

  constructor(message: string, statusCode: number, code: string) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true // distinguishes expected errors from bugs
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with id '${id}' was not found`
      : `${resource} was not found`
    super(message, 404, 'NOT_FOUND')
  }
}

export class ValidationError extends AppError {
  public readonly details: unknown

  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR')
    this.details = details
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT')
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN')
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED')
  }
}
```

## Global Error Handler Middleware

One single error handler catches everything. Individual route handlers should NOT have try/catch blocks — errors bubble up to this middleware.

```typescript
// middleware/errorHandler.ts
import type { Context } from 'hono'
import { AppError } from '../errors'
import { ZodError } from 'zod'

export const errorHandler = (err: Error, c: Context) => {
  // Known operational errors
  if (err instanceof AppError) {
    return c.json(
      {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          ...(err instanceof ValidationError && err.details && { details: err.details }),
        },
      },
      err.statusCode as any
    )
  }

  // Zod validation errors (from middleware)
  if (err instanceof ZodError) {
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      },
      400
    )
  }

  // Unexpected errors — log and return generic 500
  console.error('Unhandled error:', err)
  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    },
    500
  )
}
```

Register it on the Hono app:

```typescript
// index.ts
import { Hono } from 'hono'
import { errorHandler } from './middleware/errorHandler'

const app = new Hono()

app.onError(errorHandler)
```

## HTTP Status Code Reference

Use these exact status codes — no improvising:

### Success (2xx)

| Code | When to use | Example |
|---|---|---|
| `200 OK` | Successful GET, PATCH, PUT | Returning a user, updating a profile |
| `201 Created` | Successful POST that creates a resource | Creating a new user |
| `204 No Content` | Successful DELETE, or action with no response body | Deleting a user |

### Client Errors (4xx)

| Code | When to use | Example |
|---|---|---|
| `400 Bad Request` | Invalid input, validation failure | Missing required field, wrong data type |
| `401 Unauthorized` | No auth token, or token is invalid/expired | Missing `Authorization` header |
| `403 Forbidden` | Authenticated but lacks permission | Regular user trying to access admin route |
| `404 Not Found` | Resource doesn't exist | `GET /users/999` when user 999 doesn't exist |
| `409 Conflict` | Action conflicts with current state | Creating user with email that already exists |
| `422 Unprocessable Entity` | Syntactically valid but semantically wrong | Date range where end is before start |
| `429 Too Many Requests` | Rate limit exceeded | Too many API calls in time window |

### Server Errors (5xx)

| Code | When to use | Example |
|---|---|---|
| `500 Internal Server Error` | Unexpected bug, unhandled exception | Database connection dropped mid-query |
| `503 Service Unavailable` | Server is temporarily down | During deployment or maintenance |

### Rules

- Never return `200` with an error message in the body — use proper status codes
- Never return `500` for client mistakes — that's always a 4xx
- `404` is for "this specific resource doesn't exist", not "this route doesn't exist" (Hono handles unknown routes automatically)
- Use `401` when the user is not authenticated, `403` when they are authenticated but not authorized

## Error Throwing Pattern

Errors are thrown in the **service** layer, never in handlers or repositories:

```typescript
// CORRECT — service throws, handler doesn't catch
// services/postService.ts
export const getPost = async (id: string) => {
  const post = await postRepo.findById(id)
  if (!post) throw new NotFoundError('Post', id)
  return post
}

// routes/posts.ts — no try/catch needed
posts.get('/:id', async (c) => {
  const post = await postService.getPost(c.req.param('id'))
  return success(c, post)
})
```

```typescript
// WRONG — don't catch and re-format in handlers
posts.get('/:id', async (c) => {
  try {
    const post = await postService.getPost(c.req.param('id'))
    return c.json({ data: post })
  } catch (err) {
    return c.json({ error: err.message }, 404)  // DON'T DO THIS
  }
})
```

The global error handler takes care of formatting. Keeping handlers try/catch-free makes them clean and consistent.
