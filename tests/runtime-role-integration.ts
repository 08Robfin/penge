import {test} from "node:test";
import assert from "node:assert/strict";
import {Pool} from "pg";
import {assertTestEnvironment} from "./test-environment";
assertTestEnvironment();
assert(process.env.RUNTIME_DATABASE_URL,"Tests must exercise the restricted runtime role");
const runtime=new Pool({connectionString:process.env.RUNTIME_DATABASE_URL});
await test("runtime database role cannot administer schema, server files or administrator identities",async t=>{
 await t.test("role has no server administration or RLS bypass",async()=>{
  const row=(await runtime.query("SELECT current_user,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=current_user")).rows[0];
  assert.equal(row.current_user,"penge_runtime");
  for(const key of ["rolsuper","rolcreatedb","rolcreaterole","rolreplication","rolbypassrls"])assert.equal(row[key],false);
  for(const role of ["pg_execute_server_program","pg_read_server_files","pg_write_server_files"])assert.equal((await runtime.query("SELECT pg_has_role(current_user,$1,'MEMBER') AS allowed",[role])).rows[0].allowed,false);
 });
 await t.test("persistent schema changes are denied",async()=>{await assert.rejects(runtime.query("CREATE TABLE public.runtime_must_not_create(id int)"),(e:any)=>e.code==="42501");});
 await t.test("administrator membership cannot be inserted, deleted or reassigned",async()=>{
  for(const sql of ["DELETE FROM app_admin WHERE false","UPDATE app_admin SET user_id=user_id WHERE false","INSERT INTO app_admin(user_id) SELECT id FROM \"user\" WHERE false"])await assert.rejects(runtime.query(sql),(e:any)=>e.code==="42501");
 });
 await t.test("migration ledger cannot be modified",async()=>{await assert.rejects(runtime.query("DELETE FROM penge_migration WHERE false"),(e:any)=>e.code==="42501");});
});
await runtime.end();
