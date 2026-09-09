import { describe, expect, it } from 'vitest';
import { loadOdooConfig } from '../../src/config/env.js';

describe('HTTP transport configuration', () => {
  it('requires OAuth issuer and resource for HTTP by default', () => {
    expect(() => loadOdooConfig({
      ODOO_URL: 'https://odoo.example.com', ODOO_API_KEY: 'secret', MCP_TRANSPORT: 'http',
    })).toThrow();
  });

  it('parses OAuth HTTP settings', () => {
    const config = loadOdooConfig({
      ODOO_URL: 'https://odoo.example.com', ODOO_API_KEY: 'secret', MCP_TRANSPORT: 'http',
      MCP_HTTP_HOST: '0.0.0.0', MCP_HTTP_PORT: '8080', MCP_HTTP_ALLOWED_HOSTS: 'mcp.example.com, localhost',
      MCP_AUTH_ISSUER: 'https://auth.example.com/realms/demo', MCP_AUTH_RESOURCE: 'https://mcp.example.com/mcp',
      MCP_AUTH_REQUIRED_SCOPES: 'mcp_access profile',
    });
    expect(config).toEqual(expect.objectContaining({
      transport: 'http', httpHost: '0.0.0.0', httpPort: 8080, httpAllowedHosts: ['mcp.example.com', 'localhost'],
      httpAuth: 'oauth', authIssuer: 'https://auth.example.com/realms/demo', authResource: 'https://mcp.example.com/mcp',
      authRequiredScopes: ['mcp_access', 'profile'],
    }));
  });

  it('supports explicit no-auth mode without OAuth settings', () => {
    const config = loadOdooConfig({ ODOO_URL: 'https://odoo.example.com', ODOO_API_KEY: 'secret', MCP_TRANSPORT: 'http', MCP_AUTH_MODE: 'none' });
    expect(config.httpAuth).toBe('none');
  });

  it('rejects the removed static bearer mode', () => {
    expect(() => loadOdooConfig({ ODOO_URL: 'https://odoo.example.com', ODOO_API_KEY: 'secret', MCP_TRANSPORT: 'http', MCP_AUTH_MODE: 'bearer' })).toThrow();
  });
});
