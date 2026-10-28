# Penge repository instructions

- Penge is public and MIT-licensed. Preserve applicable copyright/license notices. Do not change license or visibility without explicit owner authorization.
- Never print, commit or upload credentials, private configuration, database dumps, real user data, recovery keys, token URLs or generated build directories.
- Preserve existing accounts and budgets. Read operator-provided private deployment notes before changing a running installation; never publish those notes.
- Use source branches and pull requests. Stage explicit reviewed files, run scripts/scan-secrets.sh, tests, strict typechecking, dependency audit and relevant isolated integration/browser checks before push.
- Use Node 24. The pre-push hook can validate a clean committed snapshot in Docker when the host runtime differs.
- Tests use synthetic data, independent credentials, fake email and explicitly disposable penge_test databases. Never mount production configuration/data in test containers.
- Keep runtime database privileges separate from migration credentials. Add only reviewed grants required by new tables; never give the runtime role schema creation, superuser or administrator-membership mutation rights.
- Preserve the compiled production-only worker target. Administrative containers are one-shot tools, not runtime workers.
- Do not introduce partial RLS policies or pooled-connection session variables without a complete transaction-scoped design and isolation regressions.
- Update documentation, CHANGELOG and meaningful regression tests when behavior/configuration changes.
- CI never receives production credentials or deploys automatically. Deployment is separate, with a verified backup, rollback images/source, controlled migration and post-deployment checks.
- Never alter unrelated applications/services or run global Docker prune. Never reset/restore production as a test or rotate existing production secrets without explicit authorization.
- If interrupted, save a private checkpoint with completed work, evidence and remaining actions.
