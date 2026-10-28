# Changelog

## Unreleased

- Fresh installations generate unique project/volume namespaces to prevent collisions.
- Independent Docker Compose self-hosting, configuration and private GitHub workflow.
- Startup validation of secrets/origin and configurable operator branding.
- Resend-only password recovery support.
- Authentication logs omit raw account/database context.
- Hashed verification identifiers and encrypted queued account mail with bounded expiry.
- Failed registration preserves invitations; concurrent registration is serialized.
- Disposable-database guards and security regression tests.
- Security, backup/recovery and deployment documentation.

Existing features include paycheck budgeting, recurring bills/subscriptions/loans, savings/plans, invitations, account administration, Markdown newsletters and responsive PWA navigation.
