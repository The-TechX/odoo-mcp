import { describe, expect, it } from 'vitest';
import { loadOdooConfig } from '../../src/config/env.js';

describe('loadOdooConfig', () => {
  it('normalizes the URL and applies safe defaults', () => {
    expect(loadOdooConfig({ ODOO_URL: 'https://odoo.example.com/', ODOO_API_KEY: 'secret' })).toEqual({
      baseUrl: 'https://odoo.example.com', apiKey: 'secret', database: undefined, timeoutMs: 10_000,
      mode: 'read-only', allowModels: [], denyModels: [],
      transport: 'stdio', httpHost: '127.0.0.1', httpPort: 3000, httpAllowedHosts: [],
      httpAuth: 'oauth', authIssuer: undefined, authResource: undefined, authRequiredScopes: [],
    });
  });

  it('treats empty optional Compose variables as unset', () => {
    expect(loadOdooConfig({
      ODOO_URL: 'https://odoo.example.com', ODOO_API_KEY: 'secret', ODOO_DATABASE: '',
      ODOO_MCP_ALLOW_MODELS: '', ODOO_MCP_DENY_MODELS: '',
    })).toEqual(expect.objectContaining({ database: undefined, allowModels: [], denyModels: [] }));
  });
});
