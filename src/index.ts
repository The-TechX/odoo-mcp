import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadOdooConfig } from './config/env.js';
import { OdooClient } from './odoo/client.js';
import { OdooReader } from './odoo/read.js';
import { OdooWriter } from './odoo/write.js';
import { createServer } from './server.js';

const config = loadOdooConfig();
const client = new OdooClient(config);
const server = createServer({ reader: new OdooReader(client), writer: new OdooWriter(client) });
const transport = new StdioServerTransport();
await server.connect(transport);
