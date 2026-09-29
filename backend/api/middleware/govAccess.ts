import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

function providedGovKey(req: Request): string {
  const header = req.get('x-gov-access-key');
  if (header && header.trim()) return header.trim();
  const query = req.query.gov_access_key;
  if (typeof query === 'string' && query.trim()) return query.trim();
  return '';
}

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Shared-secret gate for government (G-flow) routes only.
 * Local/test: if GOV_DEMO_ACCESS_KEY is unset, the gate is skipped.
 * Production: missing secret fails closed.
 */
export function govAccessGate(req: Request, _res: Response, next: NextFunction): void {
  const expected = (process.env.GOV_DEMO_ACCESS_KEY || '').trim();
  if (!expected) {
    if (process.env.NODE_ENV === 'production') {
      next(new AppError(503, 'Government access key is not configured'));
      return;
    }
    next();
    return;
  }

  const provided = providedGovKey(req);
  if (!provided || !secretsMatch(provided, expected)) {
    next(
      new AppError(401, 'A valid X-Gov-Access-Key is required to access government routes', 'UNAUTHORIZED', [
        { field: 'X-Gov-Access-Key', issue: 'Missing or invalid' },
      ])
    );
    return;
  }

  next();
}

export default govAccessGate;
