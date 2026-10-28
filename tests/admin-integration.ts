import {assertTestEnvironment} from "./test-environment";
assertTestEnvironment();
import {test} from "node:test";
import assert from "node:assert/strict";
import {randomBytes,randomUUID,createHash} from "node:crypto";
import {db} from "../src/lib/db";
const base=process.env.BETTER_AUTH_URL!,password="admin-test-password-only-!42";
type Client={cookie:string;id:string;email:string};
async function request(path:string,data?:unknown,c?:Client,extra:Record<string,string>={}){
 const r=await fetch(base+path,{method:data?"POST":"GET",headers:{origin:base,...(data?{"content-type":"application/json"}:{}),...(c?{cookie:c.cookie}:{}),...extra},body:data?JSON.stringify(data):undefined});return {r,j:await r.json()};
}
async function fixture(label:string){
 const email=label+"-"+randomBytes(5).toString("hex")+"@example.test",token=randomBytes(32).toString("hex");
 await db.query("INSERT INTO invitation(id,email,token_hash,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",[randomUUID(),email,createHash("sha256").update(token).digest("hex")]);
 const {r,j}=await request("/api/auth/sign-up/email",{name:label,email,password},undefined,{"x-penge-invite":token});
 assert.equal(r.status,200,JSON.stringify(j));return {cookie:r.headers.getSetCookie().map(c=>c.split(";")[0]).join("; "),id:j.user.id,email} as Client;
}
await db.query('DELETE FROM "rateLimit"');await db.query("DELETE FROM request_limit");
await test("administrator authorization and account lifecycle",async t=>{
 const admin=await fixture("Admin"),friend=await fixture("Friend");
 await db.query("INSERT INTO app_admin(user_id) VALUES($1)",[admin.id]);
 let invited:Client|undefined,invitationId="",newEmail="new-"+randomBytes(5).toString("hex")+"@example.test",link="";
 await t.test("anonymous and ordinary users cannot read or use admin API",async()=>{
 assert.equal((await request("/api/admin")).r.status,401);
 assert.equal((await request("/api/admin",undefined,friend)).r.status,403);
 assert.equal((await request("/api/admin",{action:"invite",email:"no@example.test"},friend,{"x-admin":"true"})).r.status,403);
 });
 await t.test("role metadata comes from server-side grants only",async()=>{
 assert.equal((await request("/api/budget",undefined,admin)).j.user.isAdmin,true);
 assert.equal((await request("/api/budget",undefined,friend)).j.user.isAdmin,false);
 await request("/api/auth/update-user",{name:"Friend",isAdmin:true,role:"admin"},friend);
 assert.equal((await request("/api/admin",undefined,friend)).r.status,403);
 });
 await t.test("admin creates a single-use invite without exposing stored tokens",async()=>{
 const {r,j}=await request("/api/admin",{action:"invite",email:newEmail},admin);assert.equal(r.status,200,JSON.stringify(j));link=j.url;invitationId=j.id;
 const listing=await request("/api/admin",undefined,admin);assert.ok(listing.j.invitations.some((i:{id:string})=>i.id===j.id));assert.ok(!JSON.stringify(listing.j).includes("token_hash"));assert.ok(!JSON.stringify(listing.j).includes(new URL(link).searchParams.get("invite")!));
 });
 await t.test("invited friend can register using the generated link",async()=>{
 const token=new URL(link).searchParams.get("invite")!;
 const {r,j}=await request("/api/auth/sign-up/email",{email:newEmail,password,name:"New friend"},undefined,{"x-penge-invite":token});assert.equal(r.status,200,JSON.stringify(j));
 invited={cookie:r.headers.getSetCookie().map(c=>c.split(";")[0]).join("; "),id:j.user.id,email:newEmail};
 assert.equal((await request("/api/admin",undefined,invited)).r.status,403);
 });
 await t.test("admin listings contain account metadata, never financial records",async()=>{
 const saved=await request("/api/budget",{action:"record",payload:{kind:"income",title:"PRIVATE FINANCIAL CANARY",amount:98765,start:"2026-10-01"}},friend);assert.equal(saved.r.status,200);
 const list=await request("/api/admin",undefined,admin);assert.ok(!JSON.stringify(list.j).includes("CANARY"));assert.ok(!JSON.stringify(list.j).includes("98765"));
 assert.equal((await request("/api/budget",undefined,admin)).j.data.records.some((r:{title:string})=>r.title==="PRIVATE FINANCIAL CANARY"),false);
 });
 await t.test("duplicate accounts, forged ownership and foreign origins are rejected",async()=>{
 assert.equal((await request("/api/admin",{action:"invite",email:friend.email},admin)).r.status,409);
 assert.equal((await request("/api/admin",{action:"invite",email:"test@example.test",role:"admin"},admin)).r.status,400);
 assert.equal((await request("/api/admin",{action:"invite",email:"test@example.test"},admin,{origin:"https://evil.example"})).r.status,403);
 });
 await t.test("invites can be revoked and previous links are invalidated on replacement",async()=>{
 const email="revoke-"+randomBytes(5).toString("hex")+"@example.test";
 const first=await request("/api/admin",{action:"invite",email},admin),second=await request("/api/admin",{action:"invite",email},admin);
 assert.ok((await db.query("SELECT used_at FROM invitation WHERE id=$1",[first.j.id])).rows[0].used_at);
 assert.equal((await request("/api/admin",{action:"revoke",invitationId:second.j.id},admin)).r.status,200);
 assert.ok((await db.query("SELECT used_at FROM invitation WHERE id=$1",[second.j.id])).rows[0].used_at);
 });
 await t.test("administrators cannot disable or delete themselves or other admins",async()=>{
 for(const action of ["disable","delete"])assert.equal((await request("/api/admin",{action,userId:admin.id,...(action==="delete"?{confirmation:admin.email,password}:{})},admin)).r.status,409);
 await db.query("INSERT INTO app_admin(user_id) VALUES($1)",[friend.id]);
 assert.equal((await request("/api/admin",{action:"disable",userId:friend.id},admin)).r.status,409);
 await db.query("DELETE FROM app_admin WHERE user_id=$1",[friend.id]);
 assert.equal((await request("/api/auth/delete-user",{password},admin,{"x-confirm-delete":"DELETE"})).r.status,409);
 });
 await t.test("disable revokes sessions and blocks login; enable restores access",async()=>{
 assert.equal((await request("/api/admin",{action:"disable",userId:friend.id},admin)).r.status,200);
 assert.equal((await request("/api/budget",undefined,friend)).r.status,401);
 assert.equal((await request("/api/auth/sign-in/email",{email:friend.email,password})).r.status,401);
 assert.equal((await request("/api/admin",{action:"enable",userId:friend.id},admin)).r.status,200);
 const login=await request("/api/auth/sign-in/email",{email:friend.email,password});assert.equal(login.r.status,200);
 friend.cookie=login.r.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ");
 });
 await t.test("permanent deletion requires matching email and correct administrator password",async()=>{
 const payload={action:"delete",userId:friend.id,confirmation:"wrong@example.test",password};
 assert.equal((await request("/api/admin",payload,admin)).r.status,400);
 assert.equal((await request("/api/admin",{...payload,confirmation:friend.email,password:"invalid-password"},admin)).r.status,403);
 assert.ok((await db.query('SELECT 1 FROM "user" WHERE id=$1',[friend.id])).rowCount);
 assert.equal((await request("/api/admin",{...payload,confirmation:friend.email},admin)).r.status,200);
 assert.equal((await db.query('SELECT 1 FROM "user" WHERE id=$1',[friend.id])).rowCount,0);
 assert.equal((await db.query("SELECT 1 FROM budget_record WHERE user_id=$1",[friend.id])).rowCount,0);
 assert.equal((await request("/api/budget",undefined,friend)).r.status,401);
 });
 await t.test("admin changes are audited without passwords or invite tokens",async()=>{
 const events=await db.query("SELECT action,target FROM admin_event WHERE actor_id=$1",[admin.id]);
 for(const action of ["invite","revoke","disable","enable","delete"])assert.ok(events.rows.some(e=>e.action===action));
 assert.ok(!JSON.stringify(events.rows).includes(password));
 });
});
await db.end();
