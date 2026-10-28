import {test} from "node:test";import assert from "node:assert/strict";import {randomUUID} from "node:crypto";
import {recordSchema,settingsSchema} from "../src/lib/schema";
import {periodOptions,activePeriod,periodBudget} from "../src/lib/periods";
const r=(v:Record<string,unknown>)=>recordSchema.parse({id:randomUUID(),kind:"income",title:"Test",amount:100000,start:"2026-11-12",...v});
test("monthly salary starts each independent period on payday",()=>{const salary=r({}),periods=periodOptions([salary],{},"2026-10-27"),p=activePeriod(periods,"2026-10-27");assert.equal(p.start,"2026-10-12");assert.equal(p.end,"2026-11-11");const next=periods.find(p=>p.start==="2026-12-12")!;assert.equal(periodBudget([salary],[],p).free,0);assert.equal(periodBudget([salary],[],next).free,100000);});
test("bills, subscriptions, loan minimums and savings cross calendar months exactly once",()=>{const salary=r({amount:1000000}),account=r({kind:"account",amount:0}),bill=r({kind:"expense",start:"2026-12-01",amount:100000}),sub=r({kind:"subscription",start:"2026-11-20",amount:10000}),loan=r({kind:"loan",start:"2026-12-05",amount:50000,loanBalance:9000000,loanAsOf:"2026-10-27"}),saving=r({kind:"saving",accountId:account.id,start:"2026-11-15",amount:200000});const records=[salary,account,bill,sub,loan,saving],period=periodOptions(records,{},"2026-11-12")[0];const p=activePeriod(periodOptions(records,{},"2026-11-12"),"2026-11-12"),result=periodBudget(records,[],p);assert.equal(result.income,1000000);assert.equal(result.expenses,160000);assert.equal(result.savings,200000);assert.equal(result.free,640000);assert.equal(result.payments.filter(p=>p.kind==="loan").length,1);});
test("other income within the period is added, next payday is excluded",()=>{const salary=r({}),extra=r({start:"2026-11-20",amount:30000});const p=activePeriod(periodOptions([salary,extra],{},"2026-11-12"),"2026-11-12");assert.equal(periodBudget([salary,extra],[],p).income,130000);assert.equal(periodBudget([salary,extra],[],p).payments.filter(p=>p.kind==="income").length,2);});
test("fortnightly periods deduct only bills due before the following pay",()=>{const salary=r({frequency:"weekly",interval:2}),bill=r({kind:"expense",frequency:"once",start:"2026-11-26",amount:10000});const options=periodOptions([salary,bill],{},"2026-11-12"),first=activePeriod(options,"2026-11-12"),second=options.find(p=>p.start==="2026-11-26")!;assert.equal(first.end,"2026-11-25");assert.equal(periodBudget([salary,bill],[],first).expenses,0);assert.equal(periodBudget([salary,bill],[],second).expenses,10000);});
test("31st monthly payday clamps and returns to original day",()=>{const salary=r({start:"2026-01-31"});const options=periodOptions([salary],{},"2026-02-01");assert.equal(activePeriod(options,"2026-02-01").end,"2026-02-27");assert.equal(activePeriod(options,"2026-02-28").nextStart,"2026-03-31");});
test("one-time incomes never silently become recurring salary",()=>{const once=r({frequency:"once"}),p=activePeriod(periodOptions([once],{},"2026-12-01"),"2026-12-01");assert.equal(p.incomeId,undefined);assert.equal(periodBudget([once],[],p).income,0);});
test("paid loan minimum remains deducted once and debt is not used as expense",()=>{const salary=r({amount:200000}),loan=r({kind:"loan",start:"2026-11-15",amount:50000,loanBalance:10000000,loanAsOf:"2026-11-12"}),p=activePeriod(periodOptions([salary,loan],{},"2026-11-12"),"2026-11-12");const f=periodBudget([salary,loan],[{recordId:loan.id!,date:"2026-11-15",status:"paid",actual:55000,notes:""}],p);assert.equal(f.expenses,55000);assert.equal(f.free,145000);});
test("monthly plan reservations fall in the paycheck that must fund the purchase",()=>{const salary=r({amount:1000000}),plan=r({kind:"plan",amount:100000,reserved:20000,start:"2026-11-01",target:"2026-12-05"}),p=activePeriod(periodOptions([salary,plan],{},"2026-11-12"),"2026-11-12");const f=periodBudget([salary,plan],[],p);assert.equal(f.reservations,80000);assert.equal(f.purchases,0);assert.equal(f.free,920000);});
test("plan completion within the same pay period does not count reserved money twice",()=>{const salary=r({amount:1000000}),plan=r({kind:"plan",amount:100000,reserved:20000,start:"2026-11-01",target:"2026-12-05",state:"completed",settledMonth:"2026-12",settledDate:"2026-12-01",actual:110000}),p=activePeriod(periodOptions([salary,plan],{},"2026-11-12"),"2026-11-12");const f=periodBudget([salary,plan],[],p);assert.equal(f.reservations+f.purchases,90000);});
test("only an explicit carry for this exact payday is added",()=>{const salary=r({}),options=periodOptions([salary],{},"2026-11-12"),p=activePeriod(options,"2026-11-12"),next=options.find(p=>p.start==="2026-12-12")!,settings={periodCarry:[{start:p.start,amount:12345}]};assert.equal(periodBudget([salary],[],p,settings).carry,12345);assert.equal(periodBudget([salary],[],next,settings).carry,0);});
test("loan and period settings validate amounts and duplicate carries",()=>{assert.equal(recordSchema.safeParse({...r({}),kind:"loan",loanBalance:100}).success,false);assert.equal(settingsSchema.safeParse({periodCarry:[{start:"2026-11-12",amount:1},{start:"2026-11-12",amount:2}]}).success,false);});

test("a partial loan payment still reserves the unpaid minimum",()=>{const salary=r({amount:200000}),loan=r({kind:"loan",start:"2026-11-15",amount:50000,loanBalance:10000000,loanAsOf:"2026-11-12"}),p=activePeriod(periodOptions([salary,loan],{},"2026-11-12"),"2026-11-12");const f=periodBudget([salary,loan],[{recordId:loan.id!,date:"2026-11-15",status:"paid",actual:20000,notes:""}],p);assert.equal(f.expenses,50000);assert.equal(f.payments.find(p=>p.kind==="loan")?.remaining,30000);});

test("earlier pay periods stay visible without inventing earlier salary",()=>{const salary=r({});const p=activePeriod(periodOptions([salary],{},"2026-10-27"),"2026-10-27");assert.equal(p.start,"2026-10-12");assert.equal(periodBudget([salary],[],p).income,0);});
test("early payment debits chosen paycheck and releases its original paycheck exactly once",()=>{
 const salary=r({start:"2026-10-12",amount:1000000}),loan=r({kind:"loan",start:"2026-11-15",amount:100000}),records=[salary,loan],options=periodOptions(records,{},"2026-10-27"),oct=activePeriod(options,"2026-10-27"),nov=activePeriod(options,"2026-11-15");
 const occurrence={recordId:loan.id!,date:"2026-11-15",status:"paid" as const,actual:100000,fundingPeriodStart:oct.start,notes:""};
 const before=periodBudget(records,[],nov),current=periodBudget(records,[occurrence],oct),future=periodBudget(records,[occurrence],nov);
 assert.equal(before.free,900000);assert.equal(current.free,900000);assert.equal(future.free,1000000);
 assert.equal(current.payments.find(p=>p.recordId===loan.id)?.fundingOnly,true);assert.equal(future.payments.find(p=>p.recordId===loan.id)?.status,"paid");
 assert.equal(current.expenses+future.expenses,100000);
 const fromNext={...occurrence,fundingPeriodStart:nov.start};assert.equal(periodBudget(records,[fromNext],oct).free,1000000);assert.equal(periodBudget(records,[fromNext],nov).free,900000);
 assert.equal(periodBudget(records,[{...occurrence,status:"planned",fundingPeriodStart:undefined}],oct).expenses,0);
 assert.equal(periodBudget(records,[{...occurrence,status:"planned",fundingPeriodStart:undefined}],nov).expenses,100000);
});
test("partial early loan payment moves actual amount and retains the unpaid minimum",()=>{
 const salary=r({start:"2026-10-12"}),loan=r({kind:"loan",start:"2026-11-15",amount:50000}),records=[salary,loan],options=periodOptions(records,{},"2026-10-27");
 const o={recordId:loan.id!,date:"2026-11-15",status:"paid" as const,actual:20000,fundingPeriodStart:"2026-10-12",notes:""};
 const oct=periodBudget(records,[o],activePeriod(options,"2026-10-27")),nov=periodBudget(records,[o],activePeriod(options,"2026-11-15"));
 assert.equal(oct.expenses,20000);assert.equal(nov.expenses,30000);assert.equal(nov.payments.find(p=>p.recordId===loan.id)?.remaining,30000);
});
test("cross-period subscriptions, expenses, savings and one-off costs use chosen funding",()=>{
 for(const kind of ["subscription","expense","saving","oneoff"]){
 const salary=r({start:"2026-10-12"}),account=r({kind:"account"}),bill=r({kind,start:"2026-11-15",amount:10000,...(kind==="saving"?{accountId:account.id}:{})}),records=[salary,account,bill],options=periodOptions(records,{},"2026-10-27");
 const o={recordId:bill.id!,date:"2026-11-15",status:"paid" as const,actual:12000,fundingPeriodStart:"2026-10-12",notes:""};
 const oct=periodBudget(records,[o],activePeriod(options,"2026-10-27")),nov=periodBudget(records,[o],activePeriod(options,"2026-11-15"));
 assert.equal(oct.free,88000,kind);assert.equal(nov.free,100000,kind);
 }
});
test("fortnightly funding preserves cash totals",()=>{
 const salary=r({start:"2026-10-12",frequency:"weekly",interval:2}),bill=r({kind:"expense",start:"2026-11-15",amount:10000}),records=[salary,bill],options=periodOptions(records,{},"2026-10-27");
 const o={recordId:bill.id!,date:"2026-11-15",status:"paid" as const,actual:10000,fundingPeriodStart:"2026-10-26",notes:""};
 assert.equal(periodBudget(records,[o],activePeriod(options,"2026-10-27")).expenses,10000);assert.equal(periodBudget(records,[o],activePeriod(options,"2026-11-15")).expenses,0);
});
