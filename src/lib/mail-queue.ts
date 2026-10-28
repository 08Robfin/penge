import {createCipheriv,createDecipheriv,createHash,randomBytes,randomUUID} from "node:crypto";
import type {Pool,PoolClient} from "pg";
import {db} from "./db";
import {deliverMail,MailDeliveryError,type OutgoingMail} from "./mail-transport";
function key(){const secret=process.env.BETTER_AUTH_SECRET;if(!secret)throw Error("Missing mail encryption key");return createHash("sha256").update("penge-mail-v1:"+secret).digest();}
export function sealMail(mail:OutgoingMail){const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key(),iv,{authTagLength:16}),data=Buffer.concat([cipher.update(JSON.stringify(mail),"utf8"),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString("base64");}
export function openMail(value:string):OutgoingMail{const data=Buffer.from(value,"base64"),decipher=createDecipheriv("aes-256-gcm",key(),data.subarray(0,12),{authTagLength:16});decipher.setAuthTag(data.subarray(12,28));return JSON.parse(Buffer.concat([decipher.update(data.subarray(28)),decipher.final()]).toString("utf8"));}
export async function enqueueMail(mail:OutgoingMail,refs:{kind:"invite"|"campaign"|"test"|"account";userId?:string;invitationId?:string;campaignId?:string;expiresAt?:Date},client:Pool|PoolClient=db){
 const id=randomUUID();
 await client.query("INSERT INTO email_outbox(id,user_id,invitation_id,campaign_id,kind,payload,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7)",[id,refs.userId??null,refs.invitationId??null,refs.campaignId??null,refs.kind,sealMail({...mail,from:process.env.MAIL_FROM}),refs.expiresAt??null]);
 return id;
}
export async function processMail(send:typeof deliverMail=deliverMail){
 const selected=await db.query(`WITH candidate AS (
 SELECT id FROM email_outbox WHERE
 (state='pending' AND available_at<=now()) OR (state='processing' AND locked_at<now()-interval '90 seconds')
 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
 UPDATE email_outbox e SET state='processing',locked_at=now(),attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()),updated_at=now()
 FROM candidate WHERE e.id=candidate.id RETURNING e.*`);
 const row=selected.rows[0];if(!row)return false;
 try{
  if(Date.now()-new Date(row.first_attempt_at).getTime()>23*3600000)throw new MailDeliveryError("retry_window_expired",false);
  if(row.expires_at&&new Date(row.expires_at).getTime()<=Date.now()){await db.query("UPDATE email_outbox SET state='cancelled',payload='',updated_at=now() WHERE id=$1",[row.id]);return true;}
  const mail=openMail(row.payload);
  if(row.kind==="invite"){
   const invitation=await db.query("SELECT 1 FROM invitation WHERE id=$1 AND used_at IS NULL AND expires_at>now()",[row.invitation_id]);
   if(!invitation.rowCount){await db.query("UPDATE email_outbox SET state='cancelled',payload='',updated_at=now() WHERE id=$1",[row.id]);return true;}
  }else if(row.kind==="account"){
   const eligible=await db.query('SELECT email FROM "user" u WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM disabled_account d WHERE d.user_id=u.id)',[row.user_id]);
   // A verification message may be addressed to a new email, but only for a live account.
   if(!eligible.rowCount){await db.query("UPDATE email_outbox SET state='cancelled',payload='',updated_at=now() WHERE id=$1",[row.id]);return true;}
  }else{
   const eligible=await db.query(`SELECT u.email FROM "user" u WHERE u.id=$1 AND NOT EXISTS(SELECT 1 FROM disabled_account d WHERE d.user_id=u.id)
    AND ($2='test' OR EXISTS(SELECT 1 FROM email_subscription s WHERE s.user_id=u.id AND s.enabled))
    AND EXISTS(SELECT 1 FROM email_campaign c WHERE c.id=$3 AND ($2='test' OR c.state='queued'))`,[row.user_id,row.kind,row.campaign_id]);
   if(!eligible.rowCount||eligible.rows[0].email.toLowerCase()!==mail.to.toLowerCase()){
    await db.query("UPDATE email_outbox SET state='cancelled',payload='',updated_at=now() WHERE id=$1",[row.id]);return true;
   }
  }
  const id=await send(mail,"penge/"+row.id);
  await db.query("UPDATE email_outbox SET state='submitted',provider_id=$2,payload='',error_code=NULL,updated_at=now() WHERE id=$1",[row.id,id]);
 }catch(error){
  const retry=error instanceof MailDeliveryError&&error.retryable&&row.attempts<8;
  const code=error instanceof MailDeliveryError?error.code:"queue_error";
  await db.query("UPDATE email_outbox SET state=$2,error_code=$3,available_at=now()+($4*interval '1 second'),updated_at=now() WHERE id=$1",[row.id,retry?"pending":"failed",code,Math.min(3600,30*2**row.attempts)]);
 }
 return true;
}
