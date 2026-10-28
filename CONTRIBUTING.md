# Contributing

Penge is MIT-licensed. Contributions are made under the same MIT license; retain applicable copyright and license notices.

Use focused feature branches and pull requests. Follow AGENTS.md. Update documentation and meaningful regression tests when behavior changes. Use synthetic examples/screenshots only.

Node 24 and PostgreSQL 17 are supported. Never use production credentials/accounts/volumes/provider keys in tests. Integration/browser tests refuse non-test targets.

Run npm ci, npm test, npm run typecheck, npm audit, Gitleaks and relevant isolated HTTP/browser checks. CI also runs SAST/container scans. Investigate findings instead of weakening checks. Document narrowly justified false positives.

Stage explicit paths, review the staged diff and use meaningful commits. Push validated changes to the repository. CI does not deploy; the operator separately backs up and deploys reviewed code.
