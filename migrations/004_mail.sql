CREATE TABLE email_subscription(
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 enabled boolean NOT NULL DEFAULT false,
 token text NOT NULL UNIQUE,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE email_campaign(
 id uuid PRIMARY KEY,
 actor_id text REFERENCES "user"(id) ON DELETE SET NULL,
 subject text NOT NULL,
 title text NOT NULL,
 body text NOT NULL,
 template text NOT NULL CHECK(template IN ('news','announcement')),
 revision integer NOT NULL DEFAULT 0,
 state text NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','queued','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE email_outbox(
 id uuid PRIMARY KEY,
 user_id text REFERENCES "user"(id) ON DELETE CASCADE,
 invitation_id uuid REFERENCES invitation(id) ON DELETE CASCADE,
 campaign_id uuid REFERENCES email_campaign(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('invite','campaign','test')),
 payload text NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','submitted','failed','cancelled')),
 attempts integer NOT NULL DEFAULT 0,
 available_at timestamptz NOT NULL DEFAULT now(),
 first_attempt_at timestamptz,
 locked_at timestamptz,
 provider_id text,
 error_code text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_outbox_pending ON email_outbox(available_at) WHERE state IN ('pending','processing');
CREATE UNIQUE INDEX email_campaign_recipient ON email_outbox(campaign_id,user_id) WHERE kind='campaign';
