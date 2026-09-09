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
  MCP_AUTH_MODE: z.enum(['oauth', 'none']).default('oauth'),
  MCP_AUTH_ISSUER: emptyToUndefined(z.string().url().optional()),
  MCP_AUTH_RESOURCE: emptyToUndefined(z.string().url().optional()),
  MCP_AUTH_REQUIRED_SCOPES: emptyToUndefined(z.string().optional()),
}).superRefine((value, ctx) => {
  if (value.MCP_TRANSPORT === 'http' && value.MCP_AUTH_MODE === 'oauth') {
    if (!value.MCP_AUTH_ISSUER) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['MCP_AUTH_ISSUER'], message: 'Required for OAuth authentication' });
    if (!value.MCP_AUTH_RESOURCE) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['MCP_AUTH_RESOURCE'], message: 'Required for OAuth authentication' });
  }
});

export type OdooConfig = {
  baseUrl: string; apiKey: string; database?: string; timeoutMs: number;
  mode: 'read-only' | 'read-write'; allowModels: string[]; denyModels: string[];
  transport: 'stdio' | 'http'; httpHost: string; httpPort: number; httpAllowedHosts: string[];
  httpAuth: 'oauth' | 'none'; authIssuer?: string; authResource?: string; authRequiredScopes: string[];
};

export function loadOdooConfig(env: NodeJS.ProcessEnv = process.env): OdooConfig {
  const parsed = envSchema.parse(env);
  return {
    baseUrl: parsed.ODOO_URL.replace(/\/+$/, ''), apiKey: parsed.ODOO_API_KEY,
    database: parsed.ODOO_DATABASE, timeoutMs: parsed.ODOO_TIMEOUT_MS, mode: parsed.ODOO_MCP_MODE,
    allowModels: parseList(parsed.ODOO_MCP_ALLOW_MODELS), denyModels: parseList(parsed.ODOO_MCP_DENY_MODELS),
    transport: parsed.MCP_TRANSPORT, httpHost: parsed.MCP_HTTP_HOST, httpPort: parsed.MCP_HTTP_PORT,
    httpAllowedHosts: parseList(parsed.MCP_HTTP_ALLOWED_HOSTS), httpAuth: parsed.MCP_AUTH_MODE,
    authIssuer: parsed.MCP_AUTH_ISSUER, authResource: parsed.MCP_AUTH_RESOURCE,
    authRequiredScopes: parseSpaceOrCommaList(parsed.MCP_AUTH_REQUIRED_SCOPES),
  };
}

function parseList(value?: string): string[] {
  if (!value) return [];
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];
}

function parseSpaceOrCommaList(value?: string): string[] {
  if (!value) return [];
  return [...new Set(value.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean))];
}
