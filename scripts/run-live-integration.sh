#!/usr/bin/env bash
set -euo pipefail

COMPOSE=(docker compose -f compose.integration.yaml)
DB=odoo_mcp_test
TEST_KEY=0123456789abcdef0123456789abcdef01234567

cleanup() {
  "${COMPOSE[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT

"${COMPOSE[@]}" up -d integration-db
"${COMPOSE[@]}" run --rm integration-odoo odoo \
  --db_host=integration-db --db_port=5432 --db_user=odoo --db_password=odoo \
  -d "$DB" -i base --without-demo=all --stop-after-init

"${COMPOSE[@]}" up -d integration-odoo

for _ in $(seq 1 60); do
  if curl --fail --silent --output /dev/null http://127.0.0.1:18069/web/database/selector; then
    break
  fi
  sleep 1
done
curl --fail --silent --output /dev/null http://127.0.0.1:18069/web/database/selector

"${COMPOSE[@]}" exec -T integration-odoo odoo shell \
  --db_host=integration-db --db_port=5432 --db_user=odoo --db_password=odoo \
  -d "$DB" --no-http <<PY >/dev/null
from odoo.addons.base.models.res_users import INDEX_SIZE, KEY_CRYPT_CONTEXT
key = "$TEST_KEY"
env.cr.execute(
    """INSERT INTO res_users_apikeys (name, user_id, scope, expiration_date, key, index)
       VALUES (%s, %s, %s, %s, %s, %s)""",
    ["odoo-mcp integration test", env.ref('base.user_admin').id, None, None, KEY_CRYPT_CONTEXT.hash(key), key[:INDEX_SIZE]],
)
env.cr.commit()
PY

ODOO_TEST_URL=http://127.0.0.1:18069 \
ODOO_TEST_API_KEY="$TEST_KEY" \
ODOO_TEST_DATABASE="$DB" \
npm run test:integration
