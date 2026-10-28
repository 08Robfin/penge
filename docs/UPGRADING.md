# Upgrades and rollback

1. Confirm instance directory, project, services, persistent volume and current health.
2. Check disk/memory; create an encrypted backup and verify a restore separately.
3. Record source commit and tag current app/worker images with unique rollback tags.
4. Fetch reviewed source; inspect schema/configuration changes.
5. Validate and build before replacing running services.
6. Run new tools migrations; inspect successful completion.
7. Recreate only this app/worker; validate health, login and intended behavior.
8. Confirm data persistence and backup scheduling.

Initial Compose startup also uses a one-shot migration service. Applied SQL migrations are tracked by name and must never be edited.

For application rollback, use prior source/images in a private override. Existing additive schema changes can usually remain; review the release. Never automatically down-migrate or delete the database to revert code.

For recovery, restore to a NEW volume, validate privately and obtain owner approval for cutover. Retain the original volume, account for missing later changes and reapply account deletions after the backup.
