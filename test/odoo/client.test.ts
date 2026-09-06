import { describe, expect, it, vi } from 'vitest';
import { OdooClient } from '../../src/odoo/client.js';
import { OdooApiError } from '../../src/odoo/errors.js';

const config = { baseUrl: 'https://odoo.example.com', apiKey: 'test-key', database: 'demo', timeoutMs: 1_000 };

describe('OdooClient', () => {
  it('calls the Odoo JSON-2 endpoint with bearer authentication', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify([{ id: 1 }]), { status: 200 }));
    const client = new OdooClient(config, fetchMock);

    await expect(client.call('res.partner', 'search_read', { domain: [] })).resolves.toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledWith('https://odoo.example.com/json/2/res.partner/search_read', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'bearer test-key', 'X-Odoo-Database': 'demo' }),
      body: JSON.stringify({ domain: [] }),
    }));
  });

  it('maps non-success responses to OdooApiError', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 }));
    const client = new OdooClient(config, fetchMock);
    await expect(client.call('res.partner', 'search_read')).rejects.toBeInstanceOf(OdooApiError);
  });
});
