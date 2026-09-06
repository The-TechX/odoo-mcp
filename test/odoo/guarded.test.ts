import { describe, expect, it, vi } from 'vitest';
import { AccessPolicy } from '../../src/config/policy.js';
import { GuardedOdooReader, GuardedOdooWriter } from '../../src/odoo/guarded.js';
import type { OdooReader } from '../../src/odoo/read.js';
import type { OdooWriter } from '../../src/odoo/write.js';

describe('guarded Odoo services', () => {
  it('does not call the reader when a model is denied', async () => {
    const searchRead = vi.fn();
    const guarded = new GuardedOdooReader({ searchRead } as unknown as OdooReader, new AccessPolicy({ mode: 'read-only', allowModels: [], denyModels: ['res.users'] }));
    expect(() => guarded.searchRead('res.users')).toThrow();
    expect(searchRead).not.toHaveBeenCalled();
  });

  it('does not call the writer when writes are disabled', () => {
    const create = vi.fn();
    const guarded = new GuardedOdooWriter({ create } as unknown as OdooWriter, new AccessPolicy({ mode: 'read-only', allowModels: [], denyModels: [] }));
    expect(() => guarded.create('res.partner', { name: 'Ada' })).toThrow();
    expect(create).not.toHaveBeenCalled();
  });
});
