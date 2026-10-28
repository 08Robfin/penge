import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
const pythonAvailable=spawnSync("python3",["--version"],{encoding:"utf8"}).status===0;
test("fresh instances get independent project names and secrets; existing configuration is never overwritten",{skip:pythonAvailable?false:"Python 3 is required for the optional generator; CI includes it"},()=>{
 const temp=mkdtempSync(join(tmpdir(),"penge-instance-test-"));
 try{
  const instances=["one","two"].map(name=>{
   const root=join(temp,name);mkdirSync(join(root,"scripts"),{recursive:true});
   copyFileSync("scripts/create-env.py",join(root,"scripts/create-env.py"));copyFileSync(".env.example",join(root,".env.example"));
   const run=spawnSync("python3",[join(root,"scripts/create-env.py")],{encoding:"utf8"});
   assert.equal(run.status,0,"fresh configuration generation succeeds");
   const content=readFileSync(join(root,".env"),"utf8");
   const vars=Object.fromEntries(content.split("\n").filter(l=>l.includes("=")&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return[l.slice(0,i),l.slice(i+1)];}));
   assert.match(vars.COMPOSE_PROJECT_NAME,/^penge-[a-f0-9]{8}$/);
   assert.equal(vars.BETTER_AUTH_URL,"http://localhost:3000");
   assert.match(vars.POSTGRES_PASSWORD,/^[a-f0-9]{64}$/);assert.match(vars.BETTER_AUTH_SECRET,/^[a-f0-9]{64}$/);assert.match(vars.APP_DATABASE_PASSWORD,/^[a-f0-9]{64}$/);assert(vars.APP_DATABASE_PASSWORD!==vars.POSTGRES_PASSWORD);
   assert(vars.POSTGRES_PASSWORD!==vars.BETTER_AUTH_SECRET,"database/auth secrets are independent");
   const again=spawnSync("python3",[join(root,"scripts/create-env.py")],{encoding:"utf8"});
   assert(again.status!==0,"refuse to overwrite an existing instance");
   assert.equal(readFileSync(join(root,".env"),"utf8"),content);
   return vars;
  });
  for(const key of ["COMPOSE_PROJECT_NAME","POSTGRES_PASSWORD","BETTER_AUTH_SECRET","APP_DATABASE_PASSWORD"])assert(instances[0][key]!==instances[1][key],"separate instances have independent "+key);
 }finally{rmSync(temp,{recursive:true,force:true});}
});
