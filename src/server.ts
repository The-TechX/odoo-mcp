import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ReadService } from './tools/read.js';
import type { WriteService } from './tools/write.js';
import { registerReadTools } from './tools/read.js';
import { registerWriteTools } from './tools/write.js';

export type ServerDependencies = { reader?: ReadService; writer?: WriteService };

export function createServer({ reader, writer }: ServerDependencies = {}): McpServer {
  const server = new McpServer({ name: 'odoo-mcp', version: '0.1.0' });
  if (reader) registerReadTools(server, reader);
  if (writer) registerWriteTools(server, writer);
  return server;
}
