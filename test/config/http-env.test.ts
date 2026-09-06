import { describe, expect, it } from 'vitest';
import { loadOdooConfig } from '../../src/config/env.js';

describe('HTTP transport configuration', () => {
  it('requires a bearer token for HTTP by default', () => {
    expect(() => loadOdooConfig({
      ODOO_URL: 'https://odoo.example.com', ODOO_API_KEY: 'secret', MCP_TRANSPORT: 'http',
    })).toThrow();
  });

  it('parses explicit stateless HTTP settings', () => {
    const config = loadOdooConfig({
      ODOO_URL: 'https://odoo.example.com', ODOO_API_KEY: 'secret', MCP_TRANSPORT: 'http',
      MCP_HTTP_HOST: '0.0.0.0', MCP_HTTP_PORT: '8080', MCP_HTTP_ALLOWED_HOSTS: 'mcp.example.com, localhost',
      MCP_HTTP_BEARER_TOKEN: '0123456789abcdef0123456789abcdef',
    });
    expect(config).toEqual(expect.objectContaining({
      transport: 'http', httpHost: '0.0.0.0', httpPort: 8080, httpAllowedHosts: ['mcp.example.com', 'localhost'],
      httpAuth: 'bearer', httpBearerToken: '0123456789abcdef0123456789abcdef',
    }));
  });
});
