import type { Express } from 'express';
import type { Pool } from 'pg';
import request from 'supertest';
import { createApp } from '../../src/app';
import { runMigrations } from '../../src/db/migrate';
import { createPool } from '../../src/db/pool';

// Os testes de integração usam um PostgreSQL de verdade.
// No pipeline a URL vem da variável DATABASE_URL; sem ela, usa o banco de testes local.
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://studyhub:studyhub@localhost:5432/studyhub_test';

export const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

export interface TestContext {
  app: Express;
  pool: Pool;
}

// Prepara o ambiente de teste: cria as tabelas uma vez e limpa os dados antes de cada teste.
export function setupTestApp(): TestContext {
  const pool = createPool(TEST_DATABASE_URL);
  const context: TestContext = { app: createApp(pool, { logRequests: false }), pool };

  beforeAll(async () => {
    await runMigrations(pool);
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE subjects, materials, backlog_items, notes CASCADE');
  });

  afterAll(async () => {
    await pool.end();
  });

  return context;
}

export async function createSubject(app: Express, name = 'DevOps na Prática'): Promise<string> {
  const response = await request(app).post('/api/v1/subjects').send({ name }).expect(201);
  return response.body.id as string;
}
