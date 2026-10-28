# Penge repository instructions

- Preserve accounts, budgets, subscriptions, invitations and preferences. Never reset/restore production as a test.
- For the owner's installation, keep source/build work on the configured server. Inspect actual checkout, private deployment config, current health and repository instructions first.
- Never print, commit or upload .env, credentials, raw exports, private recovery keys, user information, financial screenshots or generated builds. Keep token-bearing URLs out of logs.
- This repository is PUBLIC by explicit owner request. Never publish production data/configuration. Do not change visibility or select a license without explicit owner approval. Never rewrite remote history or force-push main.
- Use feature branches/PRs. Stage explicit reviewed paths. Run scripts/scan-secrets.sh (index and all history), npm test, npm run typecheck, dependency audit and relevant isolated integration/browser checks before pushing.
- Use Node 24 containers if the host differs. Test source copies must exclude production .env/data. Only synthetic users, independent secrets, fake email and disposable penge_test databases are permitted. Preserve test target guards.
- Update README/docs, CHANGELOG.md and meaningful regression tests when behavior or configuration changes.
- GitHub synchronization and production deployment are separate. No blind push-everything job, automatic deployment or production CI secrets.
- Deployment requires a restorable private backup, source/image rollback references, controlled migrations and post-deployment verification. Never alter unrelated apps/services or run global Docker prune.
- Root Compose creates an independent instance. Existing production may use ignored compose.production.yml via COMPOSE_FILE in private .env. Do not accidentally switch its database volume.
- Opt-in pre-push hook: git config core.hooksPath .githooks. Hooks/CI do not replace manual review.
- If interrupted or usage-limited, save a private checkpoint with completed work, evidence and remaining actions. Do not report incomplete work as done.

If deploy/private/WORKFLOW.md exists, read it for private source/deployment mapping and keep it out of GitHub. Treat the canonical source checkout and running installation as separate operations.
