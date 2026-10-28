import {test} from "node:test";
import assert from "node:assert/strict";
import {randomBytes,randomUUID,createHash} from "node:crypto";
import {db} from "../src/lib/db";
import {assertTestEnvironment} from "./test-environment";
import {openMail,processMail} from "../src/lib/mail-queue";
assertTestEnvironment();
const base=process.env.BETTER_AUTH_URL!,password="synthetic-security-password-42!";
async function post(path:string,data:unknown,headers:Record<string,string>={}){
 return fetch(base+path,{method:"POST",headers:{origin:base,"content-type":"application/json",...headers},body:JSON.stringify(data)});
}
async function invite(){
 const email="audit-"+randomBytes(6).toString("hex")+"@example.test",token=randomBytes(32).toString("base64url");
 await db.query("INSERT INTO invitation(id,email,token_hash,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",[randomUUID(),email,createHash("sha256").update(token).digest("hex")]);
 return {email,token};
}
await db.query('DELETE FROM "rateLimit"');await db.query("DELETE FROM request_limit");
await test("security hardening regressions",async t=>{
 let email="",userId="",cookie="";
 await t.test("invalid signup does not consume an invitation",async()=>{
  const i=await invite();email=i.email;
  const invalid=await post("/api/auth/sign-up/email",{email,password:"short",name:"Audit"},{"x-penge-invite":i.token});assert.equal(invalid.status,400);
  const stored=await db.query("SELECT used_at FROM invitation WHERE token_hash=$1",[createHash("sha256").update(i.token).digest("hex")]);assert.equal(stored.rows[0].used_at,null);
  const valid=await post("/api/auth/sign-up/email",{email,password,name:"Audit"},{"x-penge-invite":i.token});assert.equal(valid.status,200);
  userId=(await valid.json()).user.id;cookie=valid.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ");
  assert((await db.query("SELECT used_at FROM invitation WHERE token_hash=$1",[createHash("sha256").update(i.token).digest("hex")])).rows[0].used_at);
 });
 await t.test("concurrent invitation registration creates exactly one account",async()=>{
  const i=await invite(),statuses=await Promise.all([1,2].map(async()=> (await post("/api/auth/sign-up/email",{email:i.email,password,name:"Race"},{"x-penge-invite":i.token})).status));
  assert.equal(statuses.filter(s=>s===200).length,1);assert.equal(statuses.filter(s=>s===403).length,1);
  assert.equal((await db.query('SELECT 1 FROM "user" WHERE email=$1',[i.email])).rowCount,1);
 });
 await t.test("password recovery returns the same response for known and unknown emails",async()=>{
  const known=await post("/api/auth/request-password-reset",{email,redirectTo:base+"/"}),unknown=await post("/api/auth/request-password-reset",{email:"absent-"+randomUUID()+"@example.test",redirectTo:base+"/"});
  assert.equal(known.status,200);assert.equal(unknown.status,200);assert.deepEqual(await known.json(),await unknown.json());
 });
 let resetToken="";
 await t.test("reset mail is encrypted, queued and expires before the one-hour token",async()=>{
  const row=(await db.query("SELECT * FROM email_outbox WHERE user_id=$1 AND kind='account' ORDER BY created_at DESC LIMIT 1",[userId])).rows[0];assert(row);assert.equal(row.state,"pending");
  assert(new Date(row.expires_at).getTime()>Date.now()&&new Date(row.expires_at).getTime()<Date.now()+3600000);
  const message=openMail(row.payload);assert.equal(message.to,email);resetToken=message.text.match(/reset-password\/([A-Za-z0-9_-]+)/)![1];assert(resetToken);
  assert(!row.payload.includes(resetToken));assert(!row.payload.includes(email));
  assert.equal((await db.query('SELECT 1 FROM verification WHERE identifier=$1',["reset-password:"+resetToken])).rowCount,0,"raw reset identifier must not be stored");
 });
 await t.test("reset tokens are single-use even under concurrent requests",async()=>{
  const results=await Promise.all([1,2].map(async()=> (await post("/api/auth/reset-password",{token:resetToken,newPassword:"new-synthetic-password-43!"})).status));
  assert.equal(results.filter(s=>s===200).length,1);assert.equal(results.filter(s=>s===400).length,1);
  assert.equal((await fetch(base+"/api/budget",{headers:{cookie}})).status,401);
 });
 await t.test("expired account emails are cancelled without delivery",async()=>{
  await db.query("UPDATE email_outbox SET expires_at=now()-interval '1 second' WHERE kind='account'");
  let sends=0;while(await processMail(async()=>{sends++;return "test-only";})){}
  assert.equal(sends,0);
 });
 await t.test("password-reset redirects cannot point to an untrusted origin",async()=>{
  assert.equal((await post("/api/auth/request-password-reset",{email,redirectTo:"https://evil.example/"})).status,403);
 });
 await t.test("disabled accounts do not reveal a distinct login error",async()=>{
  await db.query("INSERT INTO disabled_account(user_id) VALUES($1)",[userId]);
  try{
   const disabled=await post("/api/auth/sign-in/email",{email,password:"new-synthetic-password-43!"});
   const unknown=await post("/api/auth/sign-in/email",{email:"missing-"+randomUUID()+"@example.test",password:"new-synthetic-password-43!"});
   assert.equal(disabled.status,401);assert.equal(unknown.status,401);assert.deepEqual(await disabled.json(),await unknown.json());
  }finally{await db.query("DELETE FROM disabled_account WHERE user_id=$1",[userId]);}
 });
 await t.test("malformed authentication bodies receive a validation error",async()=>{assert.equal((await post("/api/auth/sign-in/email",null)).status,400);});
});
await db.end();
