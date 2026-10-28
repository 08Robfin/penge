# Encrypted backup and recovery

scripts/backup.sh streams a PostgreSQL custom-format dump through age without writing plaintext financial data. Archives are mode 600 in backups/ (directory 700), protected by a lock and atomic rename. Retention deletes only matching encrypted archive names.

Generate an age identity on a trusted recovery machine; keep its private identity off-server where possible. Copy only the public recipient into mode-600 .backup.env:

```sh
cp .backup.env.example .backup.env
chmod 600 .backup.env
# Edit BACKUP_RECIPIENT privately.
docker build -f Dockerfile.backup-test -t penge-backup-tools .
set -a; . ./.backup.env; set +a
bash scripts/backup.sh
```

Host age is used if installed, otherwise the configured local image. Keep off-server archive and recovery-key copies. Same-disk backups cannot protect against server/disk loss. Monitor backup failures and record schedule timezone. Generic systemd units in deploy/ require your own account/path; cloning does not enable them.

## Restore verification

Never test restore against the live database or its original volume.

1. Start a separate PostgreSQL 17 container with a NEW volume/tmpfs, test-only credentials, no published ports and preferably no network.
2. On a trusted machine stream only into that disposable database:
   `age -d -i PRIVATE_IDENTITY BACKUP.dump.age | docker exec -i DISPOSABLE_CONTAINER pg_restore -U TEST_USER -d TEST_DATABASE --no-owner --no-acl --exit-on-error`.
3. Compare schema/counts and private content checksums without printing user data.
4. If an isolated app is used for recovered real data, disable outgoing mail and never run adversarial/destructive account tests.
5. Remove only the named disposable resources after verification.

A real cutover requires owner approval, retaining the old volume, accounting for changes since backup and reapplying subsequent deletion requests. Sessions/password hashes/encrypted email are private recovery data too. The older restore-test helper is limited to synthetic penge-test-db fixtures, not live recovery.
