import type { Pool } from 'pg';
import { migrations as defaultMigrations, type Migration } from './migrations';

// Número qualquer usado como "cadeado" no banco, para duas instâncias não migrarem ao mesmo tempo.
const MIGRATION_LOCK_KEY = 4_815_162_342;

// Aplica as migrações que ainda não rodaram e devolve os ids aplicados.
// Cada uma roda numa transação: se der erro no meio, o banco volta ao estado anterior.
export async function runMigrations(
  pool: Pool,
  migrations: Migration[] = defaultMigrations,
): Promise<string[]> {
  const client = await pool.connect();
  const applied: string[] = [];

  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id         TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const done = await client.query<{ id: string }>('SELECT id FROM schema_migrations');
    const alreadyApplied = new Set(done.rows.map((row) => row.id));

    for (const migration of migrations) {
      if (alreadyApplied.has(migration.id)) continue;

      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [migration.id]);
        await client.query('COMMIT');
        applied.push(migration.id);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client
      .query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY])
      .catch(() => undefined);
    client.release();
  }

  return applied;
}
