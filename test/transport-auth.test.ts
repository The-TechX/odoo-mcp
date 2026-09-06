import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { loadOdooConfig } from '../src/config/env.js';
import { createHttpApp } from '../src/transport/http.js';

const token = '0123456789abcdef0123456789abcdef';
const servers: Array<ReturnType<ReturnType<typeof createHttpApp>['listen']>> = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  })));
});

async function start(auth: 'bearer' | 'none' = 'bearer') {
  const config = loadOdooConfig({
    ODOO_URL: 'https://odoo.example.com', ODOO_API_KEY: 'secret', MCP_TRANSPORT: 'http',
    MCP_HTTP_AUTH: auth, MCP_HTTP_BEARER_TOKEN: auth === 'bearer' ? token : undefined,
  });
  const app = createHttpApp(config);
  const server = app.listen(0, '127.0.0.1');
  servers.push(server);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}/mcp`;
}

describe('HTTP bearer authentication', () => {
  it('rejects missing credentials with 401 and WWW-Authenticate', async () => {
    const url = await start();
    const response = await fetch(url);
    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toContain('Bearer');
  });

  it('rejects an invalid bearer token', async () => {
    const url = await start();
    const response = await fetch(url, { headers: { Authorization: `Bearer ${'x'.repeat(32)}` } });
    expect(response.status).toBe(401);
  });

  it('accepts the configured token before method routing', async () => {
    const url = await start();
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    expect(response.status).toBe(405);
  });

  it('supports explicit auth opt-out for trusted networks', async () => {
    const url = await start('none');
    const response = await fetch(url);
    expect(response.status).toBe(405);
  });
});
