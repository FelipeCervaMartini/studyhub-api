import { z } from 'zod';

export interface Note {
  id: string;
  subjectId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export const createNoteSchema = z.strictObject({
  subjectId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(20000),
});

export const updateNoteSchema = createNoteSchema
  .omit({ subjectId: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

export const listNotesQuerySchema = z.object({
  subjectId: z.uuid().optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type NoteFilter = z.infer<typeof listNotesQuerySchema>;
