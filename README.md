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

## Guardrails

`odoo-mcp` adds deployment-level guardrails without replacing Odoo authorization. Odoo ACLs and record rules are still the final authority for every request.

The server starts in `read-only` mode by default. Set `ODOO_MCP_MODE=read-write` to expose effective mutation capability. Optional exact-name model allow/deny lists can further reduce the models reachable through this MCP instance; deny rules take precedence over allow rules.

```env
ODOO_MCP_MODE=read-only
ODOO_MCP_ALLOW_MODELS=res.partner,sale.order
ODOO_MCP_DENY_MODELS=res.users,ir.config_parameter
```

These controls are intentionally coarse deployment constraints, not a duplicate RBAC system. Use Odoo users, groups, ACLs, and record rules for business authorization.

## Observability and errors

Odoo requests emit structured JSON logs to stderr with a request id, model, method, outcome, HTTP status when available, and duration. Request parameters, API keys, authorization headers, and response bodies are intentionally excluded from logs.

Transport failures are classified as `http`, `timeout`, or `network` errors. Timeouts and network failures do not invent an HTTP status code when no HTTP response was received. The generated request id is also forwarded to Odoo as `X-Request-ID` for correlation where upstream infrastructure preserves it.
