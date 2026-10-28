CREATE TABLE app_admin (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 granted_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE admin_event (
 id uuid PRIMARY KEY,
 actor_id text REFERENCES "user"(id) ON DELETE SET NULL,
 action text NOT NULL,
 target text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_event_created ON admin_event(created_at);
