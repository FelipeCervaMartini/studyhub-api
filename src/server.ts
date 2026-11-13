import { createApp } from './app';
import { loadEnv } from './config/env';
import { runMigrations } from './db/migrate';
import { createPool } from './db/pool';
import { logger } from './shared/logger';

// Tempo máximo para encerrar conexões em andamento antes de forçar a saída.
const SHUTDOWN_TIMEOUT_MS = 10_000;

async function main(): Promise<void> {
  const env = loadEnv();
  const pool = createPool(env.DATABASE_URL);

  const applied = await runMigrations(pool);
  logger.info('migrations checked', { applied });

  const server = createApp(pool).listen(env.PORT, () => {
    logger.info('server started', { port: env.PORT, env: env.NODE_ENV });
  });

  // O Docker manda SIGTERM ao parar o container: termino as requisições em andamento antes de sair.
  const shutdown = (signal: string): void => {
    logger.info('shutting down', { signal });
    const force = setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS);
    force.unref();
    server.close(() => {
      void pool.end().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error: unknown) => {
  logger.error('failed to start', { error: error instanceof Error ? error.stack : String(error) });
  process.exit(1);
});
