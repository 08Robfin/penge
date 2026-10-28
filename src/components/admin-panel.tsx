"use client";
import MailAdmin from "./mail-admin";
import {useEffect,useState,type FormEvent} from "react";
import {Copy,Link as LinkIcon,UserPlus,ShieldCheck,RefreshCw,X} from "lucide-react";
type Account={id:string;name:string;email:string;is_admin:boolean;disabled:boolean;newsletter_enabled:boolean;created_at:string};
type Invitation={id:string;email:string;expires_at:string;mail_status?:string};
type Listing={users:Account[];invitations:Invitation[]};
async function call(body?:unknown){
 const r=await fetch("/api/admin",{method:body?"POST":"GET",headers:body?{"Content-Type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined,cache:"no-store"});
 const j=await r.json();if(!r.ok)throw Error(j.error??"Forespørselen mislyktes");return j;
}
export default function AdminPanel(){
 const [audienceVersion,setAudienceVersion]=useState(0);
 const [data,setData]=useState<Listing|null>(null),[error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[invite,setInvite]=useState<{email:string;url:string;delivery?:string}|null>(null),[deleting,setDeleting]=useState<Account|null>(null);
 async function refresh(){setData(await call());}
 useEffect(()=>{refresh().catch(e=>setError(e.message));},[]);
 async function run(fn:()=>Promise<void>){setBusy(true);setError("");setNotice("");try{await fn();}catch(e){setError(e instanceof Error?e.message:"Noe gikk galt");}finally{setBusy(false);}}
 async function change(body:unknown,message:string){await call(body);await refresh();setAudienceVersion(v=>v+1);setNotice(message);}
 async function submitInvite(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget;const email=String(new FormData(form).get("email"));await run(async()=>{setInvite(await call({action:"invite",email}));form.reset();await refresh();});}
 return <div className="admin-panel">
 {error&&<div className="alert error" role="alert">{error}</div>}{notice&&<div className="alert" role="status">{notice}</div>}
 <div className="outlook"><ShieldCheck size={22}/><div><strong>Du administrerer tilgang, ikke andres økonomi.</strong><p>Her ser du navn, e-post og kontostatus. Ingen budsjetter, inntekter eller sparesaldoer vises.</p></div></div>
 <section className="card"><div className="section-heading"><div><h2>Inviter en venn</h2><p>Lenken gjelder i syv dager og kan brukes én gang med denne e-postadressen.</p></div><UserPlus size={21}/></div>
 <form className="admin-invite-form" onSubmit={submitInvite}><label className="field"><span>Vennens e-postadresse</span><input name="email" type="email" required maxLength={254} autoComplete="off" placeholder="friend@example.org"/></label><button className="primary" disabled={busy}><UserPlus size={16}/>Send invitasjon</button></form>
 <p className="muted">Invitasjonen sendes automatisk på e-post. En ny invitasjon til samme adresse erstatter den forrige.</p>
 {invite&&<div className="import-preview" role="status"><h3>Invitasjon til {invite.email}</h3><p>{invite.delivery==="queued"?"Invitasjonen er lagt i e-postkøen. Lenken under er en reserve hvis du vil dele den selv.":"E-post er ikke konfigurert ennå. Kopier lenken under for å dele invitasjonen manuelt."}</p><div className="admin-invite-link"><label className="field"><span>Invitasjonslenke</span><input value={invite.url} readOnly onFocus={e=>e.target.select()}/></label><button className="secondary" disabled={busy} onClick={()=>run(async()=>{try{await navigator.clipboard.writeText(invite.url);setNotice("Invitasjonslenken er kopiert.");}catch{setNotice("Marker lenken i feltet og kopier den manuelt.");}})}><Copy size={16}/>Kopier lenke</button></div></div>}
 </section>
 <section className="card"><div className="section-heading"><div><h2>Ventende invitasjoner</h2><p>Utløpte og brukte lenker vises ikke.</p></div><button className="text-button" disabled={busy} onClick={()=>run(refresh)}><RefreshCw size={15}/>Oppdater</button></div>
 {!data?<p className="muted">Laster …</p>:!data.invitations.length?<p className="muted">Ingen ventende invitasjoner.</p>:data.invitations.map(i=><div className="admin-person" key={i.id}><span className="item-icon"><LinkIcon size={18}/></span><div className="admin-person-details"><strong>{i.email}</strong><small>Utløper {new Date(i.expires_at).toLocaleDateString("nb-NO")} · {i.mail_status==="submitted"?"Levert til e-posttjenesten":i.mail_status==="failed"?"Sending feilet – opprett en ny invitasjon":i.mail_status==="pending"||i.mail_status==="processing"?"E-post i kø":i.mail_status==="cancelled"?"Sending stoppet":"Kun lenke"}</small></div><button className="secondary" disabled={busy} onClick={()=>run(async()=>{await change({action:"revoke",invitationId:i.id},"Invitasjonen er trukket tilbake.");if(invite?.email===i.email)setInvite(null);})}>Trekk tilbake</button></div>)}
 </section>
 <section className="card admin-users-card"><div className="section-heading"><div><h2>Brukere</h2><p>Deaktivering stenger tilgangen og logger ut brukeren. Kontoen kan aktiveres igjen.</p></div><span className="tag">{data?.users.length??0} kontoer</span></div>
 <div className="admin-user-table" role="table" aria-label="Brukere og nyhetsmailer">
 <div className="admin-user-head" role="row"><span role="columnheader">Bruker</span><span role="columnheader">Tilgang</span><span role="columnheader">Nyhetsmailer</span><span role="columnheader" className="admin-user-actions-heading">Handlinger</span></div>
 <div role="rowgroup">{data?.users.map(u=><div className="admin-user-row" role="row" key={u.id}>
 <div className="admin-user-identity" role="cell"><span className="avatar">{u.name.slice(0,1).toUpperCase()}</span><div className="admin-person-details"><strong>{u.name}</strong><small>{u.email}</small><small className="admin-user-date">Opprettet {new Date(u.created_at).toLocaleDateString("nb-NO")}</small></div></div>
 <div className="admin-user-access" role="cell"><span className="admin-user-mobile-label">Tilgang</span><span className="tag">{u.is_admin?"Administrator":u.disabled?"Deaktivert":"Aktiv"}</span></div>
 <div className="admin-user-mail" role="cell"><span className="admin-user-mobile-label">Nyhetsmailer</span><label className="admin-newsletter"><input type="checkbox" checked={u.newsletter_enabled} disabled={busy} aria-label={"Nyhetsmailer: "+u.name} onChange={e=>{const enabled=e.target.checked,previous=data;setData({...data!,users:data!.users.map(account=>account.id===u.id?{...account,newsletter_enabled:enabled}:account)});run(async()=>{try{await change({action:"newsletter",userId:u.id,enabled},enabled?"Brukeren er meldt på nyhetsmailer.":"Brukeren er meldt av nyhetsmailer.");}catch(error){setData(previous);throw error;}});}}/><span>{u.newsletter_enabled?"Påmeldt":"Avmeldt"}</span></label></div>
 <div className="admin-user-actions" role="cell">{u.is_admin?<span className="admin-protected"><ShieldCheck size={14}/>Beskyttet konto</span>:<><button className="secondary" disabled={busy} onClick={()=>{if(!u.disabled&&!confirm("Deaktivere "+u.email+"? Brukeren logges ut."))return;run(()=>change({action:u.disabled?"enable":"disable",userId:u.id},u.disabled?"Brukeren er aktivert.":"Brukeren er deaktivert og logget ut."));}}>{u.disabled?"Aktiver":"Deaktiver"}</button><button className="danger-text" disabled={busy} onClick={()=>{setDeleting(u);setError("");setNotice("");}}>Slett</button></>}</div>
 </div>)}</div></div>
 </section>
 <MailAdmin audienceVersion={audienceVersion}/>
 {deleting&&<section className="card danger-zone" aria-labelledby="delete-user-heading"><div className="section-heading"><h2 id="delete-user-heading">Slett {deleting.name} permanent?</h2><button className="icon-button" onClick={()=>setDeleting(null)} aria-label="Avbryt sletting"><X size={19}/></button></div><p>Dette sletter kontoen og alle tilhørende budsjettdata fra den aktive databasen. Det kan ikke angres. Eldre sikkerhetskopier kan beholdes til de utløper.</p><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);run(async()=>{await change({action:"delete",userId:deleting.id,confirmation:String(f.get("confirmation")),password:String(f.get("password"))},"Brukeren og aktive kontodata er slettet.");setDeleting(null);});}}><label className="field"><span>Skriv brukerens e-postadresse: {deleting.email}</span><input name="confirmation" type="email" required autoComplete="off"/></label><label className="field"><span>Ditt administratorpassord</span><input name="password" type="password" required autoComplete="current-password"/></label><div className="inline-actions"><button className="danger" disabled={busy}>Bekreft permanent sletting</button><button type="button" className="secondary" onClick={()=>setDeleting(null)}>Avbryt</button></div></form></section>}
 </div>;
}
