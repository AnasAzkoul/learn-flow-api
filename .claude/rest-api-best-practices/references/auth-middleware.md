# Authentication & Middleware

## Authentication with Better Auth

Authentication is handled by **Better Auth**. For Better Auth setup, configuration, providers, and session management, refer to the `better-auth` skill or the Better Auth documentation. This reference covers how your route middleware integrates with Better Auth sessions.

## Session Middleware

Better Auth manages sessions. Your middleware's job is to check the session and attach user info to the Hono context:

```typescript
// middleware/auth.ts
import type { Context, Next } from 'hono'
import { auth } from '../lib/auth' // your Better Auth instance
import { UnauthorizedError, ForbiddenError } from '../errors'

// Require a valid session — rejects unauthenticated requests
export const requireAuth = async (c: Context, next: Next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  })

  if (!session) {
    throw new UnauthorizedError('Authentication required')
  }

  // Attach session and user to context for downstream handlers
  c.set('session', session.session)
  c.set('user', session.user)
  c.set('userId', session.user.id)

  await next()
}

// Optional auth — attaches user if logged in, continues either way
export const optionalAuth = async (c: Context, next: Next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  })

  if (session) {
    c.set('session', session.session)
    c.set('user', session.user)
    c.set('userId', session.user.id)
  }

  await next()
}
```

## Role-Based Access Control (RBAC)

Create a middleware factory that checks roles after authentication:

```typescript
// middleware/auth.ts (continued)

export const requireRole = (...allowedRoles: string[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user')

    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError(
        `This action requires one of these roles: ${allowedRoles.join(', ')}`
      )
    }

    await next()
  }
}
```

Usage in routes:

```typescript
// routes/users.ts

// Public — no middleware
users.get('/', async (c) => { ... })

// Authenticated users only
users.get('/me', requireAuth, async (c) => {
  const user = c.get('user')
  return success(c, user)
})

// Admin only — chain auth + role middleware
users.delete('/:id', requireAuth, requireRole('admin'), async (c) => {
  await userService.deleteUser(c.req.param('id'))
  return noContent(c)
})
```

## Resource Ownership Middleware

For routes where users should only access their own resources:

```typescript
// middleware/auth.ts (continued)

export const requireOwnership = (paramName = 'id') => {
  return async (c: Context, next: Next) => {
    const userId = c.get('userId')
    const resourceOwnerId = c.req.param(paramName)

    if (userId !== resourceOwnerId) {
      const user = c.get('user')
      // Admins bypass ownership checks
      if (user?.role !== 'admin') {
        throw new ForbiddenError('You can only access your own resources')
      }
    }

    await next()
  }
}
```

## Middleware Ordering

Middleware order matters. Apply them in this sequence:

```typescript
// index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { errorHandler } from './middleware/errorHandler'
import userRoutes from './routes/users'

const app = new Hono()

// 1. Error handler (must be first — catches errors from all downstream middleware)
app.onError(errorHandler)

// 2. Global middleware (runs on every request)
app.use('*', logger())             // Request logging
app.use('*', secureHeaders())      // Security headers
app.use('*', cors({                // CORS configuration
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// 3. Mount Better Auth handler (before API routes)
app.on(['POST', 'GET'], '/api/auth/**', (c) => {
  return auth.handler(c.req.raw)
})

// 4. Mount API routes (route-specific middleware like requireAuth is applied inside route files)
app.route('/api/v1/users', userRoutes)

export default app
```

## Writing Custom Middleware

Every custom middleware follows this pattern:

```typescript
import type { Context, Next } from 'hono'

export const myMiddleware = async (c: Context, next: Next) => {
  // 1. Do something BEFORE the handler
  const start = Date.now()

  // 2. Call next() to pass control to the next middleware/handler
  await next()

  // 3. Do something AFTER the handler (optional)
  const duration = Date.now() - start
  c.header('X-Response-Time', `${duration}ms`)
}
```

### Middleware Factory Pattern

When middleware needs configuration, return a function:

```typescript
// middleware/rateLimiter.ts
interface RateLimitOptions {
  max: number        // max requests per window
  windowMs: number   // window size in milliseconds
}

export const rateLimiter = (options: RateLimitOptions) => {
  const { max, windowMs } = options
  const requests = new Map<string, { count: number; resetAt: number }>()

  return async (c: Context, next: Next) => {
    const key = c.req.header('x-forwarded-for') || 'unknown'
    const now = Date.now()
    const record = requests.get(key)

    if (!record || now > record.resetAt) {
      requests.set(key, { count: 1, resetAt: now + windowMs })
    } else if (record.count >= max) {
      throw new RateLimitError()
    } else {
      record.count++
    }

    await next()
  }
}
```

## Key Principles

1. **Auth middleware only does auth** — It verifies the session and attaches user info. It does not check permissions, validate input, or do business logic.
2. **Chain, don't nest** — Use Hono's middleware chaining (`route.get('/', mw1, mw2, handler)`) instead of nesting middleware logic inside each other.
3. **Fail fast** — Auth middleware should throw and stop the chain immediately if the session is missing/invalid. Don't continue to the handler and check there.
4. **Use `c.set()` and `c.get()`** — This is how you pass data from middleware to handlers in Hono. Never use global variables or closures.
5. **Route-level over global** — Apply auth middleware on specific routes that need it, not globally. Public endpoints shouldn't go through auth logic at all.
6. **Let Better Auth handle auth complexity** — Don't reimplement session management, token refresh, or provider logic in your middleware. Better Auth does all of that. Your middleware just reads the session.
