ALTER TABLE email_subscription ALTER COLUMN enabled SET DEFAULT true;
-- Preserve every stored off preference; historical defaults and explicit opt-outs
-- cannot be distinguished retrospectively.
INSERT INTO email_subscription(user_id,enabled,token)
SELECT u.id,true,rtrim(translate(encode(decode(replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),'hex'),'base64'),'+/','-_'),'=')
FROM "user" u WHERE NOT EXISTS(SELECT 1 FROM email_subscription s WHERE s.user_id=u.id)
ON CONFLICT(user_id) DO NOTHING;
