# Security assessment — 28 October 2026

This is a first-party source/deployment assessment, not an independent audit or a guarantee of security. The scope is Penge, its database, mail delivery and dedicated proxy configuration. Unrelated server applications, router/firewall forwarding and physical infrastructure are outside scope.

## Confirmed findings and fixes

| Finding | Severity / practical impact | Resolution |
| --- | --- | --- |
| Resend-only password recovery blocked by SMTP-only gate | Medium: configured users could not recover accounts | Shared provider-configuration check; regression coverage |
| Verification identifiers stored plaintext by library default | Medium: database read access could expose active reset capabilities | Supported hashed identifier storage for new tokens; legacy-compatible consumption, one-hour expiry and single-use tests |
| Failed signup consumed invitation before validation | Medium: valid invite could become unusable | Locked invitation row during registration; consume only on successful response; concurrent/failed-registration tests |
| Disabled accounts returned a distinct login error before password hashing | Medium: account-status enumeration | Block session creation after password verification with the standard generic error; regression test |
| Synchronous account delivery could reveal provider failure only for known accounts | Medium: enumeration and reliability | Encrypted account-mail queue; identical reset responses; 55-minute expiry, active-account checks and bounded retries |
| Proxy request logging included bearer URLs | Medium: invitation/reset/unsubscribe capabilities in logs | Disable request logging for dedicated app host; restrict previous logs and use no-referrer policy |
| GCM tag size implicit | Low defense-in-depth: cipher policy not explicit | Explicit 16-byte authentication tag; authenticated-tamper regression coverage |
| Runtime image included vulnerable npm dependencies | High-rated upstream packages, with limited reachability because app does not execute npm for requests | Remove unused runtime package managers; update build npm; rescan runtime image |
| No active backup schedule/off-server recovery | Medium operational data-loss risk | Encrypted daily backup enabled on reviewed installation; separate restoration verified. Off-server key/archive copy still required |
| Unbounded container logs | Low operational disk exhaustion | Bounded JSON rotation in reusable/private deployment configuration |
| Distribution contained installation-specific defaults/history | Release/privacy blocker | Independent defaults, configurable operator credit, sanitized source snapshot and clean initial GitHub history |
| Tests could be pointed at arbitrary databases | High operational misuse risk, not a public exploit | Loopback/disposable-database guards; no production configuration in test containers |

## Existing controls verified

- Argon2id password hashing: 64 MiB, three passes, one lane; no password hash in financial exports.
- Better Auth database sessions with HttpOnly/SameSite cookies and Secure on HTTPS; logout/reset invalidate sessions. Email changes require current password and verification.
- Invite-only registration bound to email and a random SHA-256-hashed capability, expiring after seven days.
- Financial queries scoped to authenticated ownership, composite foreign keys for payment ownership, owned savings references and regenerated import IDs. PostgreSQL RLS is not the authorization boundary.
- Strict Zod payloads, parameterized SQL, bounded streamed JSON, exact Origin checks and generic unexpected-error responses.
- Nonce CSP, frame denial, no-referrer, nosniff and HTTPS HSTS. Inline CSS remains necessary for the current UI/chart library.
- No generic URL-fetch/file/command-execution API. Mail transport destination is fixed/provider configured by the operator; public payloads cannot choose server-side hosts.
- Markdown email emits an explicit safe token allowlist; raw HTML/images/unsafe protocols are not rendered. Preview is sandboxed; newsletters have scoped bearer unsubscribe.
- Internal database network without published database ports, project volume persistence, nonroot/read-only app, dropped capabilities, temporary /tmp and resource limits.
- Service worker caches named static icons only; no financial/authentication responses.

## Evidence

- 59 unit tests, strict TypeScript and production build pass.
- 80 HTTP test assertions/subtests pass across auth/IDOR/admin/paycheck/onboarding/mail/security suites using synthetic users and isolated credentials.
- Failed/concurrent invitations, reset single-use/concurrent consumption, encrypted/expired account mail and disabled-account enumeration have dedicated regressions.
- Fresh Compose installation completes migrations and signup/login/save/logout smoke checks. Synthetic records survive database/app/worker restart.
- Documented fresh-install encrypted backup restores to a new network-isolated database with matching contents. A private pre-change production backup was also restored and eight account/financial/mail tables compared successfully.
- Gitleaks 8.30.1 verified by release SHA-256: original reachable history and sanitized source have zero findings. Actual configured production secrets and user identities have zero matches in the sanitized source; private/generated files are excluded.
- npm audit reports no application dependency vulnerabilities.
- Runtime Trivy 0.76.1 scan reports zero known fixable vulnerabilities after removal of unnecessary runtime npm and timezone update. Unfixed advisories are excluded by this gate and remain an operator monitoring responsibility.
- Community Semgrep security/OWASP rule packs run on maintained source; generated dependencies/builds are excluded. Any parser limitation must be recorded rather than treated as a clean result.
- GitHub CI result and production deployment checks are recorded separately after execution.

## Remaining risks and manual decisions

1. Off-server backups and recovery-identity custody are not complete. Same-server backups cannot protect against server/disk loss or full host compromise.
2. Private repository visibility must remain unchanged until owner approval. License selection is explicitly deferred.
3. A dedicated public security/privacy contact and installation-specific privacy notice are required before release.
4. Default-on newsletters require operator review of applicable consent rules. No legal compliance claim is made.
5. Provider acceptance is not inbox delivery. Bounce/complaint webhooks and automatic suppression are absent; SMTP retries may duplicate a message after ambiguous acceptance.
6. Per-email/global throttling helps small installations but is not volumetric DDoS protection. Infrastructure administrators and Docker-group members retain database access.
7. Old restricted proxy logs/backups can retain private historical material until their retention/cleanup policy expires. They are not exported.
8. Dependency scanners, static rules and automated WebKit do not prove absence of vulnerabilities or replace physical-device/independent penetration testing.
9. Branch-protection enforcement depends on the GitHub account plan; record any API restriction transparently.
10. Never restore backups or rotate production secrets without coordinated recovery/rollback planning.

## Public release checklist

| Requirement | Status |
| --- | --- |
| Independent source/configuration/data separation | Complete |
| Sanitized source and original history review | Complete |
| Private repository | Created; source/CI status verified separately |
| Reproducible installation, migration, restart and restore | Tested |
| Security regressions and documentation | Complete |
| CI and dependency proposals | Prepared; actual run must pass before release |
| Production preservation / controlled rollout | Must be confirmed after deployment |
| Off-server archive and recovery key | Manual follow-up |
| License | Owner deferred |
| Public security/privacy contact and consent review | Manual review |
| Independent security assessment | Not performed |
| Make repository public | Not authorized |

## References

- https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- https://better-auth.com/docs/reference/security
- https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
- https://docs.npmjs.com/files/package-lock.json/
- https://nextjs.org/docs/pages/guides/environment-variables
