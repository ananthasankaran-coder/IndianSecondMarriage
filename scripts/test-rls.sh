#!/usr/bin/env bash
# Applies the test shim + all migrations to a THROWAWAY Postgres and runs supabase/tests/rls/*.test.sql.
# Modes: TEST_DATABASE_URL=<empty db url> (CI service container), else spins up a temporary local cluster.
set -euo pipefail
cd "$(dirname "$0")/.."

run_suite() {  # $1 = psql connection args
  local conn=("$@")
  psql "${conn[@]}" -v ON_ERROR_STOP=1 -q -f supabase/tests/shim/00_supabase_shim.sql
  for f in supabase/migrations/*.sql; do
    echo "applying $f"; psql "${conn[@]}" -v ON_ERROR_STOP=1 -q -f "$f"
  done
  for f in supabase/tests/rls/*.test.sql; do
    echo "running $f"; psql "${conn[@]}" -v ON_ERROR_STOP=1 -q -f "$f"
  done
}

if [[ -n "${TEST_DATABASE_URL:-}" ]]; then
  run_suite "$TEST_DATABASE_URL"; exit 0
fi

PGBIN="$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)"
WORK="$(mktemp -d)"; PORT="${RLS_TEST_PORT:-54329}"
cleanup() { sudo_pg pg_ctl -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT
if [[ "$(id -u)" == "0" ]]; then
  chown postgres "$WORK"; chmod 755 "$WORK"
  sudo_pg() { local c="$1"; shift; su postgres -c "$PGBIN/$c $*"; }
else
  sudo_pg() { local c="$1"; shift; "$PGBIN/$c" "$@"; }
fi
sudo_pg initdb -D "$WORK/data" -A trust >/dev/null
sudo_pg pg_ctl -D "$WORK/data" -o "'-p $PORT -k $WORK -c listen_addresses='" -l "$WORK/log" -w start >/dev/null
"$PGBIN/createdb" -h "$WORK" -p "$PORT" -U postgres rdp_test
run_suite -h "$WORK" -p "$PORT" -U postgres -d rdp_test
