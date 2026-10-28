import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,readFileSync,statSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
const available=spawnSync("python3",["--version"],{encoding:"utf8"}).status===0;
test("runtime credential upgrade preserves existing secrets and never rotates or prints its credential",{skip:available?false:"Python 3 is covered by CI"},()=>{
 const root=mkdtempSync(join(tmpdir(),"penge-runtime-upgrade-"));
 try{
  mkdirSync(join(root,"scripts"));copyFileSync("scripts/add-runtime-password.py",join(root,"scripts/add-runtime-password.py"));
  const before="POSTGRES_PASSWORD=synthetic-existing-owner-value\nBETTER_AUTH_SECRET=synthetic-existing-authentication-value\n";
  writeFileSync(join(root,".env"),before);
  const run=spawnSync("python3",[join(root,"scripts/add-runtime-password.py")],{encoding:"utf8"});assert.equal(run.status,0);
  const after=readFileSync(join(root,".env"),"utf8");assert(after.startsWith(before));
  const value=after.match(/^APP_DATABASE_PASSWORD=([a-f0-9]{64})$/m)?.[1];assert(value);
  assert(!run.stdout.includes(value));assert(!run.stdout.includes("synthetic-existing-owner-value"));assert.equal(statSync(join(root,".env")).mode&0o777,0o600);
  const again=spawnSync("python3",[join(root,"scripts/add-runtime-password.py")],{encoding:"utf8"});assert.equal(again.status,0);assert.equal(readFileSync(join(root,".env"),"utf8"),after);assert(!again.stdout.includes(value));
 }finally{rmSync(root,{recursive:true,force:true});}
});
