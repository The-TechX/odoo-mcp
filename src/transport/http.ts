import type { Server } from 'node:http';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { mcpAuthMetadataRouter, requireBearerAuth } from '@modelcontextprotocol/express';
import { toNodeHandler } from '@modelcontextprotocol/node';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import type { OdooConfig } from '../config/env.js';
import { createOdooMcpServer } from '../app.js';
import { createAuthProvider, type AuthProvider } from './auth.js';

export function createHttpApp(config: OdooConfig, authProvider: AuthProvider = createAuthProvider(config)): Express {
  const app = express();
  app.use(express.json());

  if (config.httpAuth === 'oauth') {
    const bearerOptions = authProvider.getBearerAuthOptions();
    if (!bearerOptions) throw new Error('OAuth mode requires an OAuth auth provider');

    // Metadata is deliberately public. Resolve lazily so app construction stays synchronous/testable.
    app.use(async (req: Request, res: Response, next: NextFunction) => {
      if (!req.path.startsWith('/.well-known/')) return next();
      try {
        const metadata = await authProvider.getAuthMetadataOptions();
        if (!metadata) throw new Error('OAuth mode requires authorization metadata');
        return mcpAuthMetadataRouter(metadata)(req, res, next);
      } catch (error) {
        return next(error);
      }
    });
    app.use('/mcp', requireBearerAuth(bearerOptions));
  }

  const handler = createMcpHandler(() => createOdooMcpServer(config));
  const nodeHandler = toNodeHandler(handler);
  app.all('/mcp', (req, res) => void nodeHandler(req, res, req.body));
  return app;
}

export async function startHttpServer(config: OdooConfig): Promise<Server> {
  const authProvider = createAuthProvider(config);
  if (config.httpAuth === 'oauth') await authProvider.getAuthMetadataOptions();
  const app = createHttpApp(config, authProvider);
  return new Promise((resolve, reject) => {
    const listener = app.listen(config.httpPort, config.httpHost, () => resolve(listener));
    listener.once('error', reject);
  });
}
