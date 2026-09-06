import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { OdooConfig } from '../config/env.js';
import { createOdooMcpServer } from '../app.js';

export async function startStdioServer(config: OdooConfig): Promise<void> {
  const server = createOdooMcpServer(config);
  await server.connect(new StdioServerTransport());
}
