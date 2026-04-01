# API Versioning & Pagination

## API Versioning

Use URL path versioning — it's the most explicit and easiest to understand:

```
/api/v1/users
/api/v2/users
```

### Setup in Hono

```typescript
// index.ts
import { Hono } from 'hono'
import v1Routes from './routes/v1'
import v2Routes from './routes/v2'

const app = new Hono()

app.route('/api/v1', v1Routes)
app.route('/api/v2', v2Routes)

export default app
```

```typescript
// routes/v1/index.ts
import { Hono } from 'hono'
import users from './users'
import posts from './posts'

const v1 = new Hono()

v1.route('/users', users)
v1.route('/posts', posts)

export default v1
```

### Versioning Rules

1. **Start with v1** — Always version from day one, even if you think you'll never have v2.
2. **Only bump major versions for breaking changes** — Adding a new optional field to a response is not a breaking change. Removing a field or changing its type is.
3. **Support at most 2 versions simultaneously** — When v3 ships, deprecate v1.
4. **Deprecation headers** — When an old version is being sunset, add a `Deprecation` header:

```typescript
// middleware for deprecated routes
export const deprecated = (sunsetDate: string) => async (c: Context, next: Next) => {
  c.header('Deprecation', 'true')
  c.header('Sunset', sunsetDate)
  c.header('Link', '</api/v2/docs>; rel="successor-version"')
  await next()
}

// Usage
v1.use('*', deprecated('2025-12-31'))
```

## Pagination

Always paginate list endpoints. Never return unbounded arrays.

### Offset-Based Pagination

Best for: simple cases, admin panels, when users need to jump to specific pages.

```typescript
// utils/pagination.ts
import { sql } from 'drizzle-orm'
import type { QueryParams } from '../types'

interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}

export const applyPagination = async <T>(
  baseQuery: any,
  params: QueryParams,
  table: any
): Promise<PaginatedResult<T>> => {
  const { page = 1, limit = 20 } = params
  const offset = (page - 1) * limit

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(table)

  const total = Number(count)

  // Get paginated data
  const data = await baseQuery.limit(limit).offset(offset)

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  }
}
```

Response example:

```json
{
  "success": true,
  "data": [
    { "id": "1", "name": "Alice" },
    { "id": "2", "name": "Bob" }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 47,
      "totalPages": 3,
      "hasMore": true
    }
  }
}
```

### Cursor-Based Pagination

Best for: infinite scroll, real-time feeds, large datasets where offset gets expensive.

```typescript
// utils/pagination.ts (cursor variant)
import { gt, lt, desc, asc } from 'drizzle-orm'

interface CursorPaginatedResult<T> {
  data: T[]
  pagination: {
    limit: number
    nextCursor: string | null
    prevCursor: string | null
    hasMore: boolean
  }
}

export const applyCursorPagination = async <T extends { id: string }>(
  baseQuery: any,
  params: { cursor?: string; limit?: number; direction?: 'forward' | 'backward' },
  table: any,
  orderColumn: any
): Promise<CursorPaginatedResult<T>> => {
  const { cursor, limit = 20, direction = 'forward' } = params

  let query = baseQuery

  if (cursor) {
    query = direction === 'forward'
      ? query.where(gt(orderColumn, cursor))
      : query.where(lt(orderColumn, cursor))
  }

  query = query
    .orderBy(direction === 'forward' ? asc(orderColumn) : desc(orderColumn))
    .limit(limit + 1) // fetch one extra to determine hasMore

  const results: T[] = await query
  const hasMore = results.length > limit
  const data = hasMore ? results.slice(0, limit) : results

  return {
    data,
    pagination: {
      limit,
      nextCursor: hasMore ? data[data.length - 1].id : null,
      prevCursor: cursor || null,
      hasMore,
    },
  }
}
```

### Choosing Between Offset and Cursor

| Factor | Offset | Cursor |
|---|---|---|
| Jump to page 5 | Yes | No |
| Consistent with live inserts/deletes | No (items shift) | Yes |
| Performance on large datasets | Degrades (OFFSET scans) | Constant |
| Implementation complexity | Simple | Moderate |
| Good for | Admin tables, search results | Feeds, infinite scroll, mobile |

**Default to offset pagination** unless you have a specific reason to use cursor-based.

## Sorting & Filtering

### Sorting

Accept sort params via query string, map them to Drizzle columns, and whitelist allowed fields:

```typescript
// utils/sorting.ts
import { asc, desc } from 'drizzle-orm'

const ALLOWED_SORT_FIELDS: Record<string, any> = {
  createdAt: users.createdAt,
  name: users.name,
  email: users.email,
}

export const applySorting = (
  query: any,
  sort?: string,
  order: 'asc' | 'desc' = 'desc'
) => {
  const column = sort && ALLOWED_SORT_FIELDS[sort]

  if (!column) {
    // Default sort: newest first
    return query.orderBy(desc(users.createdAt))
  }

  return query.orderBy(order === 'asc' ? asc(column) : desc(column))
}
```

### Filtering

Use query parameters for filtering. Never expose raw SQL or Drizzle operators to the client:

```typescript
// URL: GET /users?role=admin&search=alice&createdAfter=2024-01-01

// validators/commonValidators.ts
export const userFilterSchema = z.object({
  role: z.enum(['user', 'admin']).optional(),
  search: z.string().optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
})

// repositories/userRepository.ts
import { and, eq, ilike, gte, lte } from 'drizzle-orm'

export const findAll = async (filters: UserFilters, pagination: QueryParams) => {
  const conditions = []

  if (filters.role) conditions.push(eq(users.role, filters.role))
  if (filters.search) conditions.push(ilike(users.name, `%${filters.search}%`))
  if (filters.createdAfter) conditions.push(gte(users.createdAt, filters.createdAfter))
  if (filters.createdBefore) conditions.push(lte(users.createdAt, filters.createdBefore))

  const query = db.select().from(users).where(and(...conditions))

  return applyPagination(query, pagination, users)
}
```

## Key Principles

1. **Always paginate** — Every list endpoint returns paginated results. Default limit of 20, max limit of 100.
2. **Include pagination metadata** — The client needs `total`, `hasMore`, and page/cursor info to build UI controls.
3. **Whitelist sort fields** — Never let the client sort by arbitrary columns. Map allowed field names to Drizzle columns explicitly.
4. **Sanitize search input** — When using `ilike` for search, the input is already validated by Zod, but be aware of wildcard characters (`%`, `_`) in user input if your database interprets them.
5. **Version from day one** — Even a small personal project benefits from `/api/v1/`. It's trivial to add upfront and painful to add later.
