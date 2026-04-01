import type { Context } from "hono";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export function success<T>(c: Context, data: T, meta?: PaginationMeta) {
  if (meta) {
    return c.json({ success: true as const, data, meta }, 200);
  }
  return c.json({ success: true as const, data }, 200);
}

export function created<T>(c: Context, data: T) {
  return c.json({ success: true as const, data }, 201);
}

export function noContent(c: Context) {
  return c.body(null, 204);
}
