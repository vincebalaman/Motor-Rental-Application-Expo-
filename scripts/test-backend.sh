#!/bin/sh
set -eu
POSTGRES_BIN=${POSTGRES_BIN:-/Library/PostgreSQL/18/bin}
if [ ! -x "$POSTGRES_BIN/initdb" ]; then
  echo 'Set POSTGRES_BIN to a PostgreSQL bin directory containing initdb, pg_ctl, and psql.' >&2
  exit 1
fi
TEST_ROOT=$(mktemp -d /tmp/motor-rental-postgres.XXXXXX)
cleanup() {
  "$POSTGRES_BIN/pg_ctl" -D "$TEST_ROOT/data" -m immediate stop >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM
"$POSTGRES_BIN/initdb" -D "$TEST_ROOT/data" --auth-local=trust --auth-host=scram-sha-256 --no-instructions >"$TEST_ROOT/init.log"
# Unix socket only, isolated directory; never connects to a hosted or existing database.
"$POSTGRES_BIN/pg_ctl" -D "$TEST_ROOT/data" -l "$TEST_ROOT/server.log" -o "-k $TEST_ROOT -h ''" -w start >/dev/null
"$POSTGRES_BIN/psql" -X -h "$TEST_ROOT" -d postgres -v ON_ERROR_STOP=1 \
  -f supabase/tests/bootstrap.sql \
  -f supabase/migrations/20261117000100_accounts_and_inventory.sql \
  -f supabase/migrations/20261117000200_local_motor_import.sql \
  -f supabase/tests/permissions.sql \
  -f supabase/tests/local-import.sql >"$TEST_ROOT/results.log" 2>&1 || {
    cat "$TEST_ROOT/results.log"
    exit 1
  }
# Concurrent requests must resolve to one shared motor and mapping.
"$POSTGRES_BIN/psql" -X -h "$TEST_ROOT" -d postgres -v ON_ERROR_STOP=1 -f supabase/tests/import-concurrent.sql >"$TEST_ROOT/concurrent-1.log" 2>&1 &
FIRST_PID=$!
"$POSTGRES_BIN/psql" -X -h "$TEST_ROOT" -d postgres -v ON_ERROR_STOP=1 -f supabase/tests/import-concurrent.sql >"$TEST_ROOT/concurrent-2.log" 2>&1 &
SECOND_PID=$!
wait "$FIRST_PID"
wait "$SECOND_PID"
"$POSTGRES_BIN/psql" -X -h "$TEST_ROOT" -d postgres -v ON_ERROR_STOP=1 -f supabase/tests/import-concurrent-check.sql >>"$TEST_ROOT/results.log"
tail -5 "$TEST_ROOT/results.log"
echo "Local PostgreSQL test logs: $TEST_ROOT"
