import type { Server } from 'node:http';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import type { OdooConfig } from '../config/env.js';
import { createOdooMcpServer } from '../app.js';

export function startHttpServer(config: OdooConfig): Promise<Server> {
  const app = createMcpExpressApp({ host: config.httpHost, allowedHosts: config.httpAllowedHosts });

  app.post('/mcp', async (req: Request, res: Response) => {
    const server = createOdooMcpServer(config);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
      }
    } finally {
      res.on('close', () => {
        void transport.close();
        void server.close();
      });
    }
  });

  app.get('/mcp', methodNotAllowed);
  app.delete('/mcp', methodNotAllowed);

  return new Promise((resolve, reject) => {
    const listener = app.listen(config.httpPort, config.httpHost, () => resolve(listener));
    listener.once('error', reject);
  });
}

function methodNotAllowed(_req: Request, res: Response): void {
  res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null });
}
