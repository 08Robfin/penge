import {randomUUID} from "node:crypto";
import {db} from "./db";
import {HttpError} from "./store";
import {emptyDraft,onboardingDraft,onboardingRequest,onboardingRecords,type OnboardingState} from "./onboarding-schema";
import {settingsSchema} from "./schema";
export async function onboardingState(userId:string):Promise<OnboardingState>{
 const result=await db.query("SELECT step,draft,completed,revision FROM onboarding_state WHERE user_id=$1",[userId]);
 if(result.rowCount){const row=result.rows[0];return {...row,draft:onboardingDraft.parse(row.draft)};}
 const exists=await db.query("SELECT 1 FROM budget_record WHERE user_id=$1 LIMIT 1",[userId]);
 return {step:"welcome",draft:emptyDraft(),completed:!!exists.rowCount,revision:0};
}
export async function updateOnboarding(userId:string,raw:unknown){
 const input=onboardingRequest.parse(raw),client=await db.connect();
 try{
 await client.query("BEGIN");
 const user=await client.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE',[userId]);
 if(!user.rowCount)throw new HttpError(401,"Logg inn på nytt");
 const existing=await client.query("SELECT * FROM onboarding_state WHERE user_id=$1",[userId]);
 const current=existing.rows[0];
 if(current?.completed){
 if(input.action==="complete"){await client.query("COMMIT");return {completed:true};}
 throw new HttpError(409,"Oppsettet er allerede fullført");
 }
 if(input.revision!==(current?.revision??0))throw new HttpError(409,"Oppsettet er endret i et annet vindu. Last siden på nytt.");
 if((await client.query("SELECT 1 FROM budget_record WHERE user_id=$1 LIMIT 1",[userId])).rowCount)throw new HttpError(409,"Kontoen har allerede budsjettposter. Oppsettet overskriver dem ikke.");
 if(input.action==="save"){
 if(input.step==="review"){try{onboardingRecords(input.draft,randomUUID);}catch(e){throw new HttpError(400,e instanceof Error?e.message:"Kontroller opplysningene");}}

 const next=input.revision+1;
 await client.query("INSERT INTO onboarding_state(user_id,step,draft,revision) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET step=excluded.step,draft=excluded.draft,revision=excluded.revision,updated_at=now()",[userId,input.step,JSON.stringify(input.draft),next]);
 await client.query("COMMIT");return {step:input.step,draft:input.draft,completed:false,revision:next};
 }
 let built:ReturnType<typeof onboardingRecords>;
 try{built=onboardingRecords(current?.draft??{},randomUUID);}catch(e){throw new HttpError(400,e instanceof Error?e.message:"Kontroller opplysningene");}
 for(const record of built.records)await client.query("INSERT INTO budget_record(id,user_id,body) VALUES($1,$2,$3)",[record.id,userId,JSON.stringify(record)]);
 const previous=await client.query("SELECT body FROM preference WHERE user_id=$1",[userId]);
 const settings=settingsSchema.parse({...previous.rows[0]?.body,budgetIncomeId:built.incomeId,defaultView:"overview",periodCarry:[]});
 await client.query("INSERT INTO preference(user_id,body) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET body=excluded.body",[userId,JSON.stringify(settings)]);
 // Keep only completion metadata after setup; do not retain a second copy of financial values.
 await client.query("INSERT INTO onboarding_state(user_id,step,draft,completed,revision) VALUES($1,'review','{}',true,$2) ON CONFLICT(user_id) DO UPDATE SET completed=true,step='review',draft='{}',revision=excluded.revision,updated_at=now()",[userId,input.revision+1]);
 await client.query("COMMIT");return {completed:true};
 }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
}
