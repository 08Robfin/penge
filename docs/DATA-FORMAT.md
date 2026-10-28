# Export schema 2
The exact contract is `exportSchema` in `src/lib/schema.ts`. JSON uses ISO dates, UUID references and integer øre.

```json
{"schemaVersion":2,"records":[],"occurrences":[],"reconciliations":[],"settings":{"theme":"system","defaultView":"overview"}}
```

Records have id, kind, title, amount, start, optional end, frequency (monthly/weekly/once), interval, rates [{from,amount}], category and notes. Kinds: income, expense, subscription, saving, account, plan, oneoff, adjustment, loan. Account-related records use accountId. Accounts may have goalAmount/target; adjustments use credit/debit direction. Plans use target/reserved/strategy/reserveMonth/schedule/priority/state/settledMonth/actual. Read schema defaults before hand-authoring JSON.

Occurrences have recordId/date/status, optional expected/actual/paidDate and notes. Reconciliations have month, signed amount, mode (carry/balance) and reserved. Settings have theme and defaultView. Auth data, owner IDs, invitations, passwords and sessions are excluded.

## Import
Preview and save use the same schema/reference checks. Unknown fields are rejected. IDs in imports are local references only: replacement generates fresh server IDs and remaps all owned relationships, so imported IDs cannot claim someone else's records. Duplicate record IDs, occurrence keys, reconciliation months and broken account references are rejected.

Full JSON/table save replaces all of the current user's financial records atomically. Download a backup first. It requires typing ERSTATT. Review all dates and amounts. Concurrent editors do not merge drafts: the last confirmed replacement wins; refresh and export before large edits.

## CSV
UTF-8 CSV supports comma/semicolon delimiters, Norwegian months with a chosen year, YYYY-MM and YYYY-MM-DD. Map one month column; map other columns to income, expense, savings, leftover or ignore. Export spreadsheets as CSV with Norwegian numbers and review delimiter/quoting.

Choose either Netto utbetalt or the separate Lønn + Barnepensjon columns as income. Never include both. Alt Annet is a prior leftover estimate, not an expenditure, and is deliberately not imported as spending. Import creates one-time monthly definitions and an imported savings account when required. It does not infer cell colors or paid status. Confirm those manually afterward.

Rows are previewed, existing matching kind/title/date rows are rejected, and saving requires confirmation. Renamed columns can evade duplicate detection; review the preview and keep an export before importing. Native XLSX parsing is not supported.

## Paycheck schema 2
Version-1 input is upgraded to version 2 with empty explicit carry settings. settings.budgetIncomeId optionally selects an owned recurring income; settings.periodCarry contains unique {start,amount} entries for explicitly carried funds into one exact payday. Loan records use amount as the recurring minimum payment. loanBalance (integer øre) is optional; loanAsOf (ISO date) is required if that balance is supplied. Unknown debt is not treated as a zero balance. Plans may record settledDate within their plan period. Existing records and historical reconciliations remain intact.
