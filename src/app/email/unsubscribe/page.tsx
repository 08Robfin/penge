import Link from "next/link";
import ServiceCredit from "@/components/service-credit";
export const dynamic="force-dynamic";
export default async function Unsubscribe({searchParams}:{searchParams:Promise<{token?:string;done?:string}>}){
 const p=await searchParams,valid=/^[A-Za-z0-9_-]{43}$/.test(p.token??"");
 return <main className="legal"><Link href="/">Penge<span className="brand-dot">.</span></Link><h1>{p.done?"Du er avmeldt nyhetsmailer.":"Vil du melde deg av nyhetsmailer?"}</h1><p>Invitasjoner og nødvendige kontomailer påvirkes ikke. Du kan velge funksjonsnyheter igjen under Innstillinger i Penge.</p>{!p.done&&(valid?<form action={"/api/email/unsubscribe?token="+encodeURIComponent(p.token!)} method="post"><button className="primary" type="submit">Meld meg av nyhetsmailer</button></form>:<p>Lenken er ugyldig. Du kan endre e-postvalget under Innstillinger.</p>)}<footer className="legal-service-credit"><Link href="/privacy">Personvern</Link><br/><ServiceCredit/></footer></main>;
}
