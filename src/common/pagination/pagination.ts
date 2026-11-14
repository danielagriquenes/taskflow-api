/**
 * Offset-based pagination primitives shared by list endpoints.
 *
 * Pages are 1-based. Limits are enforced by the query DTOs; these helpers
 * assume already-validated input.
 */

/** Page returned when the client does not send `page`. */
export const DEFAULT_PAGE = 1;
/** Page size returned when the client does not send `limit`. */
export const DEFAULT_PAGE_SIZE = 10;
/** Largest page size a client may request, to protect the database and response size. */
export const MAX_PAGE_SIZE = 100;
/** Defensive upper bound so `(page - 1) * limit` always stays a safe 32-bit OFFSET. */
export const MAX_PAGE = 1_000_000;

/** Metadata sent next to every paginated `data` array. */
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

/** Envelope returned by paginated endpoints: `{ data, meta }`. */
export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Converts a 1-based page into the number of rows to skip (SQL OFFSET).
 * @example toSkip(3, 10) // 20
 */
export function toSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Builds the metadata for one page.
 * @param total number of records matching the filters (not only this page).
 * @example buildPaginationMeta(25, 2, 10) // { total: 25, page: 2, limit: 10, totalPages: 3 }
 */
export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  return { total, page, limit, totalPages: Math.ceil(total / limit) };
}
