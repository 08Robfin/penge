import {validateRuntimeConfig} from "./runtime-config.cjs";
validateRuntimeConfig();
import {db} from "../src/lib/db";
import {processMail} from "../src/lib/mail-queue";
import {mailConfigured} from "../src/lib/mail-transport";
let running=true;process.on("SIGTERM",()=>{running=false;});process.on("SIGINT",()=>{running=false;});
const lock=await db.connect();
if(!(await lock.query("SELECT pg_try_advisory_lock(742198) AS acquired")).rows[0].acquired)throw Error("A mail worker is already running");
console.log("Penge mail worker started");
let maintenance=0;
try{while(running){
 try{
  if(mailConfigured())await processMail();
  if(++maintenance%3600===0)await db.query("DELETE FROM email_outbox WHERE state IN ('submitted','failed','cancelled') AND updated_at<now()-interval '30 days'");
 }catch{console.error("Mail worker temporarily unavailable");await new Promise(resolve=>setTimeout(resolve,10000));}
 await new Promise(resolve=>setTimeout(resolve,1100));
}}finally{await lock.query("SELECT pg_advisory_unlock(742198)");lock.release();await db.end();}
