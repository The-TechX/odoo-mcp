import { describe, expect, it, vi } from 'vitest';
import { OdooClient } from '../../src/odoo/client.js';
import { OdooApiError } from '../../src/odoo/errors.js';
import type { Logger } from '../../src/observability/logger.js';

const silentLogger: Logger = { info: () => undefined, error: () => undefined };

const config = { baseUrl: 'https://odoo.example.com', apiKey: 'test-key', database: 'demo', timeoutMs: 1_000 };

describe('OdooClient', () => {
  it('calls the Odoo JSON-2 endpoint with bearer authentication', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify([{ id: 1 }]), { status: 200 }));
    const client = new OdooClient(config, fetchMock, silentLogger);

    await expect(client.call('res.partner', 'search_read', { domain: [] })).resolves.toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledWith('https://odoo.example.com/json/2/res.partner/search_read', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'bearer test-key', 'X-Odoo-Database': 'demo' }),
      body: JSON.stringify({ domain: [] }),
    }));
  });

  it('maps non-success responses to OdooApiError', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 }));
    const client = new OdooClient(config, fetchMock, silentLogger);
    await expect(client.call('res.partner', 'search_read')).rejects.toBeInstanceOf(OdooApiError);
  });
});

describe('OdooClient error classification', () => {
  it('classifies transport failures as network errors without leaking credentials', async () => {
    const logs: Array<{ message: string; fields?: Record<string, unknown> }> = [];
    const logger: Logger = {
      info: (message, fields) => logs.push({ message, fields }),
      error: (message, fields) => logs.push({ message, fields }),
    };
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error('socket closed'));
    const client = new OdooClient(config, fetchMock, logger);
    const error = await client.call('res.partner', 'search_read').catch((caught) => caught as OdooApiError);
    expect(error).toBeInstanceOf(OdooApiError);
    expect(error.kind).toBe('network');
    expect(JSON.stringify(logs)).not.toContain('test-key');
    expect(logs.some((entry) => entry.fields?.requestId)).toBe(true);
  });
});
