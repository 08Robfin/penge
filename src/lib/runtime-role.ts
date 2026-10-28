import {escapeLiteral,type PoolClient} from "pg";

const marker="Penge application runtime role v1";
export async function configureRuntimeRole(client:PoolClient,password=process.env.APP_DATABASE_PASSWORD){
 if(!password)return false; // Legacy installations opt in through a planned deployment.
 if(password.length<32||/generate-|replace-/i.test(password))throw Error("Generate an independent runtime database password.");
 const role=await client.query("SELECT oid,shobj_description(oid,'pg_authid') AS description FROM pg_roles WHERE rolname='penge_runtime'");
 if(role.rowCount&&role.rows[0].description!==marker)throw Error("Runtime role name is already in use; refusing to change an unrelated role.");
 if(!role.rowCount){
  await client.query("CREATE ROLE penge_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS");
  await client.query("COMMENT ON ROLE penge_runtime IS 'Penge application runtime role v1'");
 }
 await client.query("ALTER ROLE penge_runtime WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD "+escapeLiteral(password));
 await client.query("REVOKE ALL ON SCHEMA public FROM penge_runtime");
 await client.query("GRANT USAGE ON SCHEMA public TO penge_runtime");
 await client.query("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM penge_runtime");
 await client.query('GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE "user",session,account,verification,"rateLimit",invitation,budget_record,occurrence,reconciliation,preference,disabled_account,request_limit,onboarding_state,email_subscription,email_campaign,email_outbox TO penge_runtime');
 await client.query("GRANT SELECT ON app_admin TO penge_runtime");
 // PostgreSQL row locks require UPDATE on at least one column; grant only the
 // non-authorizing timestamp, never user_id or INSERT/DELETE on role grants.
 await client.query("GRANT UPDATE(granted_at) ON app_admin TO penge_runtime");
 await client.query("GRANT SELECT,INSERT ON admin_event TO penge_runtime");
 await client.query("GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO penge_runtime");
 await client.query("ALTER ROLE penge_runtime SET search_path=public");
 return true;
}
