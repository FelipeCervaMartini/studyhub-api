export interface Migration {
  id: string;
  sql: string;
}

// Migrações do banco, aplicadas em ordem e só uma vez cada.
// Para mudar o banco, adicionar uma nova no final (não editar as que já rodaram).
export const migrations: Migration[] = [
  {
    id: '001_initial_schema',
    sql: `
      CREATE TABLE subjects (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(120) NOT NULL,
        description TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX subjects_name_unique ON subjects (lower(name));

      CREATE TABLE materials (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subject_id  UUID NOT NULL REFERENCES subjects (id) ON DELETE CASCADE,
        title       VARCHAR(200) NOT NULL,
        type        VARCHAR(20) NOT NULL
                    CHECK (type IN ('book', 'article', 'video', 'slides', 'other')),
        url         TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX materials_subject_idx ON materials (subject_id);

      CREATE TABLE backlog_items (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subject_id   UUID NOT NULL REFERENCES subjects (id) ON DELETE CASCADE,
        title        VARCHAR(200) NOT NULL,
        description  TEXT,
        status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'in_progress', 'done')),
        priority     VARCHAR(10) NOT NULL DEFAULT 'medium'
                     CHECK (priority IN ('low', 'medium', 'high')),
        due_date     DATE,
        completed_at TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX backlog_items_subject_idx ON backlog_items (subject_id);
      CREATE INDEX backlog_items_status_idx ON backlog_items (status);

      CREATE TABLE notes (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subject_id  UUID NOT NULL REFERENCES subjects (id) ON DELETE CASCADE,
        title       VARCHAR(200) NOT NULL,
        content     TEXT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX notes_subject_idx ON notes (subject_id);
    `,
  },
];
