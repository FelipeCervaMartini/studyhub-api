import { z } from 'zod';

export const MATERIAL_TYPES = ['book', 'article', 'video', 'slides', 'other'] as const;

export interface Material {
  id: string;
  subjectId: string;
  title: string;
  type: (typeof MATERIAL_TYPES)[number];
  url: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const createMaterialSchema = z.strictObject({
  subjectId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  type: z.enum(MATERIAL_TYPES),
  url: z.url().max(2000).nullable().optional(),
});

export const updateMaterialSchema = createMaterialSchema
  .omit({ subjectId: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

export const listMaterialsQuerySchema = z.object({
  subjectId: z.uuid().optional(),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type MaterialFilter = z.infer<typeof listMaterialsQuerySchema>;
