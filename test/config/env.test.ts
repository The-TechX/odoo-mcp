import { describe, expect, it } from 'vitest';
import { loadOdooConfig } from '../../src/config/env.js';

describe('loadOdooConfig', () => {
  it('normalizes the URL and applies the default timeout', () => {
    expect(loadOdooConfig({ ODOO_URL: 'https://odoo.example.com/', ODOO_API_KEY: 'secret' })).toEqual({
      baseUrl: 'https://odoo.example.com', apiKey: 'secret', database: undefined, timeoutMs: 10_000,
      mode: 'read-only', allowModels: [], denyModels: [],
    });
  });
});
