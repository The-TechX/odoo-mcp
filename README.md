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

## Odoo connection

The client layer targets Odoo's JSON-2 external API (`/json/2/<model>/<method>`), introduced for Odoo 19. Authentication uses an Odoo API key as a bearer token. `X-Odoo-Database` is sent only when `ODOO_DATABASE` is configured.

Copy `.env.example` and provide the connection values for your Odoo instance. Credentials are read from the environment and are never stored in source code.

> Odoo-specific MCP tools are intentionally still out of scope at this stage; this layer only establishes the reusable API client.

## Read-only MCP tools

The first MCP surface is intentionally read-only and generic:

- `odoo_search_read` — searches and reads records from any model available to the configured Odoo user.
- `odoo_fields_get` — inspects model field metadata.

Both tools are annotated as read-only and rely on Odoo itself for ACLs and record rules. The MCP server does not bypass or duplicate Odoo authorization.

## Write MCP tools

Generic write operations are exposed separately from reads:

- `odoo_create` — creates a record.
- `odoo_write` — updates one or more records.
- `odoo_unlink` — permanently deletes one or more records and is explicitly marked destructive.

Inputs are validated before reaching Odoo: record id lists must be non-empty and bounded, and create/update values cannot be empty. Odoo ACLs and record rules remain authoritative for every mutation.
