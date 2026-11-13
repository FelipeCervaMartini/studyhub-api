import type { Pool } from 'pg';
import { buildUpdateSet } from '../../shared/sql';
import type { CreateNoteInput, Note, NoteFilter, UpdateNoteInput } from './notes.schemas';

export interface NoteRepository {
  list(filter: NoteFilter): Promise<Note[]>;
  findById(id: string): Promise<Note | null>;
  create(data: CreateNoteInput): Promise<Note>;
  update(id: string, data: UpdateNoteInput): Promise<Note | null>;
  delete(id: string): Promise<boolean>;
}

const COLUMNS = `id, subject_id AS "subjectId", title, content,
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export class PgNoteRepository implements NoteRepository {
  constructor(private readonly pool: Pool) {}

  async list(filter: NoteFilter): Promise<Note[]> {
    const result = await this.pool.query<Note>(
      `SELECT ${COLUMNS} FROM notes
       WHERE ($1::uuid IS NULL OR subject_id = $1)
       ORDER BY updated_at DESC`,
      [filter.subjectId ?? null],
    );
    return result.rows;
  }

  async findById(id: string): Promise<Note | null> {
    const result = await this.pool.query<Note>(`SELECT ${COLUMNS} FROM notes WHERE id = $1`, [id]);
    return result.rows[0] ?? null;
  }

  async create(data: CreateNoteInput): Promise<Note> {
    const result = await this.pool.query<Note>(
      `INSERT INTO notes (subject_id, title, content) VALUES ($1, $2, $3) RETURNING ${COLUMNS}`,
      [data.subjectId, data.title, data.content],
    );
    return result.rows[0]!;
  }

  async update(id: string, data: UpdateNoteInput): Promise<Note | null> {
    const { assignments, values } = buildUpdateSet(data, { title: 'title', content: 'content' });
    assignments.push('updated_at = now()');
    values.push(id);

    const result = await this.pool.query<Note>(
      `UPDATE notes SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING ${COLUMNS}`,
      values,
    );
    return result.rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM notes WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
