import type { BudgetRecord, Occurrence, Reconciliation } from "./schema";
export const formatNok=(ore:number)=>new Intl.NumberFormat("nb-NO",{style:"currency",currency:"NOK",maximumFractionDigits:ore%100?2:0}).format(ore/100);
export function parseNok(value:string):number{
 const v=value.replace(/\s|\u00a0|kr/gi,"").replace(/\./g,"").replace(",",".");
 if(!/^-?\d+(\.\d{1,2})?$/.test(v))throw Error("Bruk norske beløp, f.eks. 1 250,50");
 const [whole,fraction=""]=v.replace("-","").split(".");
 const amount=Number(whole)*100+Number(fraction.padEnd(2,"0"));
 if(!Number.isSafeInteger(amount)||amount>100_000_000_000)throw Error("Beløpet er for stort");
 return v.startsWith("-")?-amount:amount;
}
export const monthIndex=(m:string)=>Number(m.slice(0,4))*12+Number(m.slice(5,7))-1;
export function addMonths(m:string,n:number){const i=monthIndex(m)+n;return String(Math.floor(i/12)).padStart(4,"0")+"-"+String(i%12+1).padStart(2,"0");}
function clampDate(m:string,day:number){const [y,mo]=m.split("-").map(Number);const last=new Date(Date.UTC(y,mo,0)).getUTCDate();return m+"-"+String(Math.min(day,last)).padStart(2,"0");}
export function datesFor(r:BudgetRecord,m:string):string[]{
 if(r.kind==="account"||r.kind==="plan"||r.kind==="adjustment")return [];
 const startMonth=r.start.slice(0,7), diff=monthIndex(m)-monthIndex(startMonth);
 if(diff<0||r.end&&m>r.end.slice(0,7))return [];
 let dates:string[]=[];
 if(r.frequency==="once"||r.kind==="oneoff"){if(startMonth===m)dates=[r.start];}
 else if(r.frequency==="monthly"){if(diff%r.interval===0)dates=[clampDate(m,Number(r.start.slice(8,10)))];}
 else {
 const start=new Date(r.start+"T00:00:00Z").getTime(),first=Date.parse(m+"-01T00:00:00Z"),next=Date.parse(addMonths(m,1)+"-01T00:00:00Z"),step=r.interval*7*86400000;
 for(let d=start+Math.max(0,Math.ceil((first-start)/step))*step;d<next;d+=step)dates.push(new Date(d).toISOString().slice(0,10));
 }
 return dates.filter(d=>d>=r.start&&(!r.end||d<=r.end));
}
export function amountAt(r:BudgetRecord,d:string){return [...r.rates].filter(v=>v.from<=d).sort((a,b)=>b.from.localeCompare(a.from))[0]?.amount??r.amount;}
function allocations(p:BudgetRecord){
 const out=new Map<string,number>();
 if(!p.target)return out;
 const count=monthIndex(p.target.slice(0,7))-monthIndex(p.start.slice(0,7))+1;
 let remaining=p.amount-p.reserved;
 for(let i=0;i<count;i++){
 const m=addMonths(p.start.slice(0,7),i);
 let value=p.strategy==="equal"?Math.ceil(remaining/(count-i)):p.strategy==="single"?(m===p.reserveMonth?remaining:0):(p.schedule.find(s=>s.month===m)?.amount??0);
 value=Math.min(remaining,value);out.set(m,value);remaining-=value;
 }
 return out;
}
export type MonthResult={month:string;income:number;expenses:number;savings:number;reservations:number;purchases:number;carry:number;free:number;released:number;payments:{recordId:string;title:string;kind:string;date:string;expected:number;amount:number;status:string;remaining?:number;actualPaid?:number;fundingPeriodStart?:string;fundingOnly?:boolean;budgetAmount?:number}[]};
export function forecast(records:BudgetRecord[],occurrences:Occurrence[],reconciliations:Reconciliation[],months:string[],scenario={extraSavings:0,purchase:0,purchaseMonth:"",extraIncome:0}):MonthResult[]{
 const byOccurrence=new Map(occurrences.map(o=>[o.recordId+":"+o.date,o]));
 return months.map(month=>{
 const result:MonthResult={month,income:scenario.extraIncome,expenses:0,savings:scenario.extraSavings,reservations:0,purchases:0,carry:0,free:0,released:0,payments:[]};
 const recon=reconciliations.find(r=>r.month===addMonths(month,-1));
 if(recon)result.carry=recon.mode==="carry"?recon.amount:recon.amount-recon.reserved;
 for(const r of records){
 if(r.kind==="account"||r.kind==="adjustment")continue;
 if(r.kind==="plan"){
 const schedule=allocations(r);const settlement=r.settledMonth;
 if(settlement&&month>settlement)continue;
 let allocatedBefore=r.reserved;
 for(const [m,a]of schedule)if(m<month)allocatedBefore+=a;
 if(settlement&&month===settlement&&r.state!=="active"){
 if(r.state==="completed")result.purchases+=(r.actual??r.amount)-allocatedBefore;
 else result.released+=allocatedBefore;
 continue;
 }
 result.reservations+=schedule.get(month)??0;
 if(month===r.target?.slice(0,7)){
 const total=r.reserved+[...schedule.values()].reduce((a,b)=>a+b,0);
 result.purchases+=r.amount-total;
 }
 continue;
 }
 for(const d of datesFor(r,month)){
 const o=byOccurrence.get(r.id+":"+d),expected=o?.expected??amountAt(r,d),amount=o?.status==="skipped"?0:r.kind==="loan"?Math.max(expected,o?.actual??expected):o?.actual??expected;
 result.payments.push({recordId:r.id!,title:r.title,kind:r.kind,date:d,expected,amount,status:o?.status??"planned",...(r.kind==="loan"&&o?.status==="paid"?{actualPaid:o.actual??expected,remaining:Math.max(0,expected-(o.actual??expected))}:{})});
 if(r.kind==="income")result.income+=amount;
 else if(r.kind==="saving")result.savings+=amount;
 else if(r.kind==="oneoff")result.purchases+=amount;
 else result.expenses+=amount;
 }
 }
 if(scenario.purchaseMonth===month)result.purchases+=scenario.purchase;
 result.free=result.income-result.expenses-result.savings-result.reservations-result.purchases+result.carry+result.released;
 result.payments.sort((a,b)=>a.date.localeCompare(b.date));
 return result;
 });
}
export function savingsBalance(account:BudgetRecord,records:BudgetRecord[],occurrences:Occurrence[],asOf:string){
 return (account.start<=asOf?account.amount:0)+records.filter(r=>r.kind==="adjustment"&&r.accountId===account.id&&r.start<=asOf).reduce((sum,r)=>sum+(r.direction==="debit"?-r.amount:r.amount),0)+occurrences.filter(o=>o.status==="paid"&&(o.paidDate??o.date)<=asOf).reduce((total,o)=>{
 const r=records.find(r=>r.id===o.recordId&&r.kind==="saving"&&r.accountId===account.id);
 return r?total+(o.actual??amountAt(r,o.date)):total;
 },0);
}
