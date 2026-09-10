#!/bin/sh
set -eu

if [ "$#" -ne 2 ] || [ "$2" != "--confirm-replace-database" ]; then
  echo "usage: $0 BACKUP.dump --confirm-replace-database" >&2
  exit 2
fi
backup_file=$1
test -s "$backup_file" || { echo "backup file is missing or empty" >&2; exit 2; }
infra_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$infra_dir"
cat "$backup_file" | docker compose exec -T db sh -c 'exec pg_restore --clean --if-exists --no-owner --no-acl --exit-on-error --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"'
docker compose exec -T db sh -c 'exec pg_isready --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"'
