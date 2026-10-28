# Full-screen onboarding
New accounts with no budget open a full-screen walkthrough immediately after registration/sign-in. Existing users with budget records are marked complete by migration 003 and keep their budgets.

Each screen asks for one thing: income name, net amount, next payday and recurrence. Fixed payments are optional and added one at a time using name, amount/minimum loan payment, due date and recurrence. Savings are optional. A final review shows the first paycheck budget before anything is committed.

Progress is stored privately in onboarding_state, scoped to the authenticated user. It is not stored in browser localStorage. Saved steps resume on refresh. Revision checks prevent stale windows overwriting progress. Ownership fields are not accepted from clients. Drafts are validated, capped in size/count and cleared on completion.

Final confirmation uses a database transaction and locks the account. Income, payments, savings account/transfer and payroll settings are created atomically. Repeated completion is idempotent. Setup never overwrites existing records. Explicitly active setup blocks conflicting normal financial writes until completion.

The dashboard now shows the period, free-to-spend balance and upcoming payments. Detailed allocation stays in Fordeling; optional carry stays in settings; help is collapsed. Unknown loan balance is optional and displayed as not entered rather than 0.

## Operator budget reset
Only use on an explicitly authorized account, never as part of normal deployment:
docker compose --profile tools run --rm -e ALLOW_ACCOUNT_RESET=yes tools exec -- tsx scripts/reset-budget.ts ACCOUNT_EMAIL

This clears only that account's budget definitions (and cascading occurrences), reconciliations, payroll/carry settings and walkthrough draft. It resets the walkthrough to welcome. It preserves login credentials, name/email, sessions, administrator grants, invitations and every other account. Theme is retained. No public reset endpoint is provided.

Verification includes unit and HTTP tests, full Chromium/iPhone walkthroughs, saved progress/back navigation, optional-step skipping, no early financial writes, final confirmation, repeat-submit protection, account isolation, WebKit rendering and accessibility checks.

## Selective motion
Step changes use a 320ms directional fade/slide via the browser Web Animations API. Back uses the opposite direction. Typing does not restart it. Segment fills animate within each milestone; the welcome illustration settles once; radios and buttons have restrained interaction feedback. Loading indication is tied to actual requests. Reduced-motion preferences disable step animations and CSS motion. Mobile horizontal clipping prevents a transient side scroll during entrances. No new library, financial/schema change or account reset is involved.
