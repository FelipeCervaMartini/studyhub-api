import { z } from 'zod';

export const BACKLOG_STATUSES = ['pending', 'in_progress', 'done'] as const;
export const BACKLOG_PRIORITIES = ['low', 'medium', 'high'] as const;

export type BacklogStatus = (typeof BACKLOG_STATUSES)[number];

export interface BacklogItem {
  id: string;
  subjectId: string;
  title: string;
  description: string | null;
  status: BacklogStatus;
  priority: (typeof BACKLOG_PRIORITIES)[number];
  // Data limite no formato AAAA-MM-DD.
  dueDate: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const createBacklogItemSchema = z.strictObject({
  subjectId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(BACKLOG_STATUSES).default('pending'),
  priority: z.enum(BACKLOG_PRIORITIES).default('medium'),
  dueDate: z.iso.date().nullable().optional(),
});

export const updateBacklogItemSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable(),
    status: z.enum(BACKLOG_STATUSES),
    priority: z.enum(BACKLOG_PRIORITIES),
    dueDate: z.iso.date().nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

export const listBacklogQuerySchema = z.object({
  subjectId: z.uuid().optional(),
  status: z.enum(BACKLOG_STATUSES).optional(),
});

export type CreateBacklogItemInput = z.infer<typeof createBacklogItemSchema>;
export type UpdateBacklogItemInput = z.infer<typeof updateBacklogItemSchema>;
export type BacklogFilter = z.infer<typeof listBacklogQuerySchema>;

// O que vai para o banco: os dados do cliente mais a data de conclusão, que o serviço calcula.
export type BacklogItemToCreate = CreateBacklogItemInput & { completedAt: Date | null };
export type BacklogItemChanges = UpdateBacklogItemInput & { completedAt?: Date | null };
