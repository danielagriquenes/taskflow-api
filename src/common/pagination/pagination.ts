export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;
/** Defensive upper bound so `(page - 1) * limit` always stays a safe 32-bit OFFSET. */
export const MAX_PAGE = 1_000_000;

export interface PaginationMeta {
  /** Total number of records matching the filters. */
  total: number;
  /** Current page (1-based). */
  page: number;
  /** Page size used for this response. */
  limit: number;
  /** Total number of pages (0 when there are no records). */
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export function toSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  return { total, page, limit, totalPages: Math.ceil(total / limit) };
}
