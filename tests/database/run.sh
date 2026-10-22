#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
container="ptcare-db-test-$$"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT
# No host ports, no production records, disposable PostgreSQL with synthetic auth roles.
docker run --rm --name "$container" -e POSTGRES_HOST_AUTH_METHOD=trust -d postgres:17 >/dev/null
for i in $(seq 1 30); do
 if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
 sleep 1
done
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < tests/database/bootstrap.sql
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < supabase/schema.sql
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < tests/database/security.sql
