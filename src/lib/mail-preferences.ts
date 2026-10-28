import {randomBytes} from "node:crypto";
import type {Pool,PoolClient} from "pg";
import {db} from "./db";
export async function emailPreference(userId:string,client:Pool|PoolClient=db){
 const row=await client.query("INSERT INTO email_subscription(user_id,token) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET user_id=excluded.user_id RETURNING enabled,token",[userId,randomBytes(32).toString("base64url")]);
 return row.rows[0] as {enabled:boolean;token:string};
}

export async function ensureDefaultSubscriptions(client:Pool|PoolClient=db){
 await client.query(`INSERT INTO email_subscription(user_id,enabled,token)
 SELECT u.id,true,rtrim(translate(encode(decode(replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),'hex'),'base64'),'+/','-_'),'=')
 FROM "user" u WHERE NOT EXISTS(SELECT 1 FROM email_subscription s WHERE s.user_id=u.id)
 ON CONFLICT(user_id) DO NOTHING`);
}
