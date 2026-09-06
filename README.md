# odoo-mcp

[![CI](https://github.com/The-TechX/odoo-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/The-TechX/odoo-mcp/actions/workflows/ci.yml)

A generic Model Context Protocol (MCP) server for integrating MCP clients with Odoo.

## Status

Active development. The server exposes generic Odoo read/write primitives with deployment guardrails, structured errors, and observability.

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

The server supports MCP over stdio (default) and stateless Streamable HTTP. Odoo tools are registered from the configured connection and policy.

## Docker

```bash
cp .env.example .env
# edit .env with your Odoo URL and API key
docker compose build
docker compose run --rm odoo-mcp
```

Compose passes all supported Odoo and guardrail settings into the container. `ODOO_URL` and `ODOO_API_KEY` are required; Compose fails fast when either is missing. Optional empty values are treated as unset. Because the transport is stdio, `docker compose run --rm odoo-mcp` is the intended interactive container entrypoint rather than a background daemon with a restart policy.

## Project structure

```text
src/
  config/          # environment and deployment policy
  observability/   # structured logging
  odoo/            # JSON-2 client and read/write services
  tools/           # MCP tool registration and schemas
  index.ts         # process entrypoint / stdio transport
  server.ts        # MCP server factory
test/              # unit tests
```

## Development approach

Changes are developed PR by PR. Every pull request documents its scope, tests, and Definition of Done. Odoo-specific business logic does not belong in this bootstrap layer.

## License

MIT

## Odoo connection

The client layer targets Odoo's JSON-2 external API (`/json/2/<model>/<method>`), introduced for Odoo 19. Authentication uses an Odoo API key as a bearer token. `X-Odoo-Database` is sent only when `ODOO_DATABASE` is configured.

Copy `.env.example` and provide the connection values for your Odoo instance. Credentials are read from the environment and are never stored in source code.


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

## Continuous integration

Every pull request and push to `main` runs the same lint, test, TypeScript build, Compose validation, and Docker image build used during local development. CI uses placeholder connection values only for configuration/build validation and does not connect to an Odoo instance.

## Streamable HTTP

For a long-running network endpoint, select the HTTP transport explicitly:

```env
MCP_TRANSPORT=http
MCP_HTTP_HOST=0.0.0.0
MCP_HTTP_PORT=3000
MCP_HTTP_ALLOWED_HOSTS=mcp.example.com,localhost
```

The MCP endpoint is `POST /mcp`. HTTP mode is stateless: each request receives a fresh MCP server/transport pair and no MCP session state is stored by `odoo-mcp`. `GET /mcp` and `DELETE /mcp` return 405.

The server uses the MCP SDK's Express helper so host validation can be applied. When binding beyond localhost, configure `MCP_HTTP_ALLOWED_HOSTS` for the hostnames that are expected to reach the service.

HTTP mode requires a pre-shared Bearer token by default. Set `MCP_HTTP_BEARER_TOKEN` to a high-entropy value of at least 32 characters and send it as `Authorization: Bearer <token>` on every MCP request. The comparison is constant-time and the token is never logged. `MCP_HTTP_AUTH=none` is an explicit opt-out intended only for already-trusted/private networks.

This pre-shared token mode is a deployment guard, **not** a complete implementation of the MCP OAuth 2.1 authorization flow. For public multi-client deployments, use a standards-compliant authorization server/resource-server integration rather than treating a shared secret as OAuth.

The Docker Compose file publishes `MCP_HTTP_PORT`; with `MCP_TRANSPORT=http` it can run as a normal long-running container using `docker compose up -d`.

## MCP protocol compatibility

`odoo-mcp` uses the MCP TypeScript SDK v2 packages. The HTTP entrypoint is built with `createMcpHandler()`, which serves the current 2026-07-28 stateless protocol and retains the SDK's stateless compatibility path for 2025-era clients. stdio uses the v2 `serveStdio()` entrypoint.

The transport layer depends on the official split packages (`@modelcontextprotocol/server` and `@modelcontextprotocol/node`) rather than the legacy monolithic v1 SDK package.

## Live Odoo integration test

The unit suite does not require an Odoo server. A separate opt-in integration suite can validate the real Odoo 19 JSON-2 contract:

```bash
ODOO_TEST_URL=https://odoo.example.com \
ODOO_TEST_API_KEY=replace-with-a-short-lived-api-key \
ODOO_TEST_DATABASE=your-database \
npm run test:integration
```

The live test uses only generic `res.partner` operations: it inspects fields, creates a uniquely named temporary record, verifies `search_read`, updates it, verifies the update, deletes it, and verifies cleanup. Cleanup also runs from `afterAll` if an assertion fails after record creation. Use a dedicated test database or short-lived API key whenever possible.

For a completely disposable real-Odoo run, Docker can provision Odoo 19 and PostgreSQL automatically:

```bash
npm run test:integration:docker
```

That command initializes a fresh database, seeds a fixed credential that exists only inside the disposable test database, runs the same JSON-2 integration suite, and removes the containers and volumes afterward. It never needs credentials from a real Odoo deployment.
