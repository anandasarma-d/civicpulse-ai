import express, { Router } from 'express';
import { correlationIdMiddleware } from './api/middleware/correlationId';
import { requestLogger } from './api/middleware/logging';
import { errorHandler, notFoundHandler } from './api/middleware/errorHandler';

const app = express();

// 1. Correlation ID middleware (runs first for all requests)
app.use(correlationIdMiddleware);

// 2. Structured request logging middleware (one JSON line per request)
app.use(requestLogger);

// 3. Body parsing
app.use(express.json());

/**
 * Health check endpoint (root path, unversioned)
 * Always returns HTTP 200 {"status":"ok"}
 */
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Authentication middleware placeholder (will attach here in later stages)
// e.g. v1Router.use(authMiddleware);

/**
 * API v1 Router
 * Base path: /api/v1
 * Currently empty - ready for domain routes in subsequent stages
 */
const v1Router = Router();
app.use('/api/v1', v1Router);

/**
 * 404 handler for API routes
 * Any unmatched route starting with /api returns 404 in standard ErrorResponse format
 */
app.use('/api', notFoundHandler);

/**
 * Centralized error-handling middleware (registered last)
 */
app.use(errorHandler);

export default app;
