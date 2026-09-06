import { serveStdio } from '@modelcontextprotocol/server/stdio';
import type { OdooConfig } from '../config/env.js';
import { createOdooMcpServer } from '../app.js';

export async function startStdioServer(config: OdooConfig): Promise<void> {
  serveStdio(() => createOdooMcpServer(config));
}
