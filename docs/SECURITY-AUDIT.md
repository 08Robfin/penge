# Security verification

This document describes the maintained source and reproducible controls. It is a first-party assessment, not an independent penetration test or a guarantee that every defect has been found. Installation-specific configuration, incident notes, backup locations and operator verification records belong in private operational documentation.

## Boundaries and controls

| Area | Control |
| --- | --- |
| Authentication | Better Auth; Argon2id; secure HttpOnly/SameSite cookies on HTTPS; session invalidation; generic login/reset responses |
| Reset/invitations | Hashed reset identifiers; short-lived single-use reset links; email-bound invitations consumed only after successful registration |
| Financial authorization | Session-derived owner IDs, scoped parameterized queries, composite foreign keys, strict schemas and cross-account IDOR tests |
| Database privilege | Web app and worker use a non-superuser runtime role without schema/admin-membership write access; migrations use a separate administrative connection |
| Container runtime | Web/worker run as node with read-only filesystems, dropped capabilities and no-new-privileges |
| Worker image | Compiled entry point and production-only mail dependencies; no source tree, npm, tsx, Next.js or TypeScript |
| Administrative containers | One-shot migration/tools use node, read-only filesystem, temporary /tmp and dropped capabilities; they receive no email-provider credentials |
| Web requests | Exact Origin validation, bounded JSON, database-backed throttles, nonce CSP, frame denial, no-referrer, nosniff and HTTPS HSTS |
| Caching | Private documents/APIs are no-store; content-hashed JavaScript uses immutable caching |
| Email | Encrypted bounded-retry queue, scoped unsubscribe, safe Markdown token renderer, sandboxed preview and no tracking pixel |
| Fresh installation | Random independent instance namespace and secrets; existing configuration is not overwritten |
| Repository | Targeted staging, Gitleaks index/history scans, read-only CI tokens, SHA-pinned actions and no deployment credentials/automatic production deployment |

PostgreSQL RLS is not currently the tenant authorization boundary. Adding it requires transaction-scoped identity on every pooled connection and deliberate handling of authentication, administrative and worker operations. A partial session-variable patch would be unsafe; ownership enforcement and regression tests remain mandatory.

## Reproducible evidence

CI runs unit tests, strict TypeScript, a production build, npm audit, HTTP authentication/authorization/mail tests, runtime database-denial tests, Gitleaks, Semgrep and scans of both final runtime images. See the [current workflow results](https://github.com/08Robfin/penge/actions/workflows/ci.yml).

The HTTP suite covers failed/concurrent invitations, hashed and concurrent single-use reset tokens, cross-account reads/updates/deletes/imports, verified email changes, disabled accounts, admin lifecycle, payment funding, onboarding, preferences/unsubscribe, queue retry/expiry and cache boundaries.

Runtime-role checks prove that schema creation, migration-ledger modification, administrator membership changes and server-file/program privileges are denied. Separate image checks verify that the worker omits development tools/source.

Fresh-install migration, restart persistence and encrypted restore have been tested using synthetic fixtures. Image metadata and published screenshots are reviewed for private content. Secret pattern scans are supplemented by private exact-value comparisons against operator-provided production identifiers/credentials without printing those values.

## Operator responsibilities

Use HTTPS and independent secrets, preserve data before migration, verify restore procedures, protect backups and recovery keys, and review sender/privacy/consent configuration. A user's existing VM/NAS backup strategy is separate from the optional application backup tooling; this repository cannot establish whether such a strategy exists or works.

Default-on newsletters remain an explicit product setting; operators must assess applicable consent requirements. Provider acceptance does not prove inbox delivery. Bounce/complaint webhooks and automatic suppression are not implemented, and SMTP retries can duplicate messages after ambiguous acceptance.

Rate limits are not volumetric DDoS protection. Infrastructure administrators retain access to stored data. Automated checks and WebKit tests do not replace independent assessment or real-device testing.

## Repository safeguards

The public repository uses protected main with required checks, read-only workflow tokens, explicit approval for external fork workflows, native secret/push protection and private vulnerability reporting. Verify settings if maintaining a fork; repository settings are not inherited automatically.

Report vulnerabilities privately through [GitHub security reporting](https://github.com/08Robfin/penge/security/advisories/new). Do not include real credentials, user data or bearer URLs in public issues.

## License

Penge is MIT-licensed. See [LICENSE](../LICENSE). Third-party dependencies retain their own licenses.
