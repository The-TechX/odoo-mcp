import { z } from 'zod';

const envSchema = z.object({
  ODOO_URL: z.string().url(),
  ODOO_API_KEY: z.string().min(1),
  ODOO_DATABASE: z.string().min(1).optional(),
  ODOO_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
});

export type OdooConfig = {
  baseUrl: string;
  apiKey: string;
  database?: string;
  timeoutMs: number;
};

export function loadOdooConfig(env: NodeJS.ProcessEnv = process.env): OdooConfig {
  const parsed = envSchema.parse(env);
  return {
    baseUrl: parsed.ODOO_URL.replace(/\/+$/, ''),
    apiKey: parsed.ODOO_API_KEY,
    database: parsed.ODOO_DATABASE,
    timeoutMs: parsed.ODOO_TIMEOUT_MS,
  };
}
