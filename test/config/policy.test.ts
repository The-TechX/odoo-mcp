import { describe, expect, it } from 'vitest';
import { AccessPolicy, PolicyDeniedError } from '../../src/config/policy.js';

describe('AccessPolicy', () => {
  it('defaults policy checks to model access for reads', () => {
    const policy = new AccessPolicy({ mode: 'read-only', allowModels: [], denyModels: [] });
    expect(() => policy.assertRead('res.partner')).not.toThrow();
  });

  it('blocks writes in read-only mode', () => {
    const policy = new AccessPolicy({ mode: 'read-only', allowModels: [], denyModels: [] });
    expect(() => policy.assertWrite('res.partner')).toThrow(PolicyDeniedError);
  });

  it('honors allow and deny lists with deny taking precedence', () => {
    const policy = new AccessPolicy({ mode: 'read-write', allowModels: ['res.partner', 'sale.order'], denyModels: ['sale.order'] });
    expect(() => policy.assertRead('res.partner')).not.toThrow();
    expect(() => policy.assertRead('sale.order')).toThrow('denied by policy');
    expect(() => policy.assertRead('account.move')).toThrow('not included in the allow list');
  });
});
