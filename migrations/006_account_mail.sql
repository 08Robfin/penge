-- Additive change: preserves existing mail and every account/budget row.
ALTER TABLE email_outbox DROP CONSTRAINT email_outbox_kind_check;
ALTER TABLE email_outbox ADD CONSTRAINT email_outbox_kind_check CHECK(kind IN ('invite','campaign','test','account'));
ALTER TABLE email_outbox ADD COLUMN expires_at timestamptz;
