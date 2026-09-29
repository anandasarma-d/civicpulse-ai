import express, { Router } from 'express';
import { correlationIdMiddleware } from './api/middleware/correlationId';
import { requestLogger } from './api/middleware/logging';
import { dataSourceMiddleware } from './api/middleware/dataSource';
import { errorHandler, notFoundHandler } from './api/middleware/errorHandler';

import { requestsRouter } from './api/routes/requests';
import { clustersRouter } from './api/routes/clusters';
import { gapsRouter } from './api/routes/gaps';
import { recommendationsRouter } from './api/routes/recommendations';
import { govAccessGate } from './api/middleware/govAccess';

const app = express();

// 1. Correlation ID middleware (runs first for all requests)
app.use(correlationIdMiddleware);
app.use(dataSourceMiddleware);
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

// Shared-secret gate for government G-flow routes (clusters / gaps / recommendations).
// Citizen C-flow (/requests) stays public.

const v1Router = Router();
v1Router.use('/requests', requestsRouter);
v1Router.use('/clusters', govAccessGate, clustersRouter);
v1Router.use('/gaps', govAccessGate, gapsRouter);
v1Router.use('/recommendations', govAccessGate, recommendationsRouter);
app.use('/api/v1', v1Router);
app.use('/api/clusters', govAccessGate, clustersRouter);
app.use('/api/gaps', govAccessGate, gapsRouter);

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
