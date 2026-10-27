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
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < tests/database/access.sql
# Two devices race for the final patient slot. The account lock serializes allocations.
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 > /tmp/ptcare-quota-race-first.log <<'SQL' &
begin;
set role authenticated;
set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
select id from public.save_patient_record('55555555-5555-4555-8555-555555555555','{"id":"55555555-5555-4555-8555-555555555555","schemaVersion":1,"identity":{},"visits":[]}',0,gen_random_uuid());
select pg_sleep(2);
commit;
SQL
first_pid=$!
sleep 0.5
if docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 > /tmp/ptcare-quota-race-second.log 2>&1 <<'SQL'
set role authenticated;
set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
select id from public.save_patient_record('66666666-6666-4666-8666-666666666666','{"id":"66666666-6666-4666-8666-666666666666","schemaVersion":1,"identity":{},"visits":[]}',0,gen_random_uuid());
SQL
then
 echo 'FAIL: simultaneous devices exceeded the patient quota';exit 1
fi
wait "$first_pid"
docker exec "$container" psql -U postgres -v ON_ERROR_STOP=1 -c "do \$\$begin assert (select count(*) from public.patient_records where owner_id='22222222-2222-4222-8222-222222222222')=1,'race exceeded quota';end;\$\$;"
echo 'PASS: concurrent patient allocation respects the account limit'
# Installing the latest SQL again preserves existing records, roles and granted limits.
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < supabase/schema.sql > /tmp/ptcare-schema-reinstall.log
docker exec "$container" psql -U postgres -v ON_ERROR_STOP=1 -c "do \$\$begin assert (select count(*) from public.patient_records)=3;assert (select patient_limit from public.therapist_access where user_id='11111111-1111-4111-8111-111111111111')=0;assert (select count(*) from public.platform_admins)=1;assert (select count(*) from public.access_audit)=3;end;\$\$;"
echo 'PASS: schema reinstallation preserves clinical data, admin role and access grants'
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < tests/database/membership.sql
docker cp supabase/upgrade-eight-visits.sql "$container:/tmp/ptcare-upgrade-eight-visits.sql"
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < tests/database/eight-visits.sql
