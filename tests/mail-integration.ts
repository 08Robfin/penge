import {assertTestEnvironment} from "./test-environment";
assertTestEnvironment();
import {test} from "node:test";import assert from "node:assert/strict";import {randomBytes,randomUUID,createHash} from "node:crypto";import {db} from "../src/lib/db";import {processMail,enqueueMail,openMail} from "../src/lib/mail-queue";import {ensureDefaultSubscriptions} from "../src/lib/mail-preferences";import {MailDeliveryError} from "../src/lib/mail-transport";
const base=process.env.BETTER_AUTH_URL!;type Client={cookie:string;id:string;email:string};
async function req(path:string,data?:unknown,c?:Client){const r=await fetch(base+path,{method:data?"POST":"GET",headers:{origin:base,...(data?{"content-type":"application/json"}:{}),...(c?{cookie:c.cookie}:{})},body:data?JSON.stringify(data):undefined});return {r,j:await r.json()};}
async function fixture(admin=false){const email="mail-test-"+randomBytes(5).toString("hex")+"@example.test",token=randomBytes(32).toString("hex");await db.query("INSERT INTO invitation(id,email,token_hash,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",[randomUUID(),email,createHash("sha256").update(token).digest("hex")]);const r=await fetch(base+"/api/auth/sign-up/email",{method:"POST",headers:{origin:base,"content-type":"application/json","x-penge-invite":token},body:JSON.stringify({name:"Mail test",email,password:"test-only-mail-password-!42"})});assert.equal(r.status,200);const j=await r.json();if(admin)await db.query("INSERT INTO app_admin(user_id) VALUES($1)",[j.user.id]);return {id:j.user.id,email,cookie:r.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ")};}
await db.query('DELETE FROM "user" WHERE email LIKE \'mail-test-%@example.test\'');await db.query('DELETE FROM "rateLimit"');await db.query("DELETE FROM request_limit");await db.query("DELETE FROM email_outbox");
await test("mail authorization, opt-in, campaign queue and unsubscribe",async t=>{
 const admin=await fixture(true),user=await fixture(),off=await fixture();
 await ensureDefaultSubscriptions();await db.query("UPDATE email_subscription SET enabled=false WHERE user_id<>$1",[user.id]);
 const content={subject:"Test news",title:"Nytt i Penge",body:"Hello <script>alert(1)</script>",template:"news"};let campaign:any,invitation:any;
 await t.test("admin endpoints reject anonymous, regular users and cross-origin mutation",async()=>{
 assert.equal((await req("/api/admin/mail")).r.status,401);assert.equal((await req("/api/admin/mail",undefined,user)).r.status,403);
 const r=await fetch(base+"/api/admin/mail",{method:"POST",headers:{origin:"https://evil.example","content-type":"application/json",cookie:admin.cookie},body:JSON.stringify({action:"save",...content})});assert.equal(r.status,403);
 });
 await t.test("newsletter defaults on, stored off preferences survive defaults, and preferences are owned",async()=>{
 assert.equal((await req("/api/email-preferences",undefined,user)).j.enabled,true);
 await ensureDefaultSubscriptions();assert.equal((await req("/api/email-preferences",undefined,off)).j.enabled,false);
 assert.equal((await req("/api/email-preferences",{enabled:true},user)).r.status,200);
 assert.equal((await req("/api/email-preferences",undefined,off)).j.enabled,false);
 assert.equal((await req("/api/email-preferences",{enabled:true,userId:off.id},user)).r.status,400);
 });
 await t.test("admin lists membership, can toggle anyone including self, and ordinary users cannot",async()=>{
 let listing=await req("/api/admin",undefined,admin);assert.equal(listing.j.users.find((u:any)=>u.id===off.id).newsletter_enabled,false);
 assert.equal((await req("/api/admin",{action:"newsletter",userId:off.id,enabled:true},user)).r.status,403);
 assert.equal((await req("/api/admin",{action:"newsletter",userId:"missing",enabled:true},admin)).r.status,404);
 assert.equal((await req("/api/admin",{action:"newsletter",userId:off.id,enabled:true},admin)).r.status,200);
 assert.equal((await req("/api/email-preferences",undefined,off)).j.enabled,true);
 assert.equal((await req("/api/admin",{action:"newsletter",userId:off.id,enabled:false},admin)).r.status,200);
 assert.equal((await req("/api/admin",{action:"newsletter",userId:admin.id,enabled:true},admin)).r.status,200);
 listing=await req("/api/admin",undefined,admin);assert.equal(listing.j.users.find((u:any)=>u.id===admin.id).newsletter_enabled,true);
 assert.equal((await req("/api/admin",{action:"newsletter",userId:admin.id,enabled:false},admin)).r.status,200);
 assert.equal((await db.query("SELECT 1 FROM admin_event WHERE actor_id=$1 AND action='newsletter_on' AND target=$1",[admin.id])).rowCount,1);
 });
 await t.test("invitation and encrypted mail are committed together; revoked invites are not sent",async()=>{
 invitation=(await req("/api/admin",{action:"invite",email:"invited-mail@example.test"},admin)).j;assert.equal(invitation.delivery,"queued");let row=(await db.query("SELECT * FROM email_outbox WHERE invitation_id=$1",[invitation.id])).rows[0];const mail=openMail(row.payload);assert(mail.text.includes(invitation.url));assert.equal(mail.to,"invited-mail@example.test");assert(!row.payload.includes("invite="));
 await req("/api/admin",{action:"revoke",invitationId:invitation.id},admin);let sends=0;await processMail(async()=>{sends++;return "fake";});assert.equal(sends,0);assert.equal((await db.query("SELECT state FROM email_outbox WHERE id=$1",[row.id])).rows[0].state,"cancelled");
 });
 await t.test("drafts preview escaped content, reject stale edits and cannot send without review revision",async()=>{
 campaign=(await req("/api/admin/mail",{action:"save",...content},admin)).j;assert(campaign.id);
 const preview=await req("/api/admin/mail",{action:"preview",...content},admin);assert(!preview.j.html.includes("<script>"));
 assert.equal((await req("/api/admin/mail",{action:"send",id:campaign.id,revision:99,confirmation:"SEND"},admin)).r.status,409);
 assert.equal((await req("/api/admin/mail",{action:"send",id:campaign.id,revision:0},admin)).r.status,400);
 });
 await t.test("test sends only to administrator and marketing sends only opted-in active users",async()=>{
 await db.query("DELETE FROM request_limit WHERE key=$1",["mail-send:"+admin.id]);
 const result=await req("/api/admin/mail",{action:"test",id:campaign.id,revision:0},admin);assert.equal(result.r.status,200);
 const testRow=(await db.query("SELECT * FROM email_outbox WHERE kind='test' AND campaign_id=$1",[campaign.id])).rows[0];assert.equal(openMail(testRow.payload).to,admin.email);
 await processMail(async()=> "fake-admin-test");
 const sent=await req("/api/admin/mail",{action:"send",id:campaign.id,revision:0,confirmation:"SEND"},admin);assert.equal(sent.r.status,200);assert.equal(sent.j.recipients,1);
 const repeat=await req("/api/admin/mail",{action:"send",id:campaign.id,revision:0,confirmation:"SEND"},admin);assert.equal(repeat.r.status,200);
 assert.equal((await db.query("SELECT 1 FROM email_outbox WHERE campaign_id=$1 AND kind='campaign'",[campaign.id])).rowCount,1);
 });
 await t.test("GET unsubscribe does not change preferences; POST is idempotent and worker rechecks consent",async()=>{
 const row=(await db.query("SELECT token FROM email_subscription WHERE user_id=$1",[user.id])).rows[0];const token=row.token;
 const get=await fetch(base+"/api/email/unsubscribe?token="+token,{redirect:"manual"});assert.equal(get.status,303);assert.equal((await req("/api/email-preferences",undefined,user)).j.enabled,true);
 assert.equal((await fetch(base+"/api/email/unsubscribe?token="+token,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:"List-Unsubscribe=One-Click"})).status,200);
 assert.equal((await fetch(base+"/api/email/unsubscribe?token="+token,{method:"POST"})).status,200);
 let sends=0;await processMail(async()=>{sends++;return "fake";});assert.equal(sends,0);
 assert.equal((await req("/api/email-preferences",undefined,user)).j.enabled,false);
 });
 await t.test("transient failures retry the same immutable payload with the same idempotency key",async()=>{
 invitation=(await req("/api/admin",{action:"invite",email:"retry-mail@example.test"},admin)).j;
 const keys:string[]=[],payloads:string[]=[];
 await processMail(async(mail,key)=>{keys.push(key);payloads.push(JSON.stringify(mail));throw new MailDeliveryError("provider_429",true);});
 const row=(await db.query("SELECT * FROM email_outbox WHERE invitation_id=$1",[invitation.id])).rows[0];assert.equal(row.state,"pending");await db.query("UPDATE email_outbox SET available_at=now() WHERE id=$1",[row.id]);
 await processMail(async(mail,key)=>{keys.push(key);payloads.push(JSON.stringify(mail));return "fake-provider-id";});assert.equal(keys[0],keys[1]);assert.equal(payloads[0],payloads[1]);
 const final=(await db.query("SELECT * FROM email_outbox WHERE id=$1",[row.id])).rows[0];assert.equal(final.state,"submitted");assert.equal(final.payload,"");
 });
 await t.test("campaign cancellation stops pending work",async()=>{
 await req("/api/email-preferences",{enabled:true},user);const draft=(await req("/api/admin/mail",{action:"save",...content},admin)).j;
 // Avoid the HTTP send throttle in this isolated fixture by using a fresh admin rate window.
 await db.query("DELETE FROM request_limit WHERE key=$1",["mail-send:"+admin.id]);
 await req("/api/admin/mail",{action:"send",id:draft.id,revision:0,confirmation:"SEND"},admin);
 await req("/api/admin/mail",{action:"cancel",id:draft.id},admin);
 assert.equal((await db.query("SELECT state FROM email_outbox WHERE campaign_id=$1",[draft.id])).rows[0].state,"cancelled");
 });
});await db.end();
