import request from 'supertest';
import { createApp } from '../../src/app';
import { runMigrations } from '../../src/db/migrate';
import { createPool } from '../../src/db/pool';
import { setupTestApp } from './helpers';

const ctx = setupTestApp();

describe('Health checks', () => {
  it('GET /health responde 200 sem depender do banco', async () => {
    const response = await request(ctx.app).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
  });

  it('GET /health/ready responde 200 quando o banco está acessível', async () => {
    const response = await request(ctx.app).get('/health/ready').expect(200);
    expect(response.body).toEqual({ status: 'ready', database: 'up' });
  });

  it('GET /health/ready responde 503 quando o banco está fora do ar', async () => {
    const brokenPool = createPool('postgres://invalido:invalido@127.0.0.1:1/nada');
    const app = createApp(brokenPool, { logRequests: false });

    const response = await request(app).get('/health/ready').expect(503);
    expect(response.body).toEqual({ status: 'unavailable', database: 'down' });

    await brokenPool.end();
  });
});

describe('Aplicação', () => {
  it('responde 404 em JSON para rota inexistente', async () => {
    const response = await request(ctx.app).get('/api/v1/nao-existe').expect(404);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('envia cabeçalhos de segurança e não expõe a tecnologia do servidor', async () => {
    const response = await request(ctx.app).get('/health');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('as migrações são idempotentes', async () => {
    await expect(runMigrations(ctx.pool)).resolves.toEqual([]);
  });

  it('uma migração com erro é desfeita por completo', async () => {
    const broken = [{ id: '999_quebrada', sql: 'CREATE TABLE tmp_rollback (id INT); SELECT 1/0;' }];
    await expect(runMigrations(ctx.pool, broken)).rejects.toThrow();

    const table = await ctx.pool.query("SELECT to_regclass('tmp_rollback') AS name");
    expect(table.rows[0].name).toBeNull();
    const recorded = await ctx.pool.query("SELECT 1 FROM schema_migrations WHERE id = '999_quebrada'");
    expect(recorded.rowCount).toBe(0);
  });
});
