import type { OdooConfig } from './config/env.js';
import { AccessPolicy } from './config/policy.js';
import { OdooClient } from './odoo/client.js';
import { GuardedOdooReader, GuardedOdooWriter } from './odoo/guarded.js';
import { OdooReader } from './odoo/read.js';
import { OdooWriter } from './odoo/write.js';
import { createServer } from './server.js';

export function createOdooMcpServer(config: OdooConfig) {
  const client = new OdooClient(config);
  const policy = new AccessPolicy(config);
  const reader = new GuardedOdooReader(new OdooReader(client), policy);
  const writer = new GuardedOdooWriter(new OdooWriter(client), policy);
  return createServer({ reader, writer });
}
