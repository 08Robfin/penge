import { db } from "./db";
import { randomUUID } from "node:crypto";
import { recordSchema,occurrenceSchema,exportSchema,type BudgetRecord,type Occurrence } from "./schema";
import { datesFor,amountAt } from "./engine";
import {periodOptions} from "./periods";
export class HttpError extends Error{constructor(public status:number,message:string){super(message);}}
export async function snapshot(userId:string){
 const [records,occurrences,reconciliations,settings]=await Promise.all([
 db.query("SELECT id,body FROM budget_record WHERE user_id=$1 ORDER BY created_at,id",[userId]),
 db.query("SELECT body FROM occurrence WHERE user_id=$1 ORDER BY date,record_id",[userId]),
 db.query("SELECT body FROM reconciliation WHERE user_id=$1 ORDER BY month",[userId]),
 db.query("SELECT body FROM preference WHERE user_id=$1",[userId])
 ]);
 return exportSchema.parse({schemaVersion:2,records:records.rows.map(r=>({...r.body,id:r.id})),occurrences:occurrences.rows.map(r=>r.body),reconciliations:reconciliations.rows.map(r=>r.body),settings:settings.rows[0]?.body??{}});
}
export async function saveRecord(userId:string,input:unknown){
 const r=recordSchema.parse(input);const id=r.id??randomUUID();
 if(r.accountId){
 const account=await db.query("SELECT 1 FROM budget_record WHERE id=$1 AND user_id=$2 AND body->>'kind'='account'",[r.accountId,userId]);
 if(!account.rowCount)throw new HttpError(400,"Ugyldig sparekonto");
 }
 if(r.id){
 const history=await db.query("SELECT body FROM occurrence WHERE user_id=$1 AND record_id=$2",[userId,r.id]);
 if(history.rows.some(row=>!datesFor(r,row.body.date.slice(0,7)).includes(row.body.date)))throw new HttpError(409,"Endringen flytter en registrert betaling. Behold datoene, eller avslutt posten og opprett en ny avtale.");
 const updated=await db.query("UPDATE budget_record SET body=$1,updated_at=now() WHERE id=$2 AND user_id=$3 RETURNING id",[JSON.stringify(r),id,userId]);
 if(!updated.rowCount)throw new HttpError(404,"Fant ikke posten");
 }else await db.query("INSERT INTO budget_record(id,user_id,body) VALUES($1,$2,$3)",[id,userId,JSON.stringify({...r,id})]);
 return {...r,id};
}
export async function saveOccurrence(userId:string,input:unknown){
 const o=occurrenceSchema.parse(input);
 const found=await db.query("SELECT body FROM budget_record WHERE user_id=$1 AND id=$2",[userId,o.recordId]);
 if(!found.rowCount)throw new HttpError(404,"Fant ikke posten");
 const r=recordSchema.parse(found.rows[0].body);
 if(!datesFor(r,o.date.slice(0,7)).includes(o.date))throw new HttpError(400,"Betalingen finnes ikke på denne datoen");
 if(o.fundingPeriodStart){
 if(!["expense","subscription","loan","saving","oneoff"].includes(r.kind))throw new HttpError(400,"Denne posten kan ikke betales med en annen lønning");
 const data=await snapshot(userId);
 if(!periodOptions(data.records,data.settings,o.fundingPeriodStart).some(p=>p.start===o.fundingPeriodStart))throw new HttpError(400,"Velg en gyldig lønningsperiode");
 }
 if(o.status==="paid"&&o.actual===undefined)o.actual=amountAt(r,o.date);
 if(o.expected===undefined)o.expected=amountAt(r,o.date);
 if(o.status==="paid"&&!o.paidDate)o.paidDate=new Date().toISOString().slice(0,10);
 await db.query("INSERT INTO occurrence(user_id,record_id,date,body) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,record_id,date) DO UPDATE SET body=excluded.body",[userId,o.recordId,o.date,JSON.stringify(o)]);
 return o;
}
export function prepareSnapshot(input:unknown){
 const data=exportSchema.parse(input);
 const ids=new Map<string,string>();
 for(const r of data.records){if(!r.id||ids.has(r.id))throw new HttpError(400,"Manglende eller duplisert post-ID");ids.set(r.id,randomUUID());}
 if(data.settings.budgetIncomeId){const mapped=ids.get(data.settings.budgetIncomeId);if(!mapped)throw new HttpError(400,"Lønnsinntekten mangler i importen");data.settings.budgetIncomeId=mapped;}
 const records:BudgetRecord[]=data.records.map(r=>({...r,id:ids.get(r.id!)!,accountId:r.accountId?ids.get(r.accountId):undefined}));
 if(data.settings.budgetIncomeId&&!records.some(r=>r.id===data.settings.budgetIncomeId&&r.kind==="income"&&r.frequency!=="once"))throw new HttpError(400,"Velg en gjentakende inntekt som lønningsplan");
 for(let i=0;i<data.records.length;i++){
 const original=data.records[i],r=records[i];
 if(original.accountId&&(!r.accountId||!records.some(a=>a.id===r.accountId&&a.kind==="account")))throw new HttpError(400,"Ugyldig kontoreferanse");
 }
 const occurrences:Occurrence[]=data.occurrences.map(o=>{
 const id=ids.get(o.recordId);if(!id)throw new HttpError(400,"Ugyldig betalingsreferanse");
 const r=records.find(r=>r.id===id)!;
 if(o.fundingPeriodStart&&!["expense","subscription","loan","saving","oneoff"].includes(r.kind))throw new HttpError(400,"Ugyldig lønning på inntekt");
 if(!datesFor(r,o.date.slice(0,7)).includes(o.date))throw new HttpError(400,"Ugyldig betalingsdato");
 return {...o,recordId:id};
 });
 if(new Set(occurrences.map(o=>o.recordId+o.date)).size!==occurrences.length||new Set(data.reconciliations.map(r=>r.month)).size!==data.reconciliations.length)throw new HttpError(400,"Dupliserte rader");
 return {data,records,occurrences};
}
export async function replaceSnapshot(userId:string,input:unknown){
 const {data,records,occurrences}=prepareSnapshot(input);
 const client=await db.connect();
 try{
 await client.query("BEGIN");
 await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[userId]);
 await client.query("DELETE FROM budget_record WHERE user_id=$1",[userId]);
 await client.query("DELETE FROM reconciliation WHERE user_id=$1",[userId]);
 for(const r of records)await client.query("INSERT INTO budget_record(id,user_id,body) VALUES($1,$2,$3)",[r.id,userId,JSON.stringify(r)]);
 for(const o of occurrences)await client.query("INSERT INTO occurrence(user_id,record_id,date,body) VALUES($1,$2,$3,$4)",[userId,o.recordId,o.date,JSON.stringify(o)]);
 for(const r of data.reconciliations)await client.query("INSERT INTO reconciliation(user_id,month,body) VALUES($1,$2,$3)",[userId,r.month,JSON.stringify(r)]);
 await client.query("INSERT INTO preference(user_id,body) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET body=excluded.body",[userId,JSON.stringify(data.settings)]);
 await client.query("COMMIT");
 }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
 return {records:records.length};
}
