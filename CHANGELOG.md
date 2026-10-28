# Changelog

## 1.0.0 — 2026-10-28
- Apply the MIT license selected by the owner.
- Separate restricted application/worker database credentials from administrative migrations.
- Compile a production-only mail worker without source, npm or development dependencies.
- Harden one-shot migration/tools containers and verify denied database administration.
- Restrict no-store caching to private documents/APIs.
- Replace installation-specific public audit notes with project-level verification guidance.


- Fresh installations generate unique project/volume namespaces to prevent collisions.
- Independent Docker Compose self-hosting, configuration and a separately published source snapshot.
- Startup validation of secrets/origin and configurable operator branding.
- Resend-only password recovery support.
- Authentication logs omit raw account/database context.
- Hashed verification identifiers and encrypted queued account mail with bounded expiry.
- Failed registration preserves invitations; concurrent registration is serialized.
- Disposable-database guards and security regression tests.
- Security, backup/recovery and deployment documentation.

Existing features include paycheck budgeting, recurring bills/subscriptions/loans, savings/plans, invitations, account administration, Markdown newsletters and responsive PWA navigation.
