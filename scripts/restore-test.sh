#!/usr/bin/env bash
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."
# Hard-coded disposable container/database; never accepts a live restore target.
docker inspect penge-test-db >/dev/null
testdir="$PWD/work/restore-test"
mkdir -p "$testdir"
chmod 700 "$testdir"
if [[ ! -f "$testdir/key.txt" ]]; then
 docker run --rm --user "$(id -u):$(id -g)" -v "$testdir:/test" penge-backup-tools age-keygen -o /test/key.txt
fi
recipient=$(docker run --rm --user "$(id -u):$(id -g)" -v "$testdir:/test:ro" penge-backup-tools age-keygen -y /test/key.txt)
docker exec penge-test-db pg_dump -U penge_test -d penge_test --no-owner --no-acl | gzip | docker run --rm -i penge-backup-tools age -r "$recipient" > "$testdir/backup.sql.gz.age"
docker exec penge-test-db createdb -U penge_test penge_restore_test
trap 'docker exec penge-test-db dropdb -U penge_test --if-exists penge_restore_test >/dev/null' EXIT
docker run --rm --user "$(id -u):$(id -g)" -v "$testdir:/test:ro" penge-backup-tools age -d -i /test/key.txt /test/backup.sql.gz.age | gzip -d | docker exec -i penge-test-db psql -v ON_ERROR_STOP=1 -U penge_test -d penge_restore_test >/dev/null
query='SELECT md5(COALESCE((SELECT string_agg(row_to_json(t)::text,CHR(10) ORDER BY id) FROM budget_record t),CHR(0+32))) || CHR(58) || (SELECT count(*) FROM "user") || CHR(58) || (SELECT count(*) FROM occurrence)'
source_hash=$(docker exec penge-test-db psql -U penge_test -d penge_test -Atc "$query")
restored_hash=$(docker exec penge-test-db psql -U penge_test -d penge_restore_test -Atc "$query")
[[ "$source_hash" == "$restored_hash" ]] || { echo "Restore comparison failed"; exit 1; }
echo "PASS: encrypted PostgreSQL dump decrypted and restored into a separate disposable database; records and counts match."
