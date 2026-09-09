import { afterAll, describe, expect, it } from 'vitest';
import { OdooClient } from '../../src/odoo/client.js';
import { OdooReader } from '../../src/odoo/read.js';
import { OdooWriter } from '../../src/odoo/write.js';
import type { OdooConfig } from '../../src/config/env.js';
import type { Logger } from '../../src/observability/logger.js';

const url = process.env.ODOO_TEST_URL;
const apiKey = process.env.ODOO_TEST_API_KEY;
const database = process.env.ODOO_TEST_DATABASE;
const enabled = Boolean(url && apiKey);

const silentLogger: Logger = { info() {}, error() {} };
const createdIds: number[] = [];

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
    transport: 'stdio',
    httpHost: '127.0.0.1',
    httpPort: 3000,
    httpAllowedHosts: [],
    httpAuth: 'none',
    authRequiredScopes: [],
  };
}

if (!enabled) {
  describe.skip('live Odoo 19 JSON-2 integration', () => {
    it('requires ODOO_TEST_URL and ODOO_TEST_API_KEY', () => {});
  });
} else {
  describe('live Odoo 19 JSON-2 integration', () => {
    const client = new OdooClient(config(), fetch, silentLogger);
    const reader = new OdooReader(client);
    const writer = new OdooWriter(client);
    const marker = `odoo-mcp-integration-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  afterAll(async () => {
    if (createdIds.length > 0) {
      await writer.unlink('res.partner', createdIds.splice(0));
    }
  });

  it('reads field metadata from a real model', async () => {
    const fields = await reader.fieldsGet('res.partner', ['string', 'type', 'required']);
    expect(fields.name).toMatchObject({ type: 'char' });
  });

  it('creates, searches, updates, reads, and deletes a temporary partner', async () => {
    const created = await writer.create('res.partner', { name: marker, comment: 'created by odoo-mcp integration test' });
    const id = Array.isArray(created) ? created[0] : created;
    expect(id).toBeTypeOf('number');
    createdIds.push(id);

    const found = await reader.searchRead<{ id: number; name: string }>('res.partner', {
      domain: [['id', '=', id]],
      fields: ['id', 'name'],
      limit: 1,
    });
    expect(found).toEqual([{ id, name: marker }]);

    const updatedName = `${marker}-updated`;
    expect(await writer.write('res.partner', [id], { name: updatedName })).toBe(true);

    const updated = await reader.searchRead<{ id: number; name: string }>('res.partner', {
      domain: [['id', '=', id]],
      fields: ['id', 'name'],
      limit: 1,
    });
    expect(updated).toEqual([{ id, name: updatedName }]);

    expect(await writer.unlink('res.partner', [id])).toBe(true);
    createdIds.splice(createdIds.indexOf(id), 1);

    const removed = await reader.searchRead<{ id: number }>('res.partner', {
      domain: [['id', '=', id]],
      fields: ['id'],
      limit: 1,
    });
    expect(removed).toEqual([]);
  });
  });
}
