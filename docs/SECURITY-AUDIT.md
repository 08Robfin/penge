# Testing and limitations — Penge 1.0

Penge is a hobby project. Testing has been limited to internal reviews, automated checks and a few installation/use checks. It has **not** had a professional security audit or an independent penetration test. It may contain serious bugs or vulnerabilities. We do not guarantee security, correctness, availability or suitability for your data. Use it at your own risk; see the MIT license.

## Checks performed for 1.0

The release checks included unit and HTTP tests for accounts, password recovery, invitations, account separation, budgets, administration and email; type/build checks; dependency, secret-pattern, static-source and container-image scans; and synthetic installation/backup-restore checks. Runtime database permissions and the compiled mail worker were also exercised. Screenshots use demo data.

These checks can miss vulnerabilities, compromised dependencies, deployment mistakes and future problems. A passing check is not proof of security. This document is a first-party summary, not an assurance report.

## Known boundaries

- Financial access relies on application ownership checks. PostgreSQL row-level security is not implemented.
- Infrastructure administrators can access stored data. The app is not a bank or financial service.
- Rate limits do not protect against large-scale denial of service.
- Email-provider acceptance does not prove delivery. Bounce/complaint webhooks and automatic suppression are not implemented; ambiguous SMTP retries may duplicate messages.
- Newsletters default on. Operators must decide whether their consent/privacy arrangements are appropriate.
- Automated browser checks do not replace testing on real devices.
- Installation-specific HTTPS, credentials, privacy notices and recoverable backups are the operator's responsibility. An existing VM/NAS backup system is separate from the optional app backup scripts.

## Release scope

GitHub contains the released 1.0 snapshot. The author's server may change separately; there is no promise of ongoing updates or support. No production credentials or database are distributed with the source.

If you find a vulnerability, you can contact the owner through [GitHub's private reporting form](https://github.com/08Robfin/penge/security/advisories/new). Do not post real credentials or user data publicly.
