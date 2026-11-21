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
  -f supabase/migrations/20261120000100_client_bookings.sql \
  -f supabase/migrations/20261121000100_booking_calendar.sql \
  -f supabase/migrations/20261121000200_rental_handover.sql \
  -f supabase/migrations/20261121000300_admin_dashboard.sql \
  -f supabase/migrations/20261121000400_admin_booking_cancellation.sql \
  -f supabase/tests/permissions.sql \
  -f supabase/tests/local-import.sql \
  -f supabase/tests/bookings.sql \
  -f supabase/tests/booking-calendar.sql \
  -f supabase/tests/rental-handover.sql \
  -f supabase/tests/admin-dashboard.sql \
  -f supabase/tests/admin-cancellation.sql >"$TEST_ROOT/results.log" 2>&1 || {
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
# Retry identical requests concurrently, then approve overlapping clients concurrently.
booking_sql() {
  "$POSTGRES_BIN/psql" -X -h "$TEST_ROOT" -d postgres -v ON_ERROR_STOP=1 "$@"
}
booking_sql -f supabase/tests/booking-concurrent-setup.sql >>"$TEST_ROOT/results.log"
booking_sql -v booking_actor=00000000-0000-0000-0000-000000000001 -f supabase/tests/booking-concurrent-request.sql >"$TEST_ROOT/booking-request-1.log" 2>&1 &
FIRST_PID=$!
booking_sql -v booking_actor=00000000-0000-0000-0000-000000000001 -f supabase/tests/booking-concurrent-request.sql >"$TEST_ROOT/booking-request-2.log" 2>&1 &
SECOND_PID=$!
wait "$FIRST_PID"
wait "$SECOND_PID"
booking_sql -v booking_actor=00000000-0000-0000-0000-000000000002 -f supabase/tests/booking-concurrent-request.sql >>"$TEST_ROOT/results.log"
booking_sql -v booking_actor=00000000-0000-0000-0000-000000000001 -f supabase/tests/booking-concurrent-review.sql >"$TEST_ROOT/booking-review-1.log" 2>&1 &
FIRST_PID=$!
booking_sql -v booking_actor=00000000-0000-0000-0000-000000000002 -f supabase/tests/booking-concurrent-review.sql >"$TEST_ROOT/booking-review-2.log" 2>&1 &
SECOND_PID=$!
wait "$FIRST_PID"
wait "$SECOND_PID"
booking_sql -f supabase/tests/booking-concurrent-check.sql >>"$TEST_ROOT/results.log"
booking_sql -f supabase/tests/handover-concurrent-setup.sql >>"$TEST_ROOT/results.log"
for HANDOVER_ACTION in pickup return; do
  booking_sql -v handover_action="$HANDOVER_ACTION" -f supabase/tests/handover-concurrent.sql >"$TEST_ROOT/handover-$HANDOVER_ACTION-1.log" 2>&1 &
  FIRST_PID=$!
  booking_sql -v handover_action="$HANDOVER_ACTION" -f supabase/tests/handover-concurrent.sql >"$TEST_ROOT/handover-$HANDOVER_ACTION-2.log" 2>&1 &
  SECOND_PID=$!
  wait "$FIRST_PID"
  wait "$SECOND_PID"
done
booking_sql -f supabase/tests/handover-concurrent-check.sql >>"$TEST_ROOT/results.log"
booking_sql -f supabase/tests/cancellation-race-setup.sql >>"$TEST_ROOT/results.log"
booking_sql -v race_action=cancel -f supabase/tests/cancellation-race.sql >"$TEST_ROOT/cancellation-race-cancel.log" 2>&1 &
FIRST_PID=$!
booking_sql -v race_action=pickup -f supabase/tests/cancellation-race.sql >"$TEST_ROOT/cancellation-race-pickup.log" 2>&1 &
SECOND_PID=$!
wait "$FIRST_PID"
wait "$SECOND_PID"
booking_sql -f supabase/tests/cancellation-race-check.sql >>"$TEST_ROOT/results.log"
tail -5 "$TEST_ROOT/results.log"
echo "Local PostgreSQL test logs: $TEST_ROOT"
