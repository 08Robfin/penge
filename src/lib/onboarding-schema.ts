import {z} from "zod";
import {recordSchema,date} from "./schema";
import {parseNok} from "./engine";
export const cadence=z.enum(["monthly","weekly","fortnightly","quarterly","yearly","once"]);
export const stepSchema=z.enum(["welcome","income-name","income-amount","income-date","income-frequency","expenses","expense-name","expense-amount","expense-date","expense-frequency","savings","savings-amount","review"]);
const inputText=z.string().max(120);
export const expenseDraft=z.object({id:z.uuid(),kind:z.enum(["expense","subscription","loan"]),name:inputText.default(""),amount:z.string().max(30).default(""),date:z.string().max(10).default(""),cadence:cadence.default("monthly")}).strict();
const completedExpense=expenseDraft.superRefine((e,c)=>{
 if(!e.name.trim())c.addIssue({code:"custom",message:"Gi betalingen et navn"});
 try{if(parseNok(e.amount)<=0)throw Error();}catch{c.addIssue({code:"custom",message:"Oppgi et gyldig betalingsbeløp"});}
 if(!date.safeParse(e.date).success)c.addIssue({code:"custom",message:"Oppgi første forfallsdato"});
});
export const onboardingDraft=z.object({
 income:z.object({name:inputText.default("Lønn"),amount:z.string().max(30).default(""),date:z.string().max(10).default(""),cadence:z.enum(["monthly","weekly","fortnightly"]).default("monthly")}).strict().default({name:"Lønn",amount:"",date:"",cadence:"monthly"}),
 expenses:z.array(completedExpense).max(100).default([]),
 editing:expenseDraft.optional(),
 savings:z.object({enabled:z.boolean().default(false),amount:z.string().max(30).default("")}).strict().default({enabled:false,amount:""})
}).strict().refine(d=>new Set(d.expenses.map(e=>e.id)).size===d.expenses.length,"Dupliserte betalinger");
export type OnboardingDraft=z.infer<typeof onboardingDraft>;
export type OnboardingStep=z.infer<typeof stepSchema>;
export type OnboardingState={step:OnboardingStep;draft:OnboardingDraft;completed:boolean;revision:number};
export const emptyDraft=()=>onboardingDraft.parse({});
export const onboardingRequest=z.discriminatedUnion("action",[
 z.object({action:z.literal("save"),revision:z.number().int().nonnegative(),step:stepSchema,draft:onboardingDraft}).strict(),
 z.object({action:z.literal("complete"),revision:z.number().int().nonnegative()}).strict()
]);
export function recurrence(value:z.infer<typeof cadence>){
 return {frequency:value==="once"?"once" as const:value==="weekly"||value==="fortnightly"?"weekly" as const:"monthly" as const,interval:value==="fortnightly"?2:value==="quarterly"?3:value==="yearly"?12:1};
}
export function onboardingRecords(input:unknown,makeId:()=>string){
 const draft=onboardingDraft.parse(input);
 if(draft.editing)throw Error("Lagre eller avbryt betalingen før du fullfører oppsettet");
 const income=recordSchema.parse({id:makeId(),kind:"income",title:draft.income.name,amount:parseNok(draft.income.amount),start:date.parse(draft.income.date),...recurrence(draft.income.cadence)});
 if(income.amount<=0)throw Error("Legg inn en inntekt som er større enn 0 kr");
 const records=[income];
 for(const e of draft.expenses){
 if(!e.name.trim())throw Error("Gi betalingen et navn");
 records.push(recordSchema.parse({id:makeId(),kind:e.kind,title:e.name,amount:parseNok(e.amount),start:date.parse(e.date),...recurrence(e.cadence)}));
 }
 if(draft.savings.enabled){
 const amount=parseNok(draft.savings.amount);if(amount<=0)throw Error("Sparebeløpet må være større enn 0 kr");
 const account=recordSchema.parse({id:makeId(),kind:"account",title:"Sparing",amount:0,start:income.start});
 records.push(account,recordSchema.parse({id:makeId(),kind:"saving",title:"Fast sparing",amount,start:income.start,accountId:account.id,...recurrence(draft.income.cadence)}));
 }
 return {records,incomeId:income.id!};
}
