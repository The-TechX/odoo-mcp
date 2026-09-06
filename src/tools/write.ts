import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { OdooValues } from '../odoo/write.js';

export type WriteService = {
  create(model: string, values: OdooValues): Promise<number | number[]>;
  write(model: string, ids: number[], values: OdooValues): Promise<boolean>;
  unlink(model: string, ids: number[]): Promise<boolean>;
};
import { idsSchema, modelSchema, valuesSchema } from './schemas.js';

export function registerWriteTools(server: McpServer, writer: WriteService): void {
  server.registerTool('odoo_create', {
    description: 'Create a record in an Odoo model using the configured Odoo user permissions.',
    inputSchema: { model: modelSchema, values: valuesSchema },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  }, async ({ model, values }) => result(await writer.create(model, values)));

  server.registerTool('odoo_write', {
    description: 'Update one or more Odoo records using the configured Odoo user permissions.',
    inputSchema: { model: modelSchema, ids: idsSchema, values: valuesSchema },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  }, async ({ model, ids, values }) => result(await writer.write(model, ids, values)));

  server.registerTool('odoo_unlink', {
    description: 'Permanently delete one or more Odoo records using the configured Odoo user permissions.',
    inputSchema: { model: modelSchema, ids: idsSchema },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
  }, async ({ model, ids }) => result(await writer.unlink(model, ids)));
}

function result(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value) }], structuredContent: { result: value } };
}
