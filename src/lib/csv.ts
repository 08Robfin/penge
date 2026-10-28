import { parse } from "csv-parse/sync";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { parseNok } from "./engine";
import { recordSchema,type BudgetRecord } from "./schema";
export const csvSchema=z.object({csv:z.string().max(1_000_000),year:z.number().int().min(2000).max(2100),mapping:z.record(z.string(),z.enum(["month","income","expense","saving","leftover","ignore"]))}).strict();
const names=["januar","februar","mars","april","mai","juni","juli","august","september","oktober","november","desember"];
export function csvPreview(input:unknown){
 const {csv,year,mapping}=csvSchema.parse(input);
 const monthColumns=Object.entries(mapping).filter(([,v])=>v==="month");
 if(monthColumns.length!==1)throw Error("Velg én månedskolonne");
 const rows=parse(csv,{columns:true,skip_empty_lines:true,bom:true,delimiter:csv.split(/\r?\n/)[0].includes(";")?";":",",max_record_size:20000}) as Record<string,string>[];
 if(rows.length>1200)throw Error("Maksimalt 1200 rader");
 const records:BudgetRecord[]=[],warnings:string[]=[];
 let accountId:string|undefined;
 const seen=new Set<string>();
 for(const [index,row] of rows.entries()){
 const raw=(row[monthColumns[0][0]]??"").trim().toLowerCase();
 let m=raw.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/)?.slice(1).join("-");
 if(!m){const found=names.findIndex(n=>raw.startsWith(n));if(found>=0)m=(raw.match(/\d{4}/)?.[0]??String(year))+"-"+String(found+1).padStart(2,"0");}
 if(!m||!/^\d{4}-(0[1-9]|1[0-2])$/.test(m))throw Error("Ugyldig måned på rad "+(index+2));
 for(const [column,kind]of Object.entries(mapping)){
 if(kind==="month"||kind==="ignore"||!row[column]?.trim())continue;
 if(kind==="leftover"){warnings.push(m+": «"+column+"» er bare en tidligere prognose og importeres ikke som utgift.");continue;}
 const amount=parseNok(row[column]);if(amount<0)throw Error("Negative importbeløp må gjennomgås manuelt");
 if(kind==="saving"&&!accountId){accountId=randomUUID();records.push(recordSchema.parse({id:accountId,kind:"account",title:"Importert sparing",amount:0,start:m+"-01"}));}
 const key=m+":"+column;if(seen.has(key))throw Error("Duplisert måned/kolonne: "+key);seen.add(key);
 records.push(recordSchema.parse({id:randomUUID(),kind:kind==="income"?"income":kind==="saving"?"saving":"expense",title:column,amount,start:m+"-01",frequency:"once",accountId:kind==="saving"?accountId:undefined,notes:"Importert fra regneark. Betalingsstatus må bekreftes manuelt."}));
 }
 }
 return {records,warnings:[...new Set(warnings),"CSV bevarer ikke cellefarger. Ingen betalinger merkes som betalt.","Velg enten netto utbetalt eller lønn + barnepensjon som inntekt, aldri begge."]};
}
