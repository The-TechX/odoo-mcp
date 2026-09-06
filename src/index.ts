import { loadOdooConfig } from './config/env.js';
import { startHttpServer } from './transport/http.js';
import { startStdioServer } from './transport/stdio.js';

const config = loadOdooConfig();

if (config.transport === 'http') {
  await startHttpServer(config);
} else {
  await startStdioServer(config);
}
