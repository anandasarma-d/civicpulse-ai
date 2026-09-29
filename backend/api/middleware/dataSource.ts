import { Request, Response, NextFunction } from 'express';
import { getDataSource } from '../../common/dataSource';

export const DATA_SOURCE_HEADER = 'X-CivicPulse-Data-Source';

/**
 * Additive Doc 14 §22 disclosure: which persistence path served this response.
 * Header always; body field on non-error JSON objects.
 */
export function dataSourceMiddleware(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    const source = getDataSource();
    res.setHeader(DATA_SOURCE_HEADER, source);
    if (body && typeof body === 'object' && !Array.isArray(body) && !('error' in (body as object))) {
      (body as Record<string, unknown>).data_source = source;
    }
    return originalJson(body);
  }) as typeof res.json;
  next();
}

export default dataSourceMiddleware;
