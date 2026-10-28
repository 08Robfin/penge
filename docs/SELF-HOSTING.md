# Self-hosting

The root Compose file creates an independent installation without an existing proxy network, external database or production hostname.

1. Clone into a dedicated directory.
2. Generate .env using scripts/create-env.py --url YOUR_ORIGIN.
3. Configure optional mail/operator settings privately.
4. Run docker compose up -d --build.
5. Confirm db/app health and successful migration exit using docker compose ps.
6. Create the first invitation and grant admin as in README.
7. Set up encrypted scheduled backups and off-server recovery copies.

## Isolation and persistence

Only the app publishes a host port, on loopback by default. PostgreSQL has no published port and uses an internal network. The mail worker has a separate outbound network. The database uses a project-scoped persistent volume.

The generator chooses a unique COMPOSE_PROJECT_NAME for every new instance. If configuring manually, choose a unique name before first start. Accidentally changing it selects a different volume.

## HTTPS

Forward a dedicated HTTPS virtual host to the loopback app port, or deliberately join only app to your proxy network in a private override. Never publish the database or Docker socket. Force HTTPS with a valid certificate and set BETTER_AUTH_URL to the exact public origin.

Do not log raw URLs, query strings, cookies, authorization headers or request bodies: invitation/reset/unsubscribe URLs are bearer capabilities. Default Nginx access logs include URLs. Disable request logging for this virtual host or implement redaction of token-bearing paths, queries and referrers. Error logs may also repeat full requests.

Authentication throttling ignores arbitrary forwarded-IP headers. Per-email database limits plus a global ceiling apply. Adding trusted proxy headers requires ensuring the origin cannot be reached directly and the proxy replaces that header.

## Operations

Without email, administrators copy invitation links; password recovery/verified email changes and campaign sending need delivery configuration. Preserve at least one administrator and its unique password.

App/worker filesystems are read-only, /tmp is temporary, app runs nonroot and capabilities are dropped. JSON logs rotate at 10 MB with three files. Migration/tools are one-shot administrative utilities running as node with read-only filesystems and dropped capabilities. App/worker use a separately provisioned restricted database role. The worker image contains compiled mail code and production dependencies only.

Maintain Docker, OS and proxy security separately. This project cannot verify router port forwards, unrelated services, physical security or every deployment's privacy requirements.
