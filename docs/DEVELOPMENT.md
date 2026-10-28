# Development

Use Node 24/PostgreSQL 17. npm ci installs the locked dependencies. APIs enforce identity/ownership on the server; PostgreSQL uses parameterized queries, relational ownership constraints and validated financial JSONB.

Run npm test, npm run typecheck and npm audit. HTTP/browser tests require a loopback BETTER_AUTH_URL and an explicitly disposable penge_test database (or penge_test_SUFFIX). Use independent test credentials, set a synthetic APP_DATABASE_PASSWORD and RUNTIME_DATABASE_URL for penge_runtime in the same disposable database, clear RESEND_API_KEY, set SMTP_URL=smtp://localhost:1025 and MAIL_FROM=test@example.test. scripts/check-integration.sh migrates/builds and runs the HTTP suites with a fake SMTP sink.

Never mount production configuration/data into test containers. On a server with a different Node version, copy reviewed source without private files into a temporary directory and use a Node 24 container.

## Git and checks

Use official Gitleaks 8.30.1, verifying its release archive checksum. scripts/scan-secrets.sh scans the index plus all reachable history, fully redacts findings and fails on discoveries. GITLEAKS_BIN can select a locally verified binary.

Install the opt-in hook with git config core.hooksPath .githooks. Use explicit git add paths and review git diff --cached. When deliberately publishing a new release, push validated source branches and use pull requests. Ordinary changes on the owner's server do not need to be copied to GitHub. No CI secrets or automatic SSH deployment.

CI runs unit/HTTP tests, strict TypeScript, build, npm audit, Gitleaks, Semgrep community SAST and Trivy image scanning. Actions have read-only contents permissions and pinned SHAs. Scheduled dependency-update PRs are disabled for the released 1.0 snapshot. These automated checks are limited and do not certify security.
