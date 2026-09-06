import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { OdooReader } from '../odoo/read.js';

const model = z.string().min(1).describe('Technical Odoo model name, for example res.partner');
const jsonValue: z.ZodType<unknown> = z.lazy(() => z.union([
  z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValue), z.record(jsonValue),
]));

export function registerReadTools(server: McpServer, reader: OdooReader): void {
  server.registerTool('odoo_search_read', {
    description: 'Search and read records from any Odoo model using the permissions of the configured Odoo API user.',
    inputSchema: {
      model,
      domain: z.array(jsonValue).default([]).describe('Odoo search domain'),
      fields: z.array(z.string()).optional(),
      limit: z.number().int().positive().max(1000).optional(),
      offset: z.number().int().nonnegative().optional(),
      order: z.string().optional(),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, async ({ model, domain, fields, limit, offset, order }) => {
    const result = await reader.searchRead(model, { domain, fields, limit, offset, order });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: { records: result } };
  });

  server.registerTool('odoo_fields_get', {
    description: 'Inspect field metadata for an Odoo model using fields_get.',
    inputSchema: {
      model,
      attributes: z.array(z.string()).optional().describe('Field metadata attributes to return'),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, async ({ model, attributes }) => {
    const result = await reader.fieldsGet(model, attributes);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: { fields: result } };
  });
}
