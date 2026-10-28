import {assertTestEnvironment} from "./test-environment";
assertTestEnvironment();
import {processMail} from "../src/lib/mail-queue";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes,randomUUID,createHash } from "node:crypto";
import { createServer } from "node:net";
import { db } from "../src/lib/db";
const base=process.env.BETTER_AUTH_URL!;
type Client={cookie:string};
async function req(path:string,data?:unknown,client?:Client,origin=base,headers:Record<string,string>={}){
 const r=await fetch(base+path,{method:data?"POST":"GET",headers:{"origin":origin,...(data?{"content-type":"application/json"}:{}),...(client?{cookie:client.cookie}:{}),...headers},body:data?JSON.stringify(data):undefined});
 const body=await r.json();return {r,body};
}
async function signup(email:string,name:string){
 const token=randomBytes(32).toString("hex");
 await db.query("INSERT INTO invitation(id,email,token_hash,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",[randomUUID(),email,createHash("sha256").update(token).digest("hex")]);
 const {r,body}=await req("/api/auth/sign-up/email",{email,name,password:"test-only-password-!42"},undefined,base,{"x-penge-invite":token});
 assert.equal(r.status,200,JSON.stringify(body));
 const cookie=r.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ");
 assert.ok(cookie.includes("session_token"),"session cookie issued");
 assert.ok(r.headers.getSetCookie().some(c=>/httponly/i.test(c)));
 return {cookie};
}
const mail:string[]=[];
function decodedMail(){
 return mail.join("\n").split(/\n--[^\n]*\n/).map(part=>{
 const index=part.indexOf("\n\n"),headers=part.slice(0,index),body=index<0?part:part.slice(index+2);
 if(/Content-Transfer-Encoding: base64/i.test(headers))return Buffer.from(body.replace(/\s/g,""),"base64").toString("utf8");
 return body.replace(/=\r?\n/g,"").replace(/=([0-9A-F]{2})/g,(_,hex)=>String.fromCharCode(parseInt(hex,16)));
 }).join("\n");
}

const smtp=createServer(socket=>{
 socket.write("220 local-test ESMTP\r\n");let buffer="",inData=false,message="";
 socket.on("data",chunk=>{buffer+=chunk.toString();let i;
 while((i=buffer.indexOf("\r\n"))>=0){
 const line=buffer.slice(0,i);buffer=buffer.slice(i+2);
 if(inData){if(line==="."){mail.push(message);message="";inData=false;socket.write("250 queued\r\n");}else message+=line+"\n";continue;}
 if(line.startsWith("EHLO")||line.startsWith("HELO"))socket.write("250-local-test\r\n250 PIPELINING\r\n");
 else if(line==="DATA"){inData=true;socket.write("354 continue\r\n");}
 else if(line==="QUIT"){socket.end("221 bye\r\n");}
 else socket.write("250 ok\r\n");
 }
 });
});
await new Promise<void>(resolve=>smtp.listen(1025,"0.0.0.0",resolve));
await db.query('DELETE FROM "rateLimit"');
await db.query("DELETE FROM request_limit");
await test("HTTP security, auth, persistence and tenant isolation",async t=>{
 let a:Client,b:Client;let id="",accountId="",aEmail="";
 await t.test("unauthenticated budget access is denied",async()=>{assert.equal((await req("/api/budget")).r.status,401);assert.equal((await req("/api/budget",{action:"settings",payload:{}},undefined)).r.status,401);});
 await t.test("cross-origin requests are rejected",async()=>{assert.equal((await req("/api/budget",{action:"settings",payload:{}},undefined,"https://evil.example")).r.status,403);});
 await t.test("invited users can register with isolated sessions",async()=>{const suffix=randomBytes(5).toString("hex");aEmail="a-"+suffix+"@example.test";a=await signup(aEmail,"Alice");b=await signup("b-"+suffix+"@example.test","Bob");});
 await t.test("uninvited registration is denied",async()=>{assert.equal((await req("/api/auth/sign-up/email",{email:"no@example.test",password:"test-only-password-!42",name:"No"})).r.status,403);});
 await t.test("authenticated records persist and SQL input remains literal",async()=>{const title="Rent '; DROP TABLE budget_record; -- <script>alert(1)</script>";const r=await req("/api/budget",{action:"record",payload:{kind:"expense",title,amount:10000,start:"2026-01-01"}},a);assert.equal(r.r.status,200,JSON.stringify(r.body));id=r.body.id;const s=await req("/api/budget",undefined,a);assert.equal(s.body.data.records.find((x:{id:string})=>x.id===id).title,title);});
 await t.test("ownership supplied by clients is rejected",async()=>{assert.equal((await req("/api/budget",{action:"record",payload:{kind:"income",title:"Forged",amount:100,start:"2026-01-01",userId:"victim"}},b)).r.status,400);});
 await t.test("another user cannot read the export",async()=>{const s=await req("/api/budget?userId=Alice",undefined,b);assert.deepEqual(s.body.data.records,[]);assert.equal(s.body.user.name,"Bob");});
 await t.test("another user cannot edit or delete a record",async()=>{for(const action of ["record","delete"]){const payload=action==="record"?{id,kind:"income",title:"Stolen",amount:1,start:"2026-01-01"}:id;assert.equal((await req("/api/budget",{action,payload,confirmation:"SLETT"},b)).r.status,404);}});
 await t.test("another user cannot mark a payment or read savings",async()=>{assert.equal((await req("/api/budget",{action:"occurrence",payload:{recordId:id,date:"2026-01-01",status:"paid"}},b)).r.status,404);const r=await req("/api/budget",{action:"record",payload:{kind:"account",title:"Private savings",amount:50000,start:"2026-01-01"}},a);accountId=r.body.id;assert.ok(accountId);assert.equal((await req("/api/budget",undefined,b)).body.data.records.length,0);});
 await t.test("foreign savings references cannot be forged",async()=>{assert.equal((await req("/api/budget",{action:"record",payload:{kind:"saving",title:"Attack",amount:100,start:"2026-01-01",accountId}},b)).r.status,400);});
 await t.test("payment state is occurrence specific",async()=>{const r=await req("/api/budget",{action:"occurrence",payload:{recordId:id,date:"2026-01-01",status:"paid",actual:9999}},a);assert.equal(r.r.status,200);const s=(await req("/api/budget",undefined,a)).body.data;assert.equal(s.occurrences.length,1);assert.equal(s.occurrences[0].date,"2026-01-01");});
 await t.test("invalid money, dates, URLs and fields fail validation",async()=>{for(const patch of [{amount:1.25},{start:"2026-02-30"},{website:"javascript:alert(1)"},{extra:"field"}])assert.equal((await req("/api/budget",{action:"record",payload:{kind:"income",title:"Bad",amount:100,start:"2026-01-01",...patch}},a)).r.status,400);});
 await t.test("invalid occurrence dates are rejected",async()=>{assert.equal((await req("/api/budget",{action:"occurrence",payload:{recordId:id,date:"2026-01-02",status:"paid"}},a)).r.status,400);});
 await t.test("JSON replacement requires explicit confirmation",async()=>{const s=(await req("/api/budget",undefined,b)).body.data;assert.equal((await req("/api/budget",{action:"replace",payload:s},b)).r.status,400);});
 await t.test("import cannot reference another user's account",async()=>{const payload={schemaVersion:1,records:[{id:randomUUID(),kind:"saving",title:"Attack",amount:100,start:"2026-01-01",accountId}],occurrences:[],reconciliations:[],settings:{}};assert.equal((await req("/api/budget",{action:"replace",payload,confirmation:"ERSTATT"},b)).r.status,400);});
 await t.test("import with another user's IDs generates new owned IDs",async()=>{const payload={schemaVersion:1,records:[{id,kind:"income",title:"Own copy",amount:100,start:"2026-01-01"}],occurrences:[],reconciliations:[],settings:{}};assert.equal((await req("/api/budget",{action:"replace",payload,confirmation:"ERSTATT"},b)).r.status,200);const own=(await req("/api/budget",undefined,b)).body.data;assert.notEqual(own.records[0].id,id);assert.ok((await req("/api/budget",undefined,a)).body.data.records.some((r:{id:string})=>r.id===id));});
 await t.test("rate limiter is enforced",async()=>{let last=200;for(let i=0;i<125;i++){last=(await req("/api/budget",{action:"settings",payload:{}},b)).r.status;if(last===429)break;}assert.equal(last,429);});
 await t.test("password change revokes other sessions",async()=>{
 const login=await req("/api/auth/sign-in/email",{email:aEmail,password:"test-only-password-!42"});
 assert.equal(login.r.status,200);const second={cookie:login.r.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ")};
 assert.equal((await req("/api/auth/change-password",{currentPassword:"test-only-password-!42",newPassword:"changed-password-only-!43",revokeOtherSessions:true},a)).r.status,200);
 assert.equal((await req("/api/budget",undefined,second)).r.status,401);
 assert.equal((await req("/api/auth/sign-in/email",{email:aEmail,password:"test-only-password-!42"})).r.status,401);
 });
 await t.test("password reset uses a single-use token and revokes sessions",async()=>{
 assert.equal((await req("/api/auth/request-password-reset",{email:aEmail,redirectTo:base+"/"})).r.status,200);
 while(await processMail()){}
 for(let i=0;i<20&&!mail.length;i++)await new Promise(r=>setTimeout(r,50));
 const token=decodedMail().match(/reset-password\/([A-Za-z0-9_-]+)/)?.[1];assert.ok(token,"reset link delivered to local SMTP test sink");
 assert.equal((await req("/api/auth/reset-password",{token,newPassword:"reset-password-only-!44"})).r.status,200);
 assert.equal((await req("/api/auth/reset-password",{token,newPassword:"reused-token-invalid-!45"})).r.status,400);
 assert.equal((await req("/api/budget",undefined,a)).r.status,401);
 const login=await req("/api/auth/sign-in/email",{email:aEmail,password:"reset-password-only-!44"});assert.equal(login.r.status,200);
 a={cookie:login.r.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ")};
 });
 await t.test("email changes require a password and verification of the new address",async()=>{
 mail.length=0;const newEmail="updated-"+randomBytes(5).toString("hex")+"@example.test";
 assert.equal((await req("/api/auth/change-email",{newEmail,callbackURL:"/"},a)).r.status,401);
 const changed=await req("/api/auth/change-email",{newEmail,currentPassword:"reset-password-only-!44",callbackURL:"/"},a);
 assert.equal(changed.r.status,200,JSON.stringify(changed.body));
 assert.equal((await req("/api/budget",undefined,a)).body.user.email,aEmail);
 while(await processMail()){}
 for(let i=0;i<20&&!mail.length;i++)await new Promise(r=>setTimeout(r,50));
 const url=decodedMail().match(/http:\/\/localhost:3000\/api\/auth\/verify-email[^\s"<]+/)?.[0];assert.ok(url,"verification link delivered");
 const verified=await fetch(url,{redirect:"manual"});assert.ok(verified.status===302||verified.status===200);
 assert.equal((await req("/api/budget",undefined,a)).body.user.email,newEmail);aEmail=newEmail;
 });
 await t.test("logout invalidates the session",async()=>{assert.equal((await req("/api/auth/sign-out",{},a)).r.status,200);assert.equal((await req("/api/budget",undefined,a)).r.status,401);});
 await t.test("password hashes use Argon2id and stay out of exports",async()=>{const r=await db.query('SELECT password FROM account LIMIT 1');assert.match(r.rows[0].password,/^\$argon2id\$/);const s=JSON.stringify((await req("/api/budget",undefined,b)).body);assert.ok(!s.includes("$argon2"));});
 await t.test("request bodies have a bounded size",async()=>{assert.equal((await req("/api/budget",{padding:"x".repeat(2_000_001)},b)).r.status,413);});
 await t.test("authentication rate limiting is enforced independently of proxy headers",async()=>{
 let status=0;for(let i=0;i<7;i++){status=(await req("/api/auth/sign-in/email",{email:"brute@example.test",password:"invalid-password-only"})).r.status;if(status===429)break;}assert.equal(status,429);
 });
 await t.test("account deletion requires confirmation and cascades owned data",async()=>{
 const before=await req("/api/budget",undefined,b);const email=before.body.user.email;
 assert.equal((await req("/api/auth/delete-user",{password:"test-only-password-!42"},b)).r.status,400);
 assert.equal((await req("/api/auth/delete-user",{password:"test-only-password-!42"},b,base,{"x-confirm-delete":"DELETE"})).r.status,200);
 assert.equal((await req("/api/budget",undefined,b)).r.status,401);
 assert.equal((await db.query('SELECT 1 FROM "user" WHERE email=$1',[email])).rowCount,0);
 });
});
await new Promise<void>(resolve=>smtp.close(()=>resolve()));await db.end();
