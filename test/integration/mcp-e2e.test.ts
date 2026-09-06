import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, describe, expect, it } from 'vitest';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import type { OdooConfig } from '../../src/config/env.js';
import { startHttpServer } from '../../src/transport/http.js';

const url = process.env.ODOO_TEST_URL;
const apiKey = process.env.ODOO_TEST_API_KEY;
const database = process.env.ODOO_TEST_DATABASE;
const enabled = Boolean(url && apiKey);
const bearerToken = 'mcp-e2e-test-token-0123456789abcdef';

function config(): OdooConfig {
  if (!url || !apiKey) throw new Error('ODOO_TEST_URL and ODOO_TEST_API_KEY are required');
  return {
    baseUrl: url.replace(/\/+$/, ''),
    apiKey,
    database: database || undefined,
    timeoutMs: 10_000,
    mode: 'read-write',
    allowModels: [],
    denyModels: [],
    transport: 'http',
    httpHost: '127.0.0.1',
    httpPort: 0,
    httpAllowedHosts: [],
    httpAuth: 'bearer',
    httpBearerToken: bearerToken,
  };
}

if (!enabled) {
  describe.skip('MCP HTTP to Odoo end-to-end integration', () => {
    it('requires ODOO_TEST_URL and ODOO_TEST_API_KEY', () => {});
  });
} else {
  describe('MCP HTTP to Odoo end-to-end integration', () => {
    let server: Server | undefined;
    let client: Client | undefined;
    const createdIds: number[] = [];

    afterAll(async () => {
      if (client && createdIds.length > 0) {
        await client.callTool({ name: 'odoo_unlink', arguments: { model: 'res.partner', ids: createdIds.splice(0) } });
      }
      await client?.close();
      if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
    });

    it('connects with Bearer auth, discovers tools, and performs a full CRUD round trip through MCP', async () => {
      server = await startHttpServer(config());
      const address = server.address() as AddressInfo;
      const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${address.port}/mcp`), {
        authProvider: { token: async () => bearerToken },
      });
      client = new Client(
        { name: 'odoo-mcp-e2e-test', version: '0.1.0' },
        { versionNegotiation: { mode: 'auto' } },
      );
      await client.connect(transport);

      expect(client.getProtocolEra()).toBe('modern');
      const tools = await client.listTools();
      expect(tools.tools.map(tool => tool.name)).toEqual(expect.arrayContaining([
        'odoo_search_read', 'odoo_fields_get', 'odoo_create', 'odoo_write', 'odoo_unlink',
      ]));

      const marker = `odoo-mcp-e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const created = await client.callTool({
        name: 'odoo_create',
        arguments: { model: 'res.partner', values: { name: marker } },
      });
      expect(created.isError).not.toBe(true);
      const createResult = (created.structuredContent as { result: number | number[] }).result;
      const id = Array.isArray(createResult) ? createResult[0] : createResult;
      expect(id).toBeTypeOf('number');
      createdIds.push(id!);

      const read = await client.callTool({
        name: 'odoo_search_read',
        arguments: { model: 'res.partner', domain: [['id', '=', id!]], fields: ['id', 'name'], limit: 1 },
      });
      expect((read.structuredContent as { records: Array<{ id: number; name: string }> }).records)
        .toEqual([{ id: id!, name: marker }]);

      const updatedName = `${marker}-updated`;
      const written = await client.callTool({
        name: 'odoo_write',
        arguments: { model: 'res.partner', ids: [id!], values: { name: updatedName } },
      });
      expect((written.structuredContent as { result: boolean }).result).toBe(true);

      const updated = await client.callTool({
        name: 'odoo_search_read',
        arguments: { model: 'res.partner', domain: [['id', '=', id!]], fields: ['id', 'name'], limit: 1 },
      });
      expect((updated.structuredContent as { records: Array<{ id: number; name: string }> }).records)
        .toEqual([{ id: id!, name: updatedName }]);

      const removed = await client.callTool({ name: 'odoo_unlink', arguments: { model: 'res.partner', ids: [id!] } });
      expect((removed.structuredContent as { result: boolean }).result).toBe(true);
      createdIds.splice(createdIds.indexOf(id!), 1);
    });
  });
}
