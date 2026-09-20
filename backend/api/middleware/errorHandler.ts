import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ErrorCode, ErrorResponse } from '../../common/schemas';

/**
 * Maps HTTP status codes to standardized error codes per specification:
 * 400 VALIDATION_ERROR, 401 UNAUTHORIZED, 403 FORBIDDEN, 404 NOT_FOUND,
 * 409 CONFLICT, 429 RATE_LIMITED, 500 INTERNAL_ERROR, 503 SERVICE_UNAVAILABLE.
 */
export function getErrorCodeForStatus(status: number): ErrorCode {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'RATE_LIMITED';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    case 500:
    default:
      return 'INTERNAL_ERROR';
  }
}

/**
 * Returns safe, human-readable default messages.
 */
export function getDefaultErrorMessage(code: ErrorCode): string {
  switch (code) {
    case 'VALIDATION_ERROR':
      return 'The request payload or parameters failed validation.';
    case 'UNAUTHORIZED':
      return 'Authentication credentials are required to access this resource.';
    case 'FORBIDDEN':
      return 'You do not have permission to access this resource.';
    case 'NOT_FOUND':
      return 'The requested resource was not found.';
    case 'CONFLICT':
      return 'A conflict occurred while processing the request.';
    case 'RATE_LIMITED':
      return 'Too many requests. Please slow down and try again later.';
    case 'SERVICE_UNAVAILABLE':
      return 'Service temporarily unavailable. Please try again shortly.';
    case 'INTERNAL_ERROR':
    default:
      return 'An unexpected internal error occurred.';
  }
}

/**
 * Application error class carrying status, code, safe message, and details.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details: unknown[];

  constructor(statusCode: number, message?: string, code?: ErrorCode, details: unknown[] = []) {
    const determinedCode = code || getErrorCodeForStatus(statusCode);
    const determinedMessage = message || getDefaultErrorMessage(determinedCode);
    super(determinedMessage);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = determinedCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Express error-handling middleware registered last.
 * Guarantees standard ErrorResponse shape, echoes correlation_id, and hides stack traces.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next): void => {
  const correlationId =
    req.correlationId || (res.getHeader('X-Correlation-ID') as string) || 'unknown';

  // Ensure correlation header is reflected on the response
  if (!res.getHeader('X-Correlation-ID')) {
    res.setHeader('X-Correlation-ID', correlationId);
  }

  let statusCode = 500;
  let code: ErrorCode = 'INTERNAL_ERROR';
  let message = 'An unexpected internal error occurred.';
  let details: unknown[] = [];

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (typeof err.status === 'number' || typeof err.statusCode === 'number') {
    statusCode = err.status || err.statusCode;
    code = getErrorCodeForStatus(statusCode);
    message = err.message || getDefaultErrorMessage(code);
    details = Array.isArray(err.details) ? err.details : [];
  } else if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    // Malformed JSON body
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Malformed JSON payload in request.';
  }

  const responseBody: ErrorResponse = {
    error: {
      code,
      message,
      details,
      correlation_id: correlationId,
    },
  };

  res.status(statusCode).json(responseBody);
};

/**
 * 404 handler for unmatched routes.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  const safePath = (req.originalUrl || req.path || '').split('?')[0];
  next(new AppError(404, `Route ${req.method} ${safePath} not found`, 'NOT_FOUND'));
}

export default errorHandler;
