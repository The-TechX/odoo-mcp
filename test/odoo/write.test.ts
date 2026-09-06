import { describe, expect, it, vi } from 'vitest';
import type { OdooClient } from '../../src/odoo/client.js';
import { OdooWriter } from '../../src/odoo/write.js';

function setup(result: unknown = true) {
  const call = vi.fn().mockResolvedValue(result);
  return { call, writer: new OdooWriter({ call } as unknown as OdooClient) };
}

describe('OdooWriter', () => {
  it('maps create to Odoo create', async () => {
    const { call, writer } = setup(42);
    await expect(writer.create('res.partner', { name: 'Ada' })).resolves.toBe(42);
    expect(call).toHaveBeenCalledWith('res.partner', 'create', { vals_list: { name: 'Ada' } });
  });

  it('maps write to Odoo write with ids', async () => {
    const { call, writer } = setup();
    await writer.write('res.partner', [42], { name: 'Grace' });
    expect(call).toHaveBeenCalledWith('res.partner', 'write', { ids: [42], vals: { name: 'Grace' } });
  });

  it('maps unlink to Odoo unlink with ids', async () => {
    const { call, writer } = setup();
    await writer.unlink('res.partner', [42]);
    expect(call).toHaveBeenCalledWith('res.partner', 'unlink', { ids: [42] });
  });
});
