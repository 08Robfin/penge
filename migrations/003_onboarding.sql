CREATE TABLE onboarding_state (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 step text NOT NULL DEFAULT 'welcome',
 draft jsonb NOT NULL DEFAULT '{}',
 completed boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO onboarding_state(user_id,step,completed)
SELECT DISTINCT user_id,'review',true FROM budget_record
ON CONFLICT DO NOTHING;
