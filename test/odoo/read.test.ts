import { describe, expect, it, vi } from 'vitest';
import type { OdooClient } from '../../src/odoo/client.js';
import { OdooReader } from '../../src/odoo/read.js';

describe('OdooReader', () => {
  it('maps searchRead to the generic JSON-2 client', async () => {
    const call = vi.fn().mockResolvedValue([{ id: 7, name: 'Ada' }]);
    const reader = new OdooReader({ call } as unknown as OdooClient);
    await expect(reader.searchRead('res.partner', { domain: [['name', '=', 'Ada']], fields: ['name'], limit: 5 })).resolves.toEqual([{ id: 7, name: 'Ada' }]);
    expect(call).toHaveBeenCalledWith('res.partner', 'search_read', { domain: [['name', '=', 'Ada']], fields: ['name'], limit: 5 });
  });

  it('requests safe default metadata from fields_get', async () => {
    const call = vi.fn().mockResolvedValue({ name: { type: 'char' } });
    const reader = new OdooReader({ call } as unknown as OdooClient);
    await reader.fieldsGet('res.partner');
    expect(call).toHaveBeenCalledWith('res.partner', 'fields_get', { attributes: ['string', 'type', 'required', 'readonly', 'relation'] });
  });
});
