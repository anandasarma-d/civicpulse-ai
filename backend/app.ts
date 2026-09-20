import express from 'express';

const app = express();

app.use(express.json());

/**
 * Exactly one route implemented for RICE-01 bootstrap:
 * GET /health returning 200 with JSON {"status":"ok"}.
 */
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default app;
