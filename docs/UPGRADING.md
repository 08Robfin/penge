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

## Restricted runtime role upgrade
For a legacy instance, back up and verify recovery first. Run python3 scripts/add-runtime-password.py in its private configuration directory; this adds APP_DATABASE_PASSWORD without changing existing secrets. Update the reviewed deployment configuration to separate administrative migration credentials from the runtime connection. Run migrations using the administrative connection and new runtime password, then switch app/worker to penge_runtime. Keep the prior owner connection/images for a controlled rollback. Do not rerun create-env.py or replace a database volume.
