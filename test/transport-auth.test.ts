import type { AddressInfo } from 'node:net';
import { OAuthError, OAuthErrorCode, type AuthMetadataOptions, type BearerAuthOptions } from '@modelcontextprotocol/server';
import { afterEach, describe, expect, it } from 'vitest';
import { loadOdooConfig } from '../src/config/env.js';
import type { AuthProvider } from '../src/transport/auth.js';
import { createHttpApp } from '../src/transport/http.js';

const servers: Array<ReturnType<ReturnType<typeof createHttpApp>['listen']>> = [];
const resource = 'https://mcp.example.com/mcp';
const issuer = 'https://auth.example.com/realms/demo';

const fakeOAuthProvider: AuthProvider = {
  getBearerAuthOptions(): BearerAuthOptions {
    return {
      requiredScopes: ['mcp_access'], resourceMetadataUrl: 'https://mcp.example.com/.well-known/oauth-protected-resource/mcp',
      verifier: { async verifyAccessToken(token) {
        if (token !== 'valid-token' && token !== 'no-scope') throw new OAuthError(OAuthErrorCode.InvalidToken, 'Invalid access token');
        return { token, clientId: 'test-client', scopes: token === 'no-scope' ? [] : ['mcp_access'], expiresAt: Math.floor(Date.now() / 1000) + 60 };
      } },
    };
  },
  async getAuthMetadataOptions(): Promise<AuthMetadataOptions> {
    return { oauthMetadata: { issuer, authorization_endpoint: `${issuer}/auth`, token_endpoint: `${issuer}/token`, response_types_supported: ['code'] }, resourceServerUrl: new URL(resource), scopesSupported: ['mcp_access'] };
  },
};

afterEach(async () => Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())))));

async function start(auth: 'oauth' | 'none' = 'oauth') {
  const config = loadOdooConfig({ ODOO_URL: 'https://odoo.example.com', ODOO_API_KEY: 'secret', MCP_TRANSPORT: 'http', MCP_AUTH_MODE: auth, MCP_AUTH_ISSUER: auth === 'oauth' ? issuer : undefined, MCP_AUTH_RESOURCE: auth === 'oauth' ? resource : undefined, MCP_AUTH_REQUIRED_SCOPES: 'mcp_access' });
  const app = createHttpApp(config, fakeOAuthProvider);
  const server = app.listen(0, '127.0.0.1'); servers.push(server);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

describe('HTTP OAuth authentication', () => {
  it('rejects missing credentials with resource metadata discovery', async () => {
    const base = await start(); const response = await fetch(`${base}/mcp`);
    expect(response.status).toBe(401); expect(response.headers.get('www-authenticate')).toContain('resource_metadata=');
  });
  it('rejects an invalid access token', async () => {
    const base = await start(); expect((await fetch(`${base}/mcp`, { headers: { Authorization: 'Bearer invalid' } })).status).toBe(401);
  });
  it('rejects a valid token without required scope', async () => {
    const base = await start(); expect((await fetch(`${base}/mcp`, { headers: { Authorization: 'Bearer no-scope' } })).status).toBe(403);
  });
  it('accepts a verified scoped token before method routing', async () => {
    const base = await start(); expect((await fetch(`${base}/mcp`, { headers: { Authorization: 'Bearer valid-token' } })).status).toBe(405);
  });
  it('publishes protected resource metadata without authentication', async () => {
    const base = await start(); const response = await fetch(`${base}/.well-known/oauth-protected-resource/mcp`);
    expect(response.status).toBe(200); expect(await response.json()).toEqual(expect.objectContaining({ resource, authorization_servers: [issuer], scopes_supported: ['mcp_access'] }));
  });
  it('supports explicit no-auth mode', async () => {
    const base = await start('none'); expect((await fetch(`${base}/mcp`)).status).toBe(405);
  });
});
