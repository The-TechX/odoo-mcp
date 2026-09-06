import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { OdooReader } from './odoo/read.js';
import type { OdooWriter } from './odoo/write.js';
import { registerReadTools } from './tools/read.js';
import { registerWriteTools } from './tools/write.js';

export type ServerDependencies = { reader?: OdooReader; writer?: OdooWriter };

export function createServer({ reader, writer }: ServerDependencies = {}): McpServer {
  const server = new McpServer({ name: 'odoo-mcp', version: '0.1.0' });
  if (reader) registerReadTools(server, reader);
  if (writer) registerWriteTools(server, writer);
  return server;
}
