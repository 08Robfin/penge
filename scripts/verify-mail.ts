import {randomUUID,randomBytes,createHash} from "node:crypto";
import {db} from "../src/lib/db";
import {enqueueMail} from "../src/lib/mail-queue";
import {emailTemplate,invitationContent} from "../src/lib/email-templates";
if(!process.env.RESEND_API_KEY)throw Error("Resend must be configured");
const id=randomUUID(),token=randomBytes(32).toString("hex"),base=process.env.BETTER_AUTH_URL!;
try{
 await db.query("INSERT INTO invitation(id,email,token_hash,expires_at) VALUES($1,'delivered@resend.dev',$2,now()+interval '7 days')",[id,createHash("sha256").update(token).digest("hex")]);
 const content=invitationContent(base+"/?invite="+token+"&email=delivered%40resend.dev");
 const job=await enqueueMail({to:"delivered@resend.dev",subject:"[Technical check] "+content.subject,...emailTemplate(content)},{kind:"invite",invitationId:id});
 let submitted=false;
 for(let i=0;i<60;i++){
 const row=(await db.query("SELECT state,error_code,provider_id FROM email_outbox WHERE id=$1",[job])).rows[0];
 if(row?.state==="submitted"){console.log("PASS: encrypted queue, production mail worker and Resend submission to provider test sink. Reference: "+row.provider_id);submitted=true;break;}
 if(row?.state==="failed")throw Error("Mail queue test failed: "+row.error_code);
 await new Promise(resolve=>setTimeout(resolve,500));
 }
 if(!submitted)throw Error("Mail worker did not finish the provider test within 30 seconds");
}finally{await db.query("DELETE FROM invitation WHERE id=$1",[id]);await db.end();}
