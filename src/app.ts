import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Pool } from 'pg';
import { backlogRouter } from './modules/backlog/backlog.controller';
import { PgBacklogRepository } from './modules/backlog/backlog.repository';
import { BacklogService } from './modules/backlog/backlog.service';
import { healthRouter } from './modules/health/health.controller';
import { materialsRouter } from './modules/materials/materials.controller';
import { PgMaterialRepository } from './modules/materials/materials.repository';
import { MaterialService } from './modules/materials/materials.service';
import { notesRouter } from './modules/notes/notes.controller';
import { PgNoteRepository } from './modules/notes/notes.repository';
import { NoteService } from './modules/notes/notes.service';
import { subjectsRouter } from './modules/subjects/subjects.controller';
import { PgSubjectRepository } from './modules/subjects/subjects.repository';
import { SubjectService } from './modules/subjects/subjects.service';
import { createMetrics } from './shared/metrics';
import { errorHandler, notFoundHandler, requestLogger } from './shared/middleware';

export interface AppOptions {
  // Nos testes eu desligo para não poluir a saída.
  logRequests?: boolean;
}

// Monta a aplicação: cria repositórios e serviços e registra as rotas.
// Não abre porta aqui (isso fica no server.ts), assim os testes usam o app direto com o supertest.
export function createApp(pool: Pool, options: AppOptions = {}): Express {
  const subjectRepository = new PgSubjectRepository(pool);
  const subjectService = new SubjectService(subjectRepository);
  const materialService = new MaterialService(new PgMaterialRepository(pool), subjectRepository);
  const backlogService = new BacklogService(new PgBacklogRepository(pool), subjectRepository);
  const noteService = new NoteService(new PgNoteRepository(pool), subjectRepository);

  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());

  // Métricas para o Prometheus. A rota /metrics fica antes do middleware para não medir a si mesma.
  const metrics = createMetrics();
  app.get('/metrics', metrics.handler);
  app.use(metrics.middleware);

  app.use(express.json({ limit: '100kb' }));
  if (options.logRequests ?? true) app.use(requestLogger);

  app.use(
    '/health',
    healthRouter(async () => {
      await pool.query('SELECT 1');
    }),
  );

  app.use('/api/v1/subjects', subjectsRouter(subjectService));
  app.use('/api/v1/materials', materialsRouter(materialService));
  app.use('/api/v1/backlog', backlogRouter(backlogService));
  app.use('/api/v1/notes', notesRouter(noteService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
