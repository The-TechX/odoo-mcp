import { z } from 'zod';

export const modelSchema = z.string().min(1).describe('Technical Odoo model name, for example res.partner');
export const jsonValueSchema: z.ZodType<unknown> = z.lazy(() => z.union([
  z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValueSchema), z.record(jsonValueSchema),
]));
export const valuesSchema = z.record(jsonValueSchema).refine((values) => Object.keys(values).length > 0, 'values must not be empty');
export const idsSchema = z.array(z.number().int().positive()).min(1).max(1000);
