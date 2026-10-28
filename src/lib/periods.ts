import type {BudgetRecord,Occurrence} from "./schema";
import {addMonths,amountAt,datesFor,monthIndex,type MonthResult} from "./engine";
export type PeriodSettings={budgetIncomeId?:string;periodCarry?:{start:string;amount:number}[]};
export type PayPeriod={start:string;end:string;nextStart:string;label:string;incomeId?:string};
const short=(d:string)=>new Date(d+"T12:00:00Z").toLocaleDateString("nb-NO",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});
const previousDay=(d:string)=>new Date(Date.parse(d+"T00:00:00Z")-86400000).toISOString().slice(0,10);
const day=(m:string,n:number)=>m+"-"+String(Math.min(n,new Date(Date.UTC(Number(m.slice(0,4)),Number(m.slice(5,7)),0)).getUTCDate())).padStart(2,"0");
export function primaryIncome(records:BudgetRecord[],settings:PeriodSettings){
 return records.find(r=>r.id===settings.budgetIncomeId&&r.kind==="income"&&r.frequency!=="once")??records.find(r=>r.kind==="income"&&r.frequency!=="once");
}
export function periodOptions(records:BudgetRecord[],settings:PeriodSettings,reference:string):PayPeriod[]{
 const income=primaryIncome(records,settings),dates:string[]=[];
 if(!income){for(let i=-12;i<=25;i++)dates.push(addMonths(reference.slice(0,7),i)+"-01");}
 else if(income.frequency==="monthly"){
 const k=Math.floor((monthIndex(reference.slice(0,7))-monthIndex(income.start.slice(0,7)))/income.interval);
 for(let i=k-12;i<=k+25;i++)dates.push(day(addMonths(income.start.slice(0,7),i*income.interval),Number(income.start.slice(8,10))));
 }else{
 const step=income.interval*7*86400000,first=Date.parse(income.start+"T00:00:00Z"),k=Math.floor((Date.parse(reference+"T00:00:00Z")-first)/step);
 for(let i=k-12;i<=k+25;i++)dates.push(new Date(first+i*step).toISOString().slice(0,10));
 }
 return dates.slice(0,-1).map((start,i)=>({start,nextStart:dates[i+1],end:previousDay(dates[i+1]),label:short(start)+" – "+short(previousDay(dates[i+1])),incomeId:income?.id}));
}
export function activePeriod(periods:PayPeriod[],reference:string){return periods.find(p=>p.start<=reference&&p.nextStart>reference)??periods.find(p=>p.start>reference)??periods[periods.length-1];}
function monthsIn(start:string,end:string){const count=monthIndex(end.slice(0,7))-monthIndex(start.slice(0,7))+1;return Array.from({length:count},(_,i)=>addMonths(start.slice(0,7),i));}
function planSchedule(p:BudgetRecord,income:BudgetRecord|undefined){
 const out:{date:string;amount:number}[]=[];
 if(!p.target)return out;
 const count=monthIndex(p.target.slice(0,7))-monthIndex(p.start.slice(0,7))+1;let remaining=p.amount-p.reserved;
 for(let i=0;i<count;i++){
 const m=addMonths(p.start.slice(0,7),i);
 const amount=Math.min(remaining,p.strategy==="equal"?Math.ceil(remaining/(count-i)):p.strategy==="single"?(p.reserveMonth===m?remaining:0):(p.schedule.find(s=>s.month===m)?.amount??0));
 let date=day(m,Number((income?.frequency==="monthly"?income.start:p.start).slice(8,10)));
 if(date<p.start)date=p.start;if(date>p.target)date=p.target;
 out.push({date,amount});remaining-=amount;
 }return out;
}
export function periodBudget(records:BudgetRecord[],occurrences:Occurrence[],period:PayPeriod,settings:PeriodSettings={}):MonthResult{
 const result:MonthResult={month:period.start.slice(0,7),income:0,expenses:0,savings:0,reservations:0,purchases:0,carry:settings.periodCarry?.find(c=>c.start===period.start)?.amount??0,free:0,released:0,payments:[]};
 const byOccurrence=new Map(occurrences.map(o=>[o.recordId+":"+o.date,o])),inside=(d:string)=>d>=period.start&&d<period.nextStart,income=primaryIncome(records,settings);
 const charge=(kind:string,amount:number)=>{if(kind==="income")result.income+=amount;else if(kind==="saving")result.savings+=amount;else if(kind==="oneoff")result.purchases+=amount;else result.expenses+=amount;};
 for(const r of records){
 if(["account","adjustment"].includes(r.kind))continue;
 if(r.kind==="plan"){
 const schedule=planSchedule(r,income),settled=r.state!=="active"&&r.settledMonth?(r.settledDate??(r.target?.slice(0,7)===r.settledMonth?r.target:day(r.settledMonth,Number((r.target??r.start).slice(8,10))))):undefined;
 for(const allocation of schedule)if((!settled||allocation.date<settled)&&inside(allocation.date))result.reservations+=allocation.amount;
 if(settled){
 const previouslyReserved=r.reserved+schedule.filter(s=>s.date<settled).reduce((sum,s)=>sum+s.amount,0);
 if(inside(settled)){if(r.state==="completed")result.purchases+=(r.actual??r.amount)-previouslyReserved;else result.released+=previouslyReserved;}
 }else if(r.target&&inside(r.target))result.purchases+=r.amount-r.reserved-schedule.reduce((sum,s)=>sum+s.amount,0);
 continue;
 }
 for(const m of monthsIn(period.start,period.end))for(const date of datesFor(r,m).filter(inside)){
 const o=byOccurrence.get(r.id+":"+date),expected=o?.expected??amountAt(r,date),amount=o?.status==="skipped"?0:r.kind==="loan"?Math.max(expected,o?.actual??expected):o?.actual??expected;
 const moved=o?.status==="paid"&&r.kind!=="income"&&o.fundingPeriodStart&&!inside(o.fundingPeriodStart);
 const budgetAmount=moved?(r.kind==="loan"?Math.max(0,expected-(o.actual??expected)):0):amount;
 result.payments.push({budgetAmount,...(o?.fundingPeriodStart?{fundingPeriodStart:o.fundingPeriodStart}:{}),recordId:r.id!,title:r.title,kind:r.kind,date,expected,amount,status:o?.status??"planned",...(r.kind==="loan"&&o?.status==="paid"?{actualPaid:o.actual??expected,remaining:Math.max(0,expected-(o.actual??expected))}:{})});
 charge(r.kind,budgetAmount);
 }
 // Settled future bills still appear at their due date, but their actual cost belongs to the chosen paycheck.
 for(const o of occurrences.filter(o=>o.recordId===r.id&&o.status==="paid"&&o.fundingPeriodStart&&inside(o.fundingPeriodStart)&&!inside(o.date))){
 if(r.kind==="income")continue;
 const expected=o.expected??amountAt(r,o.date),amount=o.actual??expected;
 charge(r.kind,amount);result.payments.push({recordId:r.id!,title:r.title,kind:r.kind,date:o.date,expected,amount,status:o.status,budgetAmount:amount,fundingPeriodStart:o.fundingPeriodStart,fundingOnly:true});
 }
 }
 result.payments.sort((a,b)=>a.date.localeCompare(b.date));
 result.free=result.income-result.expenses-result.savings-result.reservations-result.purchases+result.carry+result.released;
 return result;
}
