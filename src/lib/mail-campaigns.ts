import {z} from "zod";
import {randomUUID} from "node:crypto";
import {db} from "./db";
import {HttpError} from "./store";
import {emailTemplate,invitationContent} from "./email-templates";
import {emailPreference,ensureDefaultSubscriptions} from "./mail-preferences";
import {enqueueMail} from "./mail-queue";
import {mailConfigured} from "./mail-transport";
const fields={subject:z.string().trim().min(1).max(120),title:z.string().trim().min(1).max(160),body:z.string().trim().min(1).max(20000),template:z.enum(["news","announcement"])};
const inputSchema=z.discriminatedUnion("action",[
 z.object({action:z.literal("preview"),...fields}).strict(),
 z.object({action:z.literal("save"),id:z.uuid().optional(),revision:z.number().int().nonnegative().optional(),...fields}).strict(),
 z.object({action:z.literal("test"),id:z.uuid(),revision:z.number().int().nonnegative()}).strict(),
 z.object({action:z.literal("send"),id:z.uuid(),revision:z.number().int().nonnegative(),confirmation:z.literal("SEND")}).strict(),
 z.object({action:z.literal("cancel"),id:z.uuid()}).strict()
]);
export async function mailAdminSnapshot(){
 await ensureDefaultSubscriptions();
 const [campaigns,subscribers,queue]=await Promise.all([
 db.query(`SELECT c.*,count(o.id) FILTER(WHERE o.kind='campaign')::int AS recipients,
 count(o.id) FILTER(WHERE o.kind='campaign' AND o.state='submitted')::int AS submitted,
 count(o.id) FILTER(WHERE o.kind='campaign' AND o.state='failed')::int AS failed,
 count(o.id) FILTER(WHERE o.kind='campaign' AND o.state IN ('pending','processing'))::int AS pending
 FROM email_campaign c LEFT JOIN email_outbox o ON o.campaign_id=c.id GROUP BY c.id ORDER BY c.created_at DESC LIMIT 20`),
 db.query('SELECT count(*)::int AS count FROM email_subscription s JOIN "user" u ON u.id=s.user_id WHERE s.enabled AND NOT EXISTS(SELECT 1 FROM disabled_account d WHERE d.user_id=s.user_id)'),
 db.query("SELECT state,count(*)::int AS count FROM email_outbox GROUP BY state")
 ]);
 return {configured:mailConfigured(),from:process.env.MAIL_FROM??"",campaigns:campaigns.rows,subscribers:subscribers.rows[0].count,queue:queue.rows,invitationPreview:emailTemplate(invitationContent((process.env.BETTER_AUTH_URL??"http://localhost:3000")+"/?invite=preview"))};
}
export async function campaignAction(actorId:string,raw:unknown){
 const input=inputSchema.parse(raw),base=process.env.BETTER_AUTH_URL??"http://localhost:3000";
 if(input.action==="preview")return emailTemplate({...input,buttonLabel:"Åpne Penge",buttonUrl:base,unsubscribeUrl:base+"/email/unsubscribe?token=preview"});
 const client=await db.connect();
 try{
 await client.query("BEGIN");
 if(!(await client.query("SELECT a.user_id FROM app_admin a WHERE a.user_id=$1 AND NOT EXISTS(SELECT 1 FROM disabled_account d WHERE d.user_id=a.user_id) FOR SHARE",[actorId])).rowCount)throw new HttpError(403,"Kun administrator har tilgang");
 if(input.action==="save"){
  if(!input.id){
   const id=randomUUID();
   const r=await client.query("INSERT INTO email_campaign(id,actor_id,subject,title,body,template) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",[id,actorId,input.subject,input.title,input.body,input.template]);await client.query("COMMIT");return r.rows[0];
  }
  const r=await client.query("UPDATE email_campaign SET subject=$2,title=$3,body=$4,template=$5,revision=revision+1,updated_at=now() WHERE id=$1 AND revision=$6 AND state='draft' RETURNING *",[input.id,input.subject,input.title,input.body,input.template,input.revision]);
  if(!r.rowCount)throw new HttpError(409,"Utkastet er endret eller allerede sendt. Last inn på nytt.");await client.query("COMMIT");return r.rows[0];
 }
 const selected=await client.query("SELECT * FROM email_campaign WHERE id=$1 FOR UPDATE",[input.id]),campaign=selected.rows[0];
 if(!campaign)throw new HttpError(404,"Fant ikke e-posten");
 if(input.action==="cancel"){
  await client.query("UPDATE email_campaign SET state='cancelled',updated_at=now() WHERE id=$1 AND state='queued'",[input.id]);
  await client.query("UPDATE email_outbox SET state='cancelled',payload='',updated_at=now() WHERE campaign_id=$1 AND state='pending'",[input.id]);
  await client.query("COMMIT");return {ok:true};
 }
 if(campaign.revision!==input.revision)throw new HttpError(409,"Utkastet er endret. Kontroller forhåndsvisningen på nytt.");
 if(input.action==="send"&&campaign.state==="queued"){const count=await client.query("SELECT count(*)::int AS count FROM email_outbox WHERE campaign_id=$1 AND kind='campaign'",[campaign.id]);await client.query("COMMIT");return {ok:true,alreadyQueued:true,recipients:count.rows[0].count};}
 if(campaign.state!=="draft")throw new HttpError(409,"E-posten kan ikke endres eller sendes igjen.");
 if(!mailConfigured())throw new HttpError(503,"E-post er ikke konfigurert.");
 if(input.action==="send")await ensureDefaultSubscriptions(client);
 const recipients=input.action==="test"
 ?await client.query('SELECT id,email FROM "user" WHERE id=$1',[actorId])
 :await client.query('SELECT u.id,u.email FROM "user" u JOIN email_subscription s ON s.user_id=u.id AND s.enabled WHERE NOT EXISTS(SELECT 1 FROM disabled_account d WHERE d.user_id=u.id)');
 if(!recipients.rowCount)throw new HttpError(409,"Ingen brukere har valgt å motta nyhetsmailer ennå.");
 for(const user of recipients.rows){
  const subscription=await emailPreference(user.id,client),unsub=base+"/email/unsubscribe?token="+encodeURIComponent(subscription.token);
  const subject=(input.action==="test"?"[Test] ":"")+campaign.subject;
  const {html,text}=emailTemplate({...campaign,subject,buttonLabel:"Åpne Penge",buttonUrl:base,unsubscribeUrl:unsub});
  await enqueueMail({to:user.email,subject,html,text,headers:{"List-Unsubscribe":"<"+base+"/api/email/unsubscribe?token="+subscription.token+">","List-Unsubscribe-Post":"List-Unsubscribe=One-Click"}},{kind:input.action==="test"?"test":"campaign",userId:user.id,campaignId:campaign.id},client);
 }
 if(input.action==="send")await client.query("UPDATE email_campaign SET state='queued',updated_at=now() WHERE id=$1",[campaign.id]);
 await client.query("INSERT INTO admin_event(id,actor_id,action,target) VALUES($1,$2,$3,$4)",[randomUUID(),actorId,"mail_"+input.action,campaign.id]);
 await client.query("COMMIT");return {ok:true,recipients:recipients.rowCount};
 }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
}
