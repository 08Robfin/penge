"use client";
import ServiceCredit from "./service-credit";
import {useLayoutEffect,useMemo,useRef,useState,type FormEvent} from "react";
import {ArrowLeft,ArrowRight,Wallet,Receipt,Repeat,Landmark,Plus,Trash2,Check,LogOut,PiggyBank,Flag,LoaderCircle} from "lucide-react";
import {emptyDraft,onboardingRecords,type OnboardingDraft,type OnboardingState,type OnboardingStep} from "@/lib/onboarding-schema";
import {activePeriod,periodOptions,periodBudget} from "@/lib/periods";
import {formatNok,parseNok} from "@/lib/engine";
const today=()=>new Date().toLocaleDateString("sv-SE",{timeZone:"Europe/Oslo"});
const labels={expense:"regning",subscription:"abonnement",loan:"lån"};
export default function Onboarding({initial,done,logout}:{initial:OnboardingState;done:()=>Promise<void>;logout:()=>Promise<void>}){
 const [state,setState]=useState(initial),[draft,setDraft]=useState<OnboardingDraft>(initial.draft??emptyDraft()),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const heading=useRef<HTMLHeadingElement>(null),content=useRef<HTMLElement>(null),direction=useRef(1),step=state.step;
 useLayoutEffect(()=>{
 heading.current?.focus({preventScroll:true});window.scrollTo(0,0);
 if(window.matchMedia("(prefers-reduced-motion: reduce)").matches||!content.current?.animate)return;
 const animation=content.current.animate([
 {opacity:0,transform:"translate3d("+direction.current*18+"px, 7px, 0)"},
 {opacity:1,transform:"translate3d(0, 0, 0)"}
 ],{duration:320,easing:"cubic-bezier(0.22, 1, 0.36, 1)"});
 return()=>animation.cancel();
 },[step]);
 const expense=draft.editing;
 const stage=step==="welcome"?0:step.startsWith("income")?0:step.startsWith("expense")?1:step.startsWith("saving")?2:3;
 const stageProgress=({welcome:0,"income-name":.22,"income-amount":.46,"income-date":.72,"income-frequency":1,expenses:.24,"expense-name":.4,"expense-amount":.6,"expense-date":.8,"expense-frequency":1,savings:.45,"savings-amount":1,review:1} satisfies Record<OnboardingStep,number>)[step];
 const StageIcon=stage===0?Wallet:stage===1?Receipt:stage===2?PiggyBank:Check;
 const patchIncome=(patch:Partial<OnboardingDraft["income"]>)=>setDraft(d=>({...d,income:{...d.income,...patch}}));
 const patchExpense=(patch:Partial<NonNullable<OnboardingDraft["editing"]>>)=>setDraft(d=>({...d,editing:d.editing?{...d.editing,...patch}:undefined}));
 async function persist(next:OnboardingStep,nextDraft=draft,movement=1){
 setBusy(true);setError("");
 try{const r=await fetch("/api/onboarding",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save",revision:state.revision,step:next,draft:nextDraft})});const j=await r.json();if(!r.ok)throw Error(j.error??"Kunne ikke lagre. Prøv igjen.");direction.current=movement;setState(j);setDraft(j.draft);}
 catch(e){setError(e instanceof Error?e.message:"Kunne ikke lagre");}finally{setBusy(false);}
 }
 function positive(value:string){if(parseNok(value)<=0)throw Error("Skriv et beløp som er større enn 0 kr.");}
 async function next(e:FormEvent<HTMLFormElement>){
 e.preventDefault();setError("");
 try{
 if(step==="welcome")return persist("income-name");
 if(step==="income-name"){if(!draft.income.name.trim())throw Error("Gi inntekten et navn.");return persist("income-amount");}
 if(step==="income-amount"){positive(draft.income.amount);return persist("income-date");}
 if(step==="income-date"){if(!/^\d{4}-\d{2}-\d{2}$/.test(draft.income.date))throw Error("Velg neste lønningsdato.");return persist("income-frequency");}
 if(step==="income-frequency")return persist("expenses");
 if(step==="expenses")return persist("savings",{...draft,editing:undefined});
 if(step==="expense-name"){if(!expense?.name.trim())throw Error("Gi betalingen et navn.");return persist("expense-amount");}
 if(step==="expense-amount"){positive(expense?.amount??"");return persist("expense-date");}
 if(step==="expense-date"){if(!expense?.date)throw Error("Velg første forfallsdato.");return persist("expense-frequency");}
 if(step==="expense-frequency"){if(!expense)throw Error("Legg til en betaling først.");return persist("expenses",{...draft,expenses:[...draft.expenses.filter(e=>e.id!==expense.id),expense],editing:undefined});}
 if(step==="savings")return persist(draft.savings.enabled?"savings-amount":"review");
 if(step==="savings-amount"){positive(draft.savings.amount);return persist("review");}
 if(step==="review"){
 setBusy(true);
 try{const r=await fetch("/api/onboarding",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"complete",revision:state.revision})});const j=await r.json();if(!r.ok)throw Error(j.error??"Kunne ikke fullføre");await done();}finally{setBusy(false);}
 }
 }catch(e){setError(e instanceof Error?e.message:"Kontroller feltet");}
 }
 function back(){
 const previous:Partial<Record<OnboardingStep,OnboardingStep>>={"income-name":"welcome","income-amount":"income-name","income-date":"income-amount","income-frequency":"income-date",expenses:"income-frequency","expense-name":"expenses","expense-amount":"expense-name","expense-date":"expense-amount","expense-frequency":"expense-date",savings:"expenses","savings-amount":"savings",review:draft.savings.enabled?"savings-amount":"savings"};
 const target=previous[step];if(target)persist(target,step==="expense-name"?{...draft,editing:undefined}:draft,-1);
 }
 const review=useMemo(()=>{try{let n=0;const built=onboardingRecords(draft,()=>"00000000-0000-4000-8000-"+String(++n).padStart(12,"0"));const settings={budgetIncomeId:built.incomeId};const period=activePeriod(periodOptions(built.records,settings,draft.income.date),draft.income.date);return {period,budget:periodBudget(built.records,[],period,settings)};}catch{return null;}},[draft]);
 const title:Record<OnboardingStep,string>={welcome:"La oss gjøre plass til det som betyr noe.","income-name":"Hva kaller du hovedinntekten din?","income-amount":"Hvor mye får du utbetalt?","income-date":"Når kommer neste lønning?","income-frequency":"Hvor ofte får du lønn?",expenses:"Har du faste betalinger?","expense-name":"Hva heter betalingen?","expense-amount":expense?.kind==="loan"?"Hva er minste terminbeløp?":"Hvor mye betaler du hver gang?","expense-date":"Når er første forfall?","expense-frequency":"Hvor ofte betaler du dette?",savings:"Vil du sette av penger til sparing?","savings-amount":"Hvor mye vil du spare fra hver lønning?",review:"Klar for din første lønningsperiode?"};
 const description:Record<OnboardingStep,string>={welcome:"Vi setter opp det viktigste, én ting om gangen. Resten kan du legge til senere.","income-name":"Denne inntekten bestemmer når en ny budsjettperiode starter.","income-amount":"Bruk beløpet som kommer på konto etter skatt.","income-date":"Budsjettet går fra denne dagen til dagen før neste lønning.","income-frequency":"Velg rytmen som stemmer med utbetalingene dine.",expenses:"Legg inn det lønna skal dekke. Du kan legge til flere senere.","expense-name":expense?{expense:"For eksempel husleie, strøm eller forsikring.",subscription:"For eksempel Spotify eller iCloud.",loan:"For eksempel billån eller studielån."}[expense.kind]:"Gi betalingen et kort navn.","expense-amount":expense?.kind==="loan"?"Bruk terminbeløpet du minst skal betale, ikke hele restgjelden.":"Bruk beløpet som trekkes fra kontoen på forfallsdatoen.","expense-date":"Forfallsdatoen bestemmer hvilken lønning som skal dekke betalingen.","expense-frequency":"Du trenger bare registrere en gjentakende betaling én gang.",savings:"Sparebeløpet settes av før vi viser hva du har til hverdagen.","savings-amount":"Vi oppretter en enkel spareavtale. Du kan endre kontoen og beløpet senere.",review:"Hver lønning regnes for seg. Et ubrukt anslag overføres ikke automatisk."};
 const button=step==="welcome"?"Kom i gang":step==="expenses"?(draft.expenses.length?"Videre til sparing":"Ingen nå – fortsett"):step==="expense-frequency"?"Lagre betaling":step==="review"?"Åpne budsjettet":"Fortsett";
 function options(name:string,value:string,onChange:(v:string)=>void,items:[string,string,string?][]){return <fieldset className="wizard-options"><legend className="sr-only">{title[step]}</legend>{items.map(([key,label,hint])=><label className={"wizard-option "+(key===value?"selected":"")} key={key}><input type="radio" name={name} value={key} checked={value===key} onChange={()=>onChange(key)}/><span><strong>{label}</strong>{hint&&<small>{hint}</small>}</span>{key===value&&<Check size={18}/>}</label>)}</fieldset>;}
 return <div className="onboarding-shell"><header className="onboarding-header"><span className="brand">Penge<span className="brand-dot">.</span></span><button className="icon-button" aria-label="Logg ut" disabled={busy} onClick={()=>logout().catch(e=>setError(e instanceof Error?e.message:"Kunne ikke logge ut"))}><LogOut size={19}/></button></header>
 <form className="onboarding-form" onSubmit={next} aria-busy={busy}><main ref={content} className="onboarding-content" data-step={step}>
 <div className="wizard-step-heading"><span className="wizard-stage-emblem" aria-hidden="true"><StageIcon size={22} strokeWidth={1.7}/></span><p className="eyebrow">{step==="welcome"?"VELKOMMEN TIL PENGE":["DIN LØNNING","FASTE BETALINGER","LITT TIL SENERE","DIN OVERSIKT"][stage]}</p><span className="wizard-step-number" aria-hidden="true">0{stage+1}<span> / 04</span></span></div>
 <h1 ref={heading} tabIndex={-1}>{title[step]}</h1><p className="onboarding-description">{description[step]}</p>
 {error&&<div className="alert error" role="alert">{error}</div>}
 {step==="welcome"&&<div className="wizard-welcome-mark" aria-hidden="true"><span className="welcome-orbit"/><span className="welcome-tile welcome-tile-back"><PiggyBank size={28} strokeWidth={1.5}/></span><span className="welcome-tile welcome-tile-main"><Wallet size={44} strokeWidth={1.4}/><span/><span/></span><span className="welcome-tile welcome-tile-front"><Flag size={25} strokeWidth={1.5}/></span></div>}
 {step==="income-name"&&<label className="wizard-field"><span>Navn på inntekten</span><input name="incomeName" value={draft.income.name} onChange={e=>patchIncome({name:e.target.value})} maxLength={120} required autoComplete="off" placeholder="For eksempel lønn"/></label>}
 {step==="income-amount"&&<div className="wizard-field money-field"><label htmlFor="wizard-income-amount">Utbetalt beløp i kroner</label><div><input id="wizard-income-amount" name="incomeAmount" inputMode="decimal" value={draft.income.amount} onChange={e=>patchIncome({amount:e.target.value})} maxLength={30} required placeholder="0"/><span aria-hidden="true">kr</span></div></div>}
 {step==="income-date"&&<label className="wizard-field"><span>Neste lønningsdato</span><input name="incomeDate" type="date" value={draft.income.date} onChange={e=>patchIncome({date:e.target.value})} required/></label>}
 {step==="income-frequency"&&options("incomeCadence",draft.income.cadence,v=>patchIncome({cadence:v as typeof draft.income.cadence}),[["monthly","Hver måned"],["fortnightly","Hver 14. dag"],["weekly","Hver uke"]])}
 {step==="expenses"&&<div className="wizard-payments">{draft.expenses.length>0&&<ul className="wizard-payment-list">{draft.expenses.map(item=><li key={item.id}><button type="button" disabled={busy} onClick={()=>persist("expense-name",{...draft,editing:item})}><strong>{item.name}</strong><small>{labels[item.kind]} · {formatNok(parseNok(item.amount))}</small></button><button type="button" className="icon-button" disabled={busy} aria-label={"Fjern "+item.name} onClick={()=>persist("expenses",{...draft,expenses:draft.expenses.filter(e=>e.id!==item.id)})}><Trash2 size={17}/></button></li>)}</ul>}<div className="wizard-add-payment">{([["expense","Regning","Husleie, strøm, forsikring",Receipt],["subscription","Abonnement","Musikk, apper og andre tjenester",Repeat],["loan","Lån","Lånebetalingens minste terminbeløp",Landmark]] as const).map(([kind,label,hint,Icon])=><button type="button" key={kind} disabled={busy||draft.expenses.length>=100} onClick={()=>persist("expense-name",{...draft,editing:{id:crypto.randomUUID(),kind,name:"",amount:"",date:draft.income.date,cadence:"monthly"}})}><Icon size={20}/><span><strong>{label}</strong><small>{hint}</small></span><Plus size={18}/></button>)}</div></div>}
 {step==="expense-name"&&<label className="wizard-field"><span>Navn på betalingen</span><input name="expenseName" value={expense?.name??""} onChange={e=>patchExpense({name:e.target.value})} maxLength={120} required autoComplete="off" placeholder={expense?.kind==="loan"?"For eksempel billån":"For eksempel husleie"}/></label>}
 {step==="expense-amount"&&<div className="wizard-field money-field"><label htmlFor="wizard-expense-amount">{expense?.kind==="loan"?"Minste terminbeløp i kroner":"Betalingsbeløp i kroner"}</label><div><input id="wizard-expense-amount" name="expenseAmount" inputMode="decimal" value={expense?.amount??""} onChange={e=>patchExpense({amount:e.target.value})} maxLength={30} required placeholder="0"/><span aria-hidden="true">kr</span></div></div>}
 {step==="expense-date"&&<label className="wizard-field"><span>Første forfallsdato</span><input name="expenseDate" type="date" value={expense?.date??""} onChange={e=>patchExpense({date:e.target.value})} required/></label>}
 {step==="expense-frequency"&&options("expenseCadence",expense?.cadence??"monthly",v=>patchExpense({cadence:v as NonNullable<typeof expense>["cadence"]}),[["monthly","Hver måned"],["weekly","Hver uke"],["fortnightly","Hver 14. dag"],["quarterly","Hver tredje måned"],["yearly","Hvert år"],["once","Kun én gang"]])}
 {step==="savings"&&options("savings",draft.savings.enabled?"yes":"no",v=>setDraft(d=>({...d,savings:{...d.savings,enabled:v==="yes"}})),[["yes","Ja, jeg vil sette av et beløp"],["no","Ikke nå","Jeg kan legge til sparing senere"]])}
 {step==="savings-amount"&&<div className="wizard-field money-field"><label htmlFor="wizard-savings-amount">Sparebeløp per lønning i kroner</label><div><input id="wizard-savings-amount" name="savingsAmount" inputMode="decimal" value={draft.savings.amount} onChange={e=>setDraft(d=>({...d,savings:{...d.savings,amount:e.target.value}}))} maxLength={30} required placeholder="0"/><span aria-hidden="true">kr</span></div></div>}
 {step==="review"&&review&&<div className="wizard-review"><p className="wizard-review-period">{review.period.label}</p><div><span>Inntekt</span><strong>{formatNok(review.budget.income)}</strong></div><div><span>Faste betalinger</span><strong>− {formatNok(review.budget.expenses)}</strong></div><div><span>Sparing</span><strong>− {formatNok(review.budget.savings)}</strong></div><div className={"wizard-review-total "+(review.budget.free<0?"negative-text":"")}><span>Til hverdagen</span><strong>{formatNok(review.budget.free)}</strong></div>{review.budget.free<0&&<p className="wizard-shortfall">Du har fordelt mer enn inntekten. Gå tilbake hvis du vil justere noe før du åpner budsjettet.</p>}<p className="wizard-later">Flere inntekter, planer og detaljer kan du legge til etterpå.</p></div>}
 </main><footer className="onboarding-footer"><div className="onboarding-controls">{step!=="welcome"?<button type="button" className="wizard-back" disabled={busy} onClick={back}><ArrowLeft size={18}/>Tilbake</button>:<span/>}<button type="submit" className="primary" disabled={busy}>{busy?"Lagrer …":button}{busy?<LoaderCircle className="wizard-saving-spinner" size={18}/>:<ArrowRight className="wizard-next-arrow" size={18}/>}</button></div><ol className="wizard-progress" aria-label="Fremdrift">{["Inntekt","Betalinger","Sparing","Ferdig"].map((label,i)=><li key={label} className={i===stage?"current":i<stage?"finished":""} aria-current={i===stage?"step":undefined}><span className="wizard-progress-track"><span style={{width:(i<stage?100:i===stage?stageProgress*100:0)+"%"}}/></span>{label}</li>)}</ol><div className="onboarding-service-credit"><a href="/privacy">Personvern</a><ServiceCredit/></div></footer></form></div>;
}
