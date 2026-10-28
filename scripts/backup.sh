#!/usr/bin/env bash
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."
: "${BACKUP_RECIPIENT:?Set an age public recipient via environment}"
retention="${BACKUP_RETENTION_DAYS:-30}"
[[ "$retention" =~ ^[0-9]+$ ]] && ((retention >= 1 && retention <= 365)) || { echo "Invalid retention"; exit 1; }
mkdir -p backups
chmod 700 backups
exec 9>backups/.backup.lock
flock -n 9 || { echo "Backup already running"; exit 1; }
stamp=$(date -u +%Y%m%dT%H%M%SZ)
target="backups/penge-${stamp}.dump.age"
tmp="${target}.partial"
trap 'rm -f -- "$tmp"' EXIT
if command -v age >/dev/null; then
 docker compose exec -T db pg_dump -U penge -d penge -Fc --no-owner --no-acl | age -r "$BACKUP_RECIPIENT" -o "$tmp"
else
 docker compose exec -T db pg_dump -U penge -d penge -Fc --no-owner --no-acl | docker run --rm -i "${BACKUP_TOOLS_IMAGE:-penge-backup-tools}" age -r "$BACKUP_RECIPIENT" > "$tmp"
fi
mv -- "$tmp" "$target"
# Scoped retention: only this script's encrypted archive names in the backup directory.
find backups -maxdepth 1 -type f -name 'penge-*.dump.age' -mtime "+$retention" -delete
echo "Encrypted Penge backup complete."
