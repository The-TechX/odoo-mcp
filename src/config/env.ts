import { z } from 'zod';

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
  schema,
);

const envSchema = z.object({
  ODOO_URL: z.string().url(),
  ODOO_API_KEY: z.string().min(1),
  ODOO_DATABASE: emptyToUndefined(z.string().min(1).optional()),
  ODOO_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  ODOO_MCP_MODE: z.enum(['read-only', 'read-write']).default('read-only'),
  ODOO_MCP_ALLOW_MODELS: emptyToUndefined(z.string().optional()),
  ODOO_MCP_DENY_MODELS: emptyToUndefined(z.string().optional()),
  MCP_TRANSPORT: z.enum(['stdio', 'http']).default('stdio'),
  MCP_HTTP_HOST: z.string().min(1).default('127.0.0.1'),
  MCP_HTTP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MCP_HTTP_ALLOWED_HOSTS: emptyToUndefined(z.string().optional()),
  MCP_HTTP_AUTH: z.enum(['bearer', 'none']).default('bearer'),
  MCP_HTTP_BEARER_TOKEN: emptyToUndefined(z.string().min(32).optional()),
}).superRefine((value, ctx) => {
  if (value.MCP_TRANSPORT === 'http' && value.MCP_HTTP_AUTH === 'bearer' && !value.MCP_HTTP_BEARER_TOKEN) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['MCP_HTTP_BEARER_TOKEN'], message: 'Required for HTTP bearer authentication' });
  }
});

export type OdooConfig = {
  baseUrl: string;
  apiKey: string;
  database?: string;
  timeoutMs: number;
  mode: 'read-only' | 'read-write';
  allowModels: string[];
  denyModels: string[];
  transport: 'stdio' | 'http';
  httpHost: string;
  httpPort: number;
  httpAllowedHosts: string[];
  httpAuth: 'bearer' | 'none';
  httpBearerToken?: string;
};

export function loadOdooConfig(env: NodeJS.ProcessEnv = process.env): OdooConfig {
  const parsed = envSchema.parse(env);
  return {
    baseUrl: parsed.ODOO_URL.replace(/\/+$/, ''),
    apiKey: parsed.ODOO_API_KEY,
    database: parsed.ODOO_DATABASE,
    timeoutMs: parsed.ODOO_TIMEOUT_MS,
    mode: parsed.ODOO_MCP_MODE,
    allowModels: parseModelList(parsed.ODOO_MCP_ALLOW_MODELS),
    denyModels: parseModelList(parsed.ODOO_MCP_DENY_MODELS),
    transport: parsed.MCP_TRANSPORT,
    httpHost: parsed.MCP_HTTP_HOST,
    httpPort: parsed.MCP_HTTP_PORT,
    httpAllowedHosts: parseModelList(parsed.MCP_HTTP_ALLOWED_HOSTS),
    httpAuth: parsed.MCP_HTTP_AUTH,
    httpBearerToken: parsed.MCP_HTTP_BEARER_TOKEN,
  };
}

function parseModelList(value?: string): string[] {
  if (!value) return [];
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];
}
