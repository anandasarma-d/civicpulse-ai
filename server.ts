import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import backendApp from './backend/app';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Mount backend application (health check and API routes)
  app.use(backendApp);

  // Vite middleware for frontend development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CivicPulse AI server running on http://localhost:${PORT}`);
  });
}

startServer();
