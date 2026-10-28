import { randomBytes,randomUUID,createHash } from "node:crypto";
import { db } from "../src/lib/db";
const [command,value]=process.argv.slice(2);
try{
 if(command==="grant-admin"&&value){
 const found=await db.query('INSERT INTO app_admin(user_id) SELECT id FROM "user" WHERE lower(email)=lower($1) ON CONFLICT DO NOTHING RETURNING user_id',[value]);
 console.log(found.rowCount?"Administrator access granted":"No change: account missing or already administrator");
 }else if(command==="invite"&&value&&/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)){
 const token=randomBytes(32).toString("base64url");
 await db.query("INSERT INTO invitation(id,email,token_hash,expires_at) VALUES($1,$2,$3,now()+interval '7 days')",[randomUUID(),value.toLowerCase(),createHash("sha256").update(token).digest("hex")]);
 console.log("Invite (share privately): "+process.env.BETTER_AUTH_URL+"/?invite="+token+"&email="+encodeURIComponent(value));
 }else if(command==="revoke"&&value){
 await db.query("UPDATE invitation SET used_at=now() WHERE lower(email)=lower($1) AND used_at IS NULL",[value]);console.log("Invitations revoked");
 }else if(command==="disable"&&value){
 await db.query('INSERT INTO disabled_account(user_id) SELECT id FROM "user" WHERE lower(email)=lower($1) ON CONFLICT DO NOTHING',[value]);
 await db.query('DELETE FROM session WHERE "userId" IN (SELECT id FROM "user" WHERE lower(email)=lower($1))',[value]);console.log("Account disabled");
 }else if(command==="health"){
 const r=await db.query('SELECT (SELECT count(*) FROM "user") accounts,(SELECT count(*) FROM session) sessions');console.log(r.rows[0]);
 }else{console.error("Usage: admin invite|revoke|disable|grant-admin EMAIL / health");process.exitCode=1;}
}finally{await db.end();}
