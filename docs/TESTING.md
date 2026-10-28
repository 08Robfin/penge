# Testing

See DEVELOPMENT.md for isolated configuration. Unit tests cover money/date/recurrence/paycheck calculations, imports/schemas, Markdown escaping, queue encryption and runtime configuration.

HTTP tests cover invitations/login/logout, password changes/resets, verified email changes, cross-account IDOR, SQL-like literal input, budget/payment/loan persistence, onboarding, admin permissions, preferences/unsubscribe and mail retries. Regressions cover failed/concurrent invitations, hashed/single-use reset tokens, encrypted/expiring account mail and redirect/body validation.

Browser suites use pinned Playwright and synthetic users. WebKit approximates iPhone rendering; physical Home Screen installation still requires device verification. Choose meaningful tests relevant to changes.

Restore verification uses a NEW isolated database and private comparisons. Never run destructive/adversarial suites against real accounts, even in a restored backup. Screenshots/reports stay in ignored work/. Remove only explicitly named disposable resources; never prune shared Docker resources.
