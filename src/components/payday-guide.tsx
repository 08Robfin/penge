"use client";
import {useState,type FormEvent} from "react";
import {ArrowRight,Check,Plus,Wallet,Receipt,Repeat,PiggyBank,Landmark,Flag,TrendingUp} from "lucide-react";
import type {BudgetRecord,BudgetSettings} from "@/lib/schema";
import {formatNok,parseNok,type MonthResult} from "@/lib/engine";
import {primaryIncome,type PayPeriod} from "@/lib/periods";
export const explanations:Record<string,{title:string;description:string;example:string}> = {
 income:{title:"Inntekt",description:"Penger du får utbetalt. Velg gjentakelse og dato, så kommer inntekten med i riktig lønningsperiode.",example:"Fast lønn: Hver måned. Bonus eller gave: Kun én gang."},
 expense:{title:"Regninger",description:"Faste eller enkeltstående utgifter som lønna skal dekke. Bruk forfallsdatoen, så trekkes beløpet i riktig periode.",example:"Husleie, strøm og forsikring. Lånebetalinger legges under Lån."},
 subscription:{title:"Abonnementer",description:"Løpende tjenester du betaler for. De trekkes fra akkurat som regninger, men samles her så du enkelt ser hva du abonnerer på.",example:"Spotify og iCloud. Registrer hver utgift bare ett sted."},
 loan:{title:"Lån",description:"Registrer restgjelden og minste terminbeløp. Terminbeløpet reserveres ved forfall. Ved tidlig betaling velger du hvilken lønning som dekker beløpet.",example:"Ikke legg det samme lånet inn som både lån og regning. Restgjeld oppdateres manuelt; renter og gebyrer kan inngå i terminbeløpet."},
 saving:{title:"Sparing",description:"Penger du vil beholde til senere. Opprett først en sparekonto, og legg så til hvor mye du vil overføre fra lønna.",example:"Sparekontoen er beholderen. Spareavtalen er beløpet som trekkes fra budsjettet. Når du markerer overføringen som fullført, øker registrert saldo."},
 account:{title:"Sparekonto",description:"En oversikt over penger du allerede har spart. Startsaldoen trekkes ikke fra lønna på nytt.",example:"Opprett deretter en spareavtale for beløpet du vil sette av fremover."},
 plan:{title:"Planer",description:"Et konkret kjøp du vil sette av penger til. Avsetninger trekkes i perioden de hører til; kjøpet trekkes ikke en gang til når det er dekket.",example:"En tur, ny telefon eller større innkjøp. Vanlig langsiktig sparing legges under Sparing."},
 oneoff:{title:"Engangsutgift",description:"Et kjøp eller en regning som bare skal trekkes én gang.",example:"Bruk datoen pengene skal brukes. Et kjøp som er satt opp under Planer skal ikke også legges inn her."},
 adjustment:{title:"Juster sparesaldo",description:"Rett den brukerførte sparesaldoen hvis den ikke stemmer.",example:"Dette endrer bare sparesaldoen og regnes ikke som ny lønn eller en ny utgift."}
};
export function HelpCard({kind}:{kind:string}){
 const h=explanations[kind];if(!h)return null;
 return <details className="usage-help"><summary>Hva bruker jeg {h.title.toLowerCase()} til?</summary><p>{h.description}</p><small>{h.example}</small></details>;
}
export function Distribution({result,period}:{result:MonthResult;period:PayPeriod}){
 const rows=[["Regninger",result.payments.filter(p=>p.kind==="expense").reduce((s,p)=>s+(p.budgetAmount??p.amount),0),Receipt],["Abonnementer",result.payments.filter(p=>p.kind==="subscription").reduce((s,p)=>s+(p.budgetAmount??p.amount),0),Repeat],["Lånebetalinger",result.payments.filter(p=>p.kind==="loan").reduce((s,p)=>s+(p.budgetAmount??p.amount),0),Landmark],["Sparing",result.savings,PiggyBank],["Planer og engangskjøp",result.reservations+result.purchases-result.released,Flag]] as const;
 return <section className="card distribution-card"><div className="section-heading"><div><h2>Dette går lønna til</h2><p>{period.label} · hver periode regnes for seg</p></div><Wallet size={20}/></div><div className="allocation-line income"><span><TrendingUp size={17}/>Inntekter i perioden</span><strong>{formatNok(result.income)}</strong></div>{result.carry!==0&&<div className="allocation-line"><span>Manuelt tatt med fra forrige periode</span><strong>{formatNok(result.carry)}</strong></div>}{rows.map(([title,amount,Icon])=><div className="allocation-line" key={title}><span><Icon size={17}/>{title}</span><strong>− {formatNok(amount)}</strong></div>)}<div className={"allocation-line remaining "+(result.free<0?"negative-text":"")}><span>Til hverdagen frem til neste lønning</span><strong>{formatNok(result.free)}</strong></div><p className="muted">«Betalt» viser hva som er gjort. Beløpet trekkes bare én gang, fra lønningen som dekker betalingen. Penge følger ikke bankens saldo eller småkjøpene dine.</p></section>;
}
export function CarryForm({period,settings,busy,save}:{period:PayPeriod;settings:BudgetSettings;busy:boolean;save:(s:BudgetSettings)=>void}){
 const existing=settings.periodCarry.find(c=>c.start===period.start)?.amount??0;
 const [error,setError]=useState("");
 function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();try{setError("");const amount=parseNok(String(new FormData(e.currentTarget).get("carry")));save({...settings,periodCarry:[...settings.periodCarry.filter(c=>c.start!==period.start),...(amount===0?[]:[{start:period.start,amount}])]});}catch(e){setError(e instanceof Error?e.message:"Kontroller beløpet");}}
 return <details className="card"><summary>Ta med et bekreftet restbeløp (valgfritt)</summary><p>Standard er 0 kr. Bruk dette bare hvis du selv har kontrollert at du har frie penger igjen. Sparing og reserverte penger skal ikke tas med på nytt.</p><form onSubmit={submit}><label className="field"><span>Beløp inn i perioden {period.label} (kr)</span><input key={period.start+":"+existing} name="carry" inputMode="decimal" defaultValue={(existing/100).toFixed(2).replace(".",",")} required/></label>{error&&<p role="alert">{error}</p>}<button className="secondary" disabled={busy}>Lagre bekreftet restbeløp</button></form></details>;
}
