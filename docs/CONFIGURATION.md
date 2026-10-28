# Configuration

Never commit .env, credentials, private recovery identities, database exports or generated builds. Protect .env with mode 600.

| Variable | Purpose |
| --- | --- |
| COMPOSE_PROJECT_NAME | Independent project/volume namespace; automatically randomized by the generator |
| POSTGRES_PASSWORD | Administrative/migration password; never passed to app/worker |
| APP_DATABASE_PASSWORD | Independent non-superuser runtime password, generated privately |
| BETTER_AUTH_SECRET | Independent random auth/mail-encryption secret, minimum 32 characters |
| BETTER_AUTH_URL | Exact external origin; HTTPS except loopback development |
| HOST_BIND / HOST_PORT | Published app listener, default 127.0.0.1:3000 |
| DATABASE_URL | CLI/non-Compose connection; Compose derives its own |
| RESEND_API_KEY | Optional sending-only domain-restricted provider key |
| SMTP_URL | Optional SMTP URL; Resend takes precedence |
| MAIL_FROM | Required for email; e.g. Penge <sender@example.org> |
| SERVICE_PROVIDER_NAME / SERVICE_PROVIDER_URL | Runtime email operator credit; optional HTTPS URL |
| NEXT_PUBLIC_SERVICE_PROVIDER_NAME / NEXT_PUBLIC_SERVICE_PROVIDER_URL | Public UI credit, applied at build time |
| BACKUP_RECIPIENT | Public age recipient, never the private identity |
| BACKUP_RETENTION_DAYS | Retention 1–365 days, default 30 |
| BACKUP_TOOLS_IMAGE | Optional local image containing age |

Never put secrets in NEXT_PUBLIC variables. Rebuild for UI branding changes; recreate containers for runtime changes. Rotating BETTER_AUTH_SECRET invalidates sessions and makes existing encrypted queue payloads unreadable: plan and drain/cancel outstanding jobs first. Editing POSTGRES_PASSWORD does not change the password in an existing database volume; coordinate any rotation.

CI has separate synthetic credentials and no production secrets.

App/worker use penge_runtime. Migration/tools use the administrative connection and receive no mail-provider credentials. For existing instances, scripts/add-runtime-password.py adds a new credential without replacing existing secrets; perform a tested, controlled switch after role provisioning.
