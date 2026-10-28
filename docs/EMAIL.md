# Email

Configure Resend or SMTP plus a verified MAIL_FROM in private environment configuration. Prefer a sending-only Resend key restricted to your verified domain. SMTP should use authenticated TLS according to your provider's documentation.

Account reset/verification, invitations and newsletters use an AES-256-GCM encrypted PostgreSQL outbox. A single worker holds an advisory lock, retries bounded transient errors, reuses stable provider idempotency keys and clears submitted/cancelled payloads. Account mail expires after 55 minutes, before one-hour reset tokens. The worker checks account/invitation eligibility and newsletter membership before sending.

Submitted means provider acceptance, not inbox delivery. SMTP may duplicate a message after an ambiguous connection failure. Bounce/complaint webhooks and automatic suppression are not implemented.

## Setup

Set RESEND_API_KEY or SMTP_URL and MAIL_FROM. Keep mail-worker running. Test from the admin screen with your mailbox before campaigning. Automated tests must use a fake sink and no real provider keys.

Configure SPF, DKIM and DMARC with the provider. Never add a second SPF record at the same name. Verify authentication/alignment in an actual delivered message; DNS alone is insufficient.

## Newsletters

Save and preview a draft, optionally send a self-test, then confirm sending. Markdown supports headings, bold, italic, strikethrough, lists, quotes, code, tables and safe links. A token allowlist emits fixed email-safe styles; raw HTML is escaped, images become alt text and unsafe protocols are rejected. A text fallback is included.

Messages include privacy/operator credit and unsubscribe links, without a tracking pixel. Disable provider click/open tracking where possible. Membership currently defaults on and stored opt-outs persist. Users manage it in Settings; admins can also change membership.

GET unsubscribe never changes preferences. POST is an intentionally unauthenticated bearer action affecting only the linked subscription. Operators are responsible for consent, sender identification, unsubscribe and privacy obligations. Current default membership is not a legal compliance claim.

## Sensitive data

Keep recipients, encrypted queue payloads, provider keys and token URLs out of logs/issues. Queue history expires after 30 days; failed payloads remain encrypted until then. Protect database and auth secret in recovery planning. Reset request responses do not reveal account existence or provider availability; delivery happens asynchronously.
