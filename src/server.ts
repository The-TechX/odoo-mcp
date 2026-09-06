import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { OdooReader } from './odoo/read.js';
import { registerReadTools } from './tools/read.js';

export function createServer(reader?: OdooReader): McpServer {
  const server = new McpServer({ name: 'odoo-mcp', version: '0.1.0' });
  if (reader) registerReadTools(server, reader);
  return server;
}
