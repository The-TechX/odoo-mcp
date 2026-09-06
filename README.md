# odoo-mcp

A generic Model Context Protocol (MCP) server for integrating MCP clients with Odoo.

## Status

Technical bootstrap only. Odoo-specific capabilities will be added incrementally through focused pull requests.

## Requirements

- Node.js 22+
- npm
- Docker + Docker Compose (optional)

## Local development

```bash
npm ci
npm run check
npm start
```

For development without building first:

```bash
npm run dev
```

The server currently uses MCP over stdio and intentionally exposes no Odoo tools yet.

## Docker

```bash
docker compose build
docker compose run --rm odoo-mcp
```

## Project structure

```text
src/
  index.ts      # process entrypoint / stdio transport
  server.ts     # MCP server factory
test/
  server.test.ts
```

## Development approach

Changes are developed PR by PR. Every pull request documents its scope, tests, and Definition of Done. Odoo-specific business logic does not belong in this bootstrap layer.

## License

MIT
