CREATE TABLE IF NOT EXISTS penge_migration (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS invitation (
 id uuid PRIMARY KEY, email text NOT NULL, token_hash text UNIQUE NOT NULL, expires_at timestamptz NOT NULL, used_at timestamptz
);
CREATE TABLE IF NOT EXISTS budget_record (
 id uuid PRIMARY KEY, user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 body jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,id)
);
CREATE INDEX IF NOT EXISTS budget_record_owner ON budget_record(user_id);
CREATE TABLE IF NOT EXISTS occurrence (
 user_id text NOT NULL, record_id uuid NOT NULL, date date NOT NULL, body jsonb NOT NULL,
 PRIMARY KEY(user_id,record_id,date), FOREIGN KEY(user_id,record_id) REFERENCES budget_record(user_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS reconciliation (
 user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, month text NOT NULL, body jsonb NOT NULL, PRIMARY KEY(user_id,month)
);
CREATE TABLE IF NOT EXISTS preference (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE, body jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS disabled_account (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS request_limit (
 key text PRIMARY KEY, count integer NOT NULL DEFAULT 1, expires_at timestamptz NOT NULL
);
