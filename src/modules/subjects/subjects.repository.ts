import type { Pool } from 'pg';
import { buildUpdateSet } from '../../shared/sql';
import type { CreateSubjectInput, Subject, UpdateSubjectInput } from './subjects.schemas';

// O serviço só conhece esta interface, não o PostgreSQL. Isso deixa testar o serviço com mocks.
export interface SubjectRepository {
  list(): Promise<Subject[]>;
  findById(id: string): Promise<Subject | null>;
  findByName(name: string): Promise<Subject | null>;
  create(data: CreateSubjectInput): Promise<Subject>;
  update(id: string, data: UpdateSubjectInput): Promise<Subject | null>;
  delete(id: string): Promise<boolean>;
}

const COLUMNS = `id, name, description, created_at AS "createdAt", updated_at AS "updatedAt"`;

export class PgSubjectRepository implements SubjectRepository {
  constructor(private readonly pool: Pool) {}

  async list(): Promise<Subject[]> {
    const result = await this.pool.query<Subject>(`SELECT ${COLUMNS} FROM subjects ORDER BY name`);
    return result.rows;
  }

  async findById(id: string): Promise<Subject | null> {
    const result = await this.pool.query<Subject>(
      `SELECT ${COLUMNS} FROM subjects WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findByName(name: string): Promise<Subject | null> {
    const result = await this.pool.query<Subject>(
      `SELECT ${COLUMNS} FROM subjects WHERE lower(name) = lower($1)`,
      [name],
    );
    return result.rows[0] ?? null;
  }

  async create(data: CreateSubjectInput): Promise<Subject> {
    const result = await this.pool.query<Subject>(
      `INSERT INTO subjects (name, description) VALUES ($1, $2) RETURNING ${COLUMNS}`,
      [data.name, data.description ?? null],
    );
    return result.rows[0]!;
  }

  async update(id: string, data: UpdateSubjectInput): Promise<Subject | null> {
    const { assignments, values } = buildUpdateSet(data, {
      name: 'name',
      description: 'description',
    });
    assignments.push('updated_at = now()');
    values.push(id);

    const result = await this.pool.query<Subject>(
      `UPDATE subjects SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING ${COLUMNS}`,
      values,
    );
    return result.rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM subjects WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
