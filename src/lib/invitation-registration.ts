import {createHash} from "node:crypto";
import {db} from "./db";
import {HttpError} from "./store";

// Serialize consumption with registration without consuming a link on validation failure.
// Authentication uses its own connection; the row remains readable by its invite hook.
export async function registerWithInvitation(token:string,email:unknown,register:()=>Promise<Response>){
 if(typeof email!=="string"||!token||token.length>256)throw new HttpError(403,"Gyldig invitasjon kreves");
 const digest=createHash("sha256").update(token).digest("hex"),client=await db.connect();
 try{
  await client.query("BEGIN");
  const invite=await client.query("SELECT id FROM invitation WHERE token_hash=$1 AND lower(email)=lower($2) AND expires_at>now() AND used_at IS NULL FOR UPDATE",[digest,email.trim()]);
  if(!invite.rowCount)throw new HttpError(403,"Gyldig invitasjon kreves");
  const response=await register();
  if(response.ok)await client.query("UPDATE invitation SET used_at=now() WHERE id=$1",[invite.rows[0].id]);
  await client.query("COMMIT");
  return response;
 }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}
