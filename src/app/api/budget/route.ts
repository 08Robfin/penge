import { onboardingState } from "@/lib/onboarding";
import { isAdmin } from "@/lib/admin";
import { z } from "zod";
import { identity,assertOrigin,body,errorResponse,limit } from "@/lib/http";
import { snapshot,saveRecord,saveOccurrence,replaceSnapshot,prepareSnapshot,HttpError } from "@/lib/store";
import { reconciliationSchema,settingsSchema,exportSchema } from "@/lib/schema";
import { db } from "@/lib/db";
export const dynamic="force-dynamic";
export async function GET(){
 try{const s=await identity();return Response.json({user:{name:s.user.name,email:s.user.email,isAdmin:await isAdmin(s.user.id)},data:await snapshot(s.user.id),onboarding:await onboardingState(s.user.id)});}catch(e){return errorResponse(e);}
}
export async function POST(req:Request){
 try{
 assertOrigin(req);const s=await identity();
 const input=z.object({action:z.enum(["record","occurrence","reconcile","settings","preview","replace","delete"]),payload:z.unknown(),confirmation:z.string().optional()}).strict().parse(await body(req));
 await limit("budget:"+s.user.id); const id=s.user.id;
 if(["record","occurrence","reconcile","replace","delete"].includes(input.action)&&(await db.query("SELECT 1 FROM onboarding_state WHERE user_id=$1 AND completed=false",[id])).rowCount)throw new HttpError(409,"Fullfør oppsettet før du endrer budsjettet.");
 if(input.action==="record")return Response.json(await saveRecord(id,input.payload));
 if(input.action==="occurrence")return Response.json(await saveOccurrence(id,input.payload));
 if(input.action==="reconcile"){
 const r=reconciliationSchema.parse(input.payload);
 if(r.month>=new Date().toLocaleDateString("sv-SE",{timeZone:"Europe/Oslo"}).slice(0,7))throw new HttpError(400,"Avstem bare avsluttede måneder");
 await db.query("INSERT INTO reconciliation(user_id,month,body) VALUES($1,$2,$3) ON CONFLICT(user_id,month) DO UPDATE SET body=excluded.body",[id,r.month,JSON.stringify(r)]);return Response.json({ok:true});
 }
 if(input.action==="settings"){
 const p=settingsSchema.parse(input.payload);
 if(p.budgetIncomeId&&!(await db.query("SELECT 1 FROM budget_record WHERE id=$1 AND user_id=$2 AND body->>'kind'='income' AND body->>'frequency'<>'once'",[p.budgetIncomeId,id])).rowCount)throw new HttpError(400,"Velg din egen gjentakende inntekt");
 await db.query("INSERT INTO preference(user_id,body) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET body=excluded.body",[id,JSON.stringify(p)]);return Response.json({ok:true});
 }
 if(input.action==="preview"){
 const {data}=prepareSnapshot(input.payload);
 return Response.json({records:data.records.length,occurrences:data.occurrences.length,reconciliations:data.reconciliations.length});
 }
 if(input.action==="replace"){
 if(input.confirmation!=="ERSTATT")throw new HttpError(400,"Skriv ERSTATT for å bekrefte");
 return Response.json(await replaceSnapshot(id,input.payload));
 }
 if(input.action==="delete"){
 const target=z.uuid().parse(input.payload);
 if(input.confirmation!=="SLETT")throw new HttpError(400,"Sletting må bekreftes");
 if((await db.query("SELECT 1 FROM budget_record WHERE user_id=$1 AND body->>'accountId'=$2",[id,target])).rowCount)throw new HttpError(409,"Kontoen brukes av en spareavtale");
 const r=await db.query("DELETE FROM budget_record WHERE user_id=$1 AND id=$2 RETURNING id",[id,target]);
 if(!r.rowCount)throw new HttpError(404,"Fant ikke posten");
 await db.query("UPDATE preference SET body=body-'budgetIncomeId' WHERE user_id=$1 AND body->>'budgetIncomeId'=$2",[id,target]);
 return Response.json({ok:true});
 }
 return Response.json({error:"Ukjent handling"},{status:400});
 }catch(e){return errorResponse(e);}
}
