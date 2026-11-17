import { Router } from 'express';

// Health checks usados pelo Docker e pelo pipeline.
// /health diz se a API está no ar; /health/ready diz se o banco também está respondendo.
export function healthRouter(checkDatabase: () => Promise<void>): Router {
  const router = Router();

  // O pipeline grava o commit na imagem (APP_VERSION). Assim dá para conferir qual versão está no ar.
  const version = process.env.APP_VERSION ?? 'dev';

  router.get('/', (_req, res) => {
    res.json({ status: 'ok', version, uptimeSeconds: Math.round(process.uptime()) });
  });

  router.get('/ready', async (_req, res) => {
    try {
      await checkDatabase();
      res.json({ status: 'ready', database: 'up' });
    } catch {
      res.status(503).json({ status: 'unavailable', database: 'down' });
    }
  });

  return router;
}
