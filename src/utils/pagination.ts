import type { PaginationMeta } from "./response.js";

export interface PaginationParams {
  page: number;
  limit: number;
  order: "asc" | "desc";
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
  };
}

export function getOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}
