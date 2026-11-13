import { z } from 'zod';
import { ValidationError } from './errors';

export const uuidSchema = z.uuid();

// Valida `data` com o schema informado ou lança ValidationError (HTTP 400).
export function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(
      result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }
  return result.data;
}

export function parseId(value: unknown): string {
  return parse(uuidSchema, value);
}
