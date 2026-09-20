import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Correlation ID middleware:
 * Reads X-Correlation-ID from incoming request headers, or generates a UUID.
 * Attaches correlationId to the request context and sets X-Correlation-ID on response.
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingHeader = req.headers[CORRELATION_ID_HEADER] || req.headers['X-Correlation-ID'];
  
  let correlationId: string;
  if (typeof incomingHeader === 'string' && incomingHeader.trim().length > 0) {
    correlationId = incomingHeader.trim();
  } else if (Array.isArray(incomingHeader) && incomingHeader[0]?.trim().length > 0) {
    correlationId = incomingHeader[0].trim();
  } else {
    correlationId = crypto.randomUUID();
  }

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  next();
}

export default correlationIdMiddleware;
