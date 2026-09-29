import { Request, Response, NextFunction } from 'express';

/**
 * Structured request logging middleware:
 * Logs exactly one JSON line per request containing:
 * method, path, status_code, latency_ms, correlation_id.
 * Query parameters and request bodies are explicitly excluded to protect privacy.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const latency_ms = Date.now() - startTime;
    // Strip query string to strictly avoid logging free text or citizen data
    const rawPath = req.originalUrl || req.url || req.path || '/';
    const cleanPath = rawPath.split('?')[0];

    const logEntry = {
      method: req.method,
      path: cleanPath,
      status_code: res.statusCode,
      latency_ms,
      correlation_id: req.correlationId || (res.getHeader('X-Correlation-ID') as string) || 'unknown',
      data_source: res.getHeader('X-CivicPulse-Data-Source') || undefined,
    };

    console.log(JSON.stringify(logEntry));
  });

  next();
}

export default requestLogger;
