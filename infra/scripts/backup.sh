#!/bin/sh
set -eu

infra_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
backup_dir=${BACKUP_DIR:-"$infra_dir/backups"}
mkdir -p "$backup_dir"
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
destination="$backup_dir/alfabetiza-$timestamp.dump"

cd "$infra_dir"
docker compose exec -T db sh -c 'exec pg_dump --format=custom --no-owner --no-acl --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' > "$destination"
test -s "$destination"
days=${BACKUP_RETENTION_DAYS:-14}
find "$backup_dir" -type f -name 'alfabetiza-*.dump' -mtime "+$days" -delete
printf '%s\n' "$destination"
