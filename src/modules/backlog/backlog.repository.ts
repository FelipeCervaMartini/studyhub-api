import type { Pool } from 'pg';
import { buildUpdateSet } from '../../shared/sql';
import type {
  BacklogFilter,
  BacklogItem,
  BacklogItemChanges,
  BacklogItemToCreate,
} from './backlog.schemas';

export interface BacklogRepository {
  list(filter: BacklogFilter): Promise<BacklogItem[]>;
  findById(id: string): Promise<BacklogItem | null>;
  create(data: BacklogItemToCreate): Promise<BacklogItem>;
  update(id: string, data: BacklogItemChanges): Promise<BacklogItem | null>;
  delete(id: string): Promise<boolean>;
}

const COLUMNS = `id, subject_id AS "subjectId", title, description, status, priority,
  to_char(due_date, 'YYYY-MM-DD') AS "dueDate", completed_at AS "completedAt",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export class PgBacklogRepository implements BacklogRepository {
  constructor(private readonly pool: Pool) {}

  // Lista por prioridade (alta primeiro) e, em seguida, pela data limite mais próxima.
  async list(filter: BacklogFilter): Promise<BacklogItem[]> {
    const result = await this.pool.query<BacklogItem>(
      `SELECT ${COLUMNS} FROM backlog_items
       WHERE ($1::uuid IS NULL OR subject_id = $1)
         AND ($2::text IS NULL OR status = $2)
       ORDER BY
         CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
         due_date ASC NULLS LAST,
         created_at ASC`,
      [filter.subjectId ?? null, filter.status ?? null],
    );
    return result.rows;
  }

  async findById(id: string): Promise<BacklogItem | null> {
    const result = await this.pool.query<BacklogItem>(
      `SELECT ${COLUMNS} FROM backlog_items WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async create(data: BacklogItemToCreate): Promise<BacklogItem> {
    const result = await this.pool.query<BacklogItem>(
      `INSERT INTO backlog_items
         (subject_id, title, description, status, priority, due_date, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${COLUMNS}`,
      [
        data.subjectId,
        data.title,
        data.description ?? null,
        data.status,
        data.priority,
        data.dueDate ?? null,
        data.completedAt,
      ],
    );
    return result.rows[0]!;
  }

  async update(id: string, data: BacklogItemChanges): Promise<BacklogItem | null> {
    const { assignments, values } = buildUpdateSet(data, {
      title: 'title',
      description: 'description',
      status: 'status',
      priority: 'priority',
      dueDate: 'due_date',
      completedAt: 'completed_at',
    });
    assignments.push('updated_at = now()');
    values.push(id);

    const result = await this.pool.query<BacklogItem>(
      `UPDATE backlog_items SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING ${COLUMNS}`,
      values,
    );
    return result.rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM backlog_items WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
