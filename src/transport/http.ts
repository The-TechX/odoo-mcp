import type { Server } from 'node:http';
import { bearerAuthChallengeResponse, createMcpHandler, verifyBearerToken } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import type { OdooConfig } from '../config/env.js';
import { createOdooMcpServer } from '../app.js';
import { StaticBearerTokenVerifier } from './auth.js';

export function createHttpApp(config: OdooConfig): Express {
  const app = express();
  app.use(express.json());

  if (config.httpAuth === 'bearer') {
    const options = { verifier: new StaticBearerTokenVerifier(config.httpBearerToken!) };
    app.use('/mcp', async (req: Request, res: Response, next: NextFunction) => {
      try {
        await verifyBearerToken(req.headers.authorization, options);
        next();
      } catch (error) {
        const challenge = bearerAuthChallengeResponse(error);
        res.status(challenge.status);
        challenge.headers.forEach((value, key) => res.setHeader(key, value));
        res.send(await challenge.text());
      }
    });
  }

  const handler = createMcpHandler(() => createOdooMcpServer(config));
  const nodeHandler = toNodeHandler(handler);
  app.all('/mcp', (req, res) => void nodeHandler(req, res, req.body));
  return app;
}

export function startHttpServer(config: OdooConfig): Promise<Server> {
  const app = createHttpApp(config);
  return new Promise((resolve, reject) => {
    const listener = app.listen(config.httpPort, config.httpHost, () => resolve(listener));
    listener.once('error', reject);
  });
}
