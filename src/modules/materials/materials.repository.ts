import type { Pool } from 'pg';
import { buildUpdateSet } from '../../shared/sql';
import type {
  CreateMaterialInput,
  Material,
  MaterialFilter,
  UpdateMaterialInput,
} from './materials.schemas';

export interface MaterialRepository {
  list(filter: MaterialFilter): Promise<Material[]>;
  findById(id: string): Promise<Material | null>;
  create(data: CreateMaterialInput): Promise<Material>;
  update(id: string, data: UpdateMaterialInput): Promise<Material | null>;
  delete(id: string): Promise<boolean>;
}

const COLUMNS = `id, subject_id AS "subjectId", title, type, url,
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export class PgMaterialRepository implements MaterialRepository {
  constructor(private readonly pool: Pool) {}

  async list(filter: MaterialFilter): Promise<Material[]> {
    const result = await this.pool.query<Material>(
      `SELECT ${COLUMNS} FROM materials
       WHERE ($1::uuid IS NULL OR subject_id = $1)
       ORDER BY created_at DESC`,
      [filter.subjectId ?? null],
    );
    return result.rows;
  }

  async findById(id: string): Promise<Material | null> {
    const result = await this.pool.query<Material>(
      `SELECT ${COLUMNS} FROM materials WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async create(data: CreateMaterialInput): Promise<Material> {
    const result = await this.pool.query<Material>(
      `INSERT INTO materials (subject_id, title, type, url)
       VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
      [data.subjectId, data.title, data.type, data.url ?? null],
    );
    return result.rows[0]!;
  }

  async update(id: string, data: UpdateMaterialInput): Promise<Material | null> {
    const { assignments, values } = buildUpdateSet(data, {
      title: 'title',
      type: 'type',
      url: 'url',
    });
    assignments.push('updated_at = now()');
    values.push(id);

    const result = await this.pool.query<Material>(
      `UPDATE materials SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING ${COLUMNS}`,
      values,
    );
    return result.rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM materials WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
