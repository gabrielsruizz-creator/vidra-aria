#!/usr/bin/env bash
# Recria um banco descartável, aplica o shim do Supabase + migrações e roda os testes de banco.
# Uso: TEST_DATABASE_URL=postgres://postgres@localhost:54329/vidra_test npm run db:test
set -euo pipefail

: "${TEST_DATABASE_URL:?Defina TEST_DATABASE_URL (ex.: postgres://postgres@localhost:54329/vidra_test)}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_NAME="${TEST_DATABASE_URL##*/}"
DB_NAME="${DB_NAME%%\?*}"
ADMIN_URL="${TEST_DATABASE_URL%/*}/postgres"

case "$DB_NAME" in
  *test*) ;;
  *) echo "Por segurança, o nome do banco precisa conter 'test' (recebido: $DB_NAME)." >&2; exit 1 ;;
esac

psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -q -c "drop database if exists \"$DB_NAME\" with (force)" -c "create database \"$DB_NAME\""
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$ROOT/tests/db/supabase-shim.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "Aplicando $(basename "$f")"
  psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done

npx vitest run tests/db
