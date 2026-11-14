import { type TransformFnParams } from 'class-transformer';
import { isISO8601 } from 'class-validator';

/** Trims string input; leaves any other type untouched so type validators can reject it. */
export const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Converts a strict ISO 8601 string (e.g. `2026-12-01` or
 * `2026-12-01T10:00:00Z`) into a `Date`. Anything else is returned unchanged
 * so that `@IsDate()` reports it as invalid instead of silently coercing
 * numbers or locale-specific formats the way `new Date(value)` would.
 */
export const toIsoDate = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' && isISO8601(value, { strict: true, strictSeparator: true })
    ? new Date(value)
    : value;
