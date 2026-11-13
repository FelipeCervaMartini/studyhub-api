import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from './errors';
import { logger } from './logger';

// Registra método, rota, status e duração de cada requisição.
export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    logger.info('request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
    });
  });
  next();
};

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: { code: 'ROUTE_NOT_FOUND', message: `Rota ${req.method} ${req.path} não existe` },
  });
};

function isBodyParseError(err: unknown): boolean {
  return (
    typeof err === 'object' && err !== null && 'type' in err && err.type === 'entity.parse.failed'
  );
}

// Códigos de erro do PostgreSQL que viram resposta 409 em vez de 500.
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

function pgErrorCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err && typeof err.code === 'string') {
    return err.code;
  }
  return undefined;
}

// Todo erro da API passa por aqui e vira uma resposta HTTP em JSON.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (isBodyParseError(err)) {
    res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Corpo da requisição não é um JSON válido' },
    });
    return;
  }

  // Garantia extra: se duas requisições iguais chegarem juntas, o banco barra a segunda.
  const pgCode = pgErrorCode(err);
  if (pgCode === PG_UNIQUE_VIOLATION) {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'Registro duplicado' } });
    return;
  }
  if (pgCode === PG_FOREIGN_KEY_VIOLATION) {
    res.status(409).json({
      error: { code: 'CONFLICT', message: 'Registro relacionado não existe' },
    });
    return;
  }

  logger.error('unhandled error', { error: err instanceof Error ? err.stack : String(err) });
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' },
  });
};
