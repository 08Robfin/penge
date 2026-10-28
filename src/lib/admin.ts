import {emailPreference} from "./mail-preferences";
import {enqueueMail} from "./mail-queue";
import {emailTemplate,invitationContent} from "./email-templates";
import {mailConfigured} from "./mail-transport";
import { db } from "./db";
import { HttpError } from "./store";
import { randomBytes,randomUUID,createHash } from "node:crypto";
import { verify } from "@node-rs/argon2";
import { z } from "zod";
export const adminInput=z.discriminatedUnion("action",[
 z.object({action:z.literal("newsletter"),userId:z.string().min(1).max(128),enabled:z.boolean()}).strict(),
 z.object({action:z.literal("invite"),email:z.email().max(254)}).strict(),
 z.object({action:z.literal("revoke"),invitationId:z.uuid()}).strict(),
 z.object({action:z.literal("disable"),userId:z.string().min(1).max(128)}).strict(),
 z.object({action:z.literal("enable"),userId:z.string().min(1).max(128)}).strict(),
 z.object({action:z.literal("delete"),userId:z.string().min(1).max(128),confirmation:z.string().max(254),password:z.string().min(1).max(128)}).strict()
]);
export async function isAdmin(id:string){return !!(await db.query("SELECT 1 FROM app_admin WHERE user_id=$1",[id])).rowCount;}
export async function adminSnapshot(){
 const [users,invitations]=await Promise.all([
 db.query('SELECT u.id,u.name,u.email,u."createdAt" AS created_at,(a.user_id IS NOT NULL) AS is_admin,(d.user_id IS NOT NULL) AS disabled,coalesce(s.enabled,true) AS newsletter_enabled FROM "user" u LEFT JOIN app_admin a ON a.user_id=u.id LEFT JOIN disabled_account d ON d.user_id=u.id LEFT JOIN email_subscription s ON s.user_id=u.id ORDER BY u."createdAt"'),
 db.query("SELECT i.id,i.email,i.expires_at,(SELECT o.state FROM email_outbox o WHERE o.invitation_id=i.id ORDER BY o.created_at DESC LIMIT 1) AS mail_status FROM invitation i WHERE i.used_at IS NULL AND i.expires_at>now() ORDER BY i.expires_at DESC")
 ]);
 return {users:users.rows,invitations:invitations.rows};
}
export async function adminAction(actorId:string,raw:unknown){
 const input=adminInput.parse(raw),client=await db.connect();
 try{
 await client.query("BEGIN");
 // Recheck privileges inside the same transaction as the mutation.
 const admin=await client.query('SELECT a.user_id FROM app_admin a WHERE a.user_id=$1 AND NOT EXISTS(SELECT 1 FROM disabled_account d WHERE d.user_id=a.user_id) FOR SHARE',[actorId]);
 if(!admin.rowCount)throw new HttpError(403,"Kun administrator har tilgang");
 let target="",result:Record<string,unknown>={ok:true};
 if(input.action==="invite"){
 const email=input.email.trim().toLowerCase();target=email;
 if((await client.query('SELECT 1 FROM "user" WHERE lower(email)=$1',[email])).rowCount)throw new HttpError(409,"Denne e-postadressen har allerede en konto");
 await client.query("UPDATE invitation SET used_at=now() WHERE lower(email)=$1 AND used_at IS NULL",[email]);
 const token=randomBytes(32).toString("base64url"),id=randomUUID();
 const saved=await client.query("INSERT INTO invitation(id,email,token_hash,expires_at) VALUES($1,$2,$3,now()+interval '7 days') RETURNING expires_at",[id,email,createHash("sha256").update(token).digest("hex")]);
 const url=(process.env.BETTER_AUTH_URL??"http://localhost:3000")+"/?invite="+token+"&email="+encodeURIComponent(email);
 if(mailConfigured()){
 const content=invitationContent(url);
 await enqueueMail({to:email,subject:content.subject,...emailTemplate(content)},{kind:"invite",invitationId:id},client);
 }
 result={id,email,expiresAt:saved.rows[0].expires_at,url,delivery:mailConfigured()?"queued":"not_configured"};
 }else if(input.action==="revoke"){
 target=input.invitationId;
 const revoked=await client.query("UPDATE invitation SET used_at=now() WHERE id=$1 AND used_at IS NULL RETURNING id",[target]);
 if(!revoked.rowCount)throw new HttpError(404,"Invitasjonen finnes ikke eller er allerede brukt");
 }else if(input.action==="newsletter"){
 target=input.userId;
 if(!(await client.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE',[target])).rowCount)throw new HttpError(404,"Brukeren finnes ikke");
 await emailPreference(target,client);
 await client.query("UPDATE email_subscription SET enabled=$2,updated_at=now() WHERE user_id=$1",[target,input.enabled]);
 result={ok:true,newsletter_enabled:input.enabled};
 }else{
 target=input.userId;
 if(target===actorId)throw new HttpError(409,"Du kan ikke fjerne eller deaktivere din egen administratorkonto");
 // Lock role changes along with target-account changes.
 await client.query("SELECT pg_advisory_xact_lock(742194)");
 const user=await client.query('SELECT id,email FROM "user" WHERE id=$1 FOR UPDATE',[target]);
 if(!user.rowCount)throw new HttpError(404,"Brukeren finnes ikke");
 if((await client.query("SELECT 1 FROM app_admin WHERE user_id=$1",[target])).rowCount)throw new HttpError(409,"Administratorkontoer er beskyttet");
 if(input.action==="disable"){
 await client.query("INSERT INTO disabled_account(user_id) VALUES($1) ON CONFLICT DO NOTHING",[target]);
 await client.query('DELETE FROM session WHERE "userId"=$1',[target]);
 }else if(input.action==="enable"){
 await client.query("DELETE FROM disabled_account WHERE user_id=$1",[target]);
 }else{
 if(input.confirmation.trim().toLowerCase()!==user.rows[0].email.toLowerCase())throw new HttpError(400,"Bekreft ved å skrive brukerens e-postadresse");
 const credential=await client.query('SELECT password FROM account WHERE "userId"=$1 AND "providerId"=$2',[actorId,"credential"]);
 if(!credential.rowCount||!(await verify(credential.rows[0].password,input.password)))throw new HttpError(403,"Administratorpassordet er feil");
 await client.query("UPDATE invitation SET used_at=now() WHERE lower(email)=lower($1) AND used_at IS NULL",[user.rows[0].email]);
 await client.query('DELETE FROM "user" WHERE id=$1',[target]);
 }
 }
 await client.query("INSERT INTO admin_event(id,actor_id,action,target) VALUES($1,$2,$3,$4)",[randomUUID(),actorId,input.action==="newsletter"?(input.enabled?"newsletter_on":"newsletter_off"):input.action,target]);
 await client.query("COMMIT");return result;
 }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
}
