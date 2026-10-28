import {validateRuntimeConfig} from "./runtime-config.cjs";
import {getMigrations} from "better-auth/db/migration";
import {auth} from "../src/lib/auth";
import {db} from "../src/lib/db";
import {readFile,readdir} from "node:fs/promises";
validateRuntimeConfig();
await (await getMigrations(auth.options)).runMigrations();
const client=await db.connect();
try{
 await client.query("BEGIN");
 await client.query("SELECT pg_advisory_xact_lock(742193)");
 await client.query("CREATE TABLE IF NOT EXISTS penge_migration (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
 const directory=new URL("../migrations/",import.meta.url);
 for(const file of (await readdir(directory)).filter(f=>/^\d+_[a-z_]+\.sql$/.test(f)).sort()){
 const name=file.slice(0,-4);
 if(!(await client.query("SELECT 1 FROM penge_migration WHERE name=$1",[name])).rowCount){
 await client.query(await readFile(new URL(file,directory),"utf8"));
 await client.query("INSERT INTO penge_migration(name) VALUES($1)",[name]);
 }
 }
 await client.query("COMMIT");console.log("Penge migrations complete");
}catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();await db.end();}
