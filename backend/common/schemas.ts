/**
 * Shared Common API Envelopes and Schemas
 * Generic API envelope types only (no product entity shapes yet).
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

export interface ErrorPayload {
  code: ErrorCode | string;
  message: string;
  details: unknown[];
  correlation_id: string;
}

export interface ErrorResponse {
  error: ErrorPayload;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
