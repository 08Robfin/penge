import { z } from "zod";
export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,"Ugyldig dato");
export const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const money = z.number().int().min(0).max(100_000_000_000);
export const signedMoney = z.number().int().min(-100_000_000_000).max(100_000_000_000);
export const recordSchema = z.object({
 id:z.uuid().optional(),
 kind:z.enum(["income","expense","subscription","saving","account","plan","oneoff","adjustment","loan"]),
 title:z.string().trim().min(1).max(120),
 amount:money,
 start:date,
 end:date.optional(),
 frequency:z.enum(["monthly","weekly","once"]).default("monthly"),
 interval:z.number().int().min(1).max(120).default(1),
 rates:z.array(z.object({from:date,amount:money}).strict()).max(120).default([]),
 category:z.string().max(80).default(""),
 notes:z.string().max(2000).default(""),
 accountId:z.uuid().optional(),
 goalAmount:money.optional(),
 loanBalance:money.optional(),
 loanAsOf:date.optional(),
 settledDate:date.optional(),
 direction:z.enum(["credit","debit"]).default("credit"),
 target:date.optional(),
 reserved:money.default(0),
 strategy:z.enum(["equal","single","custom"]).default("equal"),
 reserveMonth:month.optional(),
 schedule:z.array(z.object({month,amount:money}).strict()).max(120).default([]),
 priority:z.enum(["low","normal","high"]).default("normal"),
 state:z.enum(["active","completed","cancelled","archived"]).default("active"),
 settledMonth:month.optional(),
 actual:money.optional(),
 website:z.url().refine(v=>v.startsWith("https://"),"Bruk https").optional(),
}).strict().superRefine((v,c)=>{
 const fail=(message:string)=>c.addIssue({code:"custom",message});
 if(v.end&&v.end<v.start)fail("Sluttdato må være etter startdato");
 if(new Set(v.rates.map(r=>r.from)).size!==v.rates.length)fail("Dupliserte endringsdatoer");
 if(["saving","adjustment"].includes(v.kind)&&!v.accountId)fail("Velg sparekonto");
 if(v.kind==="loan"&&v.loanBalance!==undefined&&!v.loanAsOf)fail("Oppgi datoen restgjelden gjelder");
 if(v.kind==="plan"&&v.settledDate&&(v.settledDate<v.start||v.settledDate>(v.target??"")))fail("Avslutningsdato må være innen planperioden");
 if(v.settledDate&&v.settledDate.slice(0,7)!==v.settledMonth)fail("Avslutningsdato må være i valgt avslutningsmåned");
 if(v.kind==="plan"){
 if(!v.target||v.target<v.start)fail("Velg en måldato etter startdato");
 if(v.target&&((Number(v.target.slice(0,4))-Number(v.start.slice(0,4)))*12+Number(v.target.slice(5,7))-Number(v.start.slice(5,7)))>119)fail("Planer kan gå over maksimalt 120 måneder");
 if(v.settledMonth&&(v.settledMonth<v.start.slice(0,7)||v.settledMonth>(v.target??"").slice(0,7)))fail("Avslutningsmåned må være innen planperioden");
 if(v.reserved>v.amount)fail("Reservert beløp kan ikke overstige målet");
 if(v.strategy==="single"&&(!v.reserveMonth||v.reserveMonth<v.start.slice(0,7)||v.reserveMonth>(v.target??"").slice(0,7)))fail("Velg en gyldig avsetningsmåned");
 if(new Set(v.schedule.map(s=>s.month)).size!==v.schedule.length)fail("Dupliserte måneder");
 if(v.schedule.some(s=>s.month<v.start.slice(0,7)||s.month>(v.target??"").slice(0,7)))fail("Avsetning utenfor planperioden");
 if(v.schedule.reduce((a,s)=>a+s.amount,0)>v.amount-v.reserved)fail("Avsetning overstiger gjenstående mål");
 if(v.state!=="active"&&!v.settledMonth)fail("Oppgi avslutningsmåned");
 }
});
export type BudgetRecord = z.infer<typeof recordSchema>;
export const occurrenceSchema=z.object({recordId:z.uuid(),date,status:z.enum(["planned","paid","skipped"]),actual:money.optional(),expected:money.optional(),paidDate:date.optional(),fundingPeriodStart:date.optional(),notes:z.string().max(1000).default("")}).strict().refine(o=>!o.fundingPeriodStart||o.status==="paid","Velg lønning bare for fullførte betalinger");
export type Occurrence=z.infer<typeof occurrenceSchema>;
export const reconciliationSchema=z.object({month,amount:signedMoney,mode:z.enum(["carry","balance"]),reserved:money.default(0)}).strict();
export type Reconciliation=z.infer<typeof reconciliationSchema>;
export const settingsSchema=z.object({theme:z.enum(["system","light","dark"]).default("system"),defaultView:z.enum(["overview","forecast"]).default("overview"),budgetIncomeId:z.uuid().optional(),periodCarry:z.array(z.object({start:date,amount:signedMoney}).strict()).max(1200).default([])}).strict().refine(s=>new Set(s.periodCarry.map(c=>c.start)).size===s.periodCarry.length,"Dupliserte lønningsperioder");
const currentExportSchema=z.object({schemaVersion:z.literal(2),records:z.array(recordSchema).max(3000),occurrences:z.array(occurrenceSchema).max(30000),reconciliations:z.array(reconciliationSchema).max(1200),settings:settingsSchema}).strict();

export type BudgetSettings=z.infer<typeof settingsSchema>;

export const exportSchema=z.preprocess(value=>value&&typeof value==="object"&&"schemaVersion" in value&&value.schemaVersion===1?{...value,schemaVersion:2}:value,currentExportSchema);
