import {registerWithInvitation} from "@/lib/invitation-registration";
import {mailConfigured} from "@/lib/mail-transport";
import {HttpError} from "@/lib/store";
import { isAdmin } from "@/lib/admin";
import { createHash } from "node:crypto";
import { auth } from "@/lib/auth";
import { assertOrigin,body,errorResponse,limit } from "@/lib/http";
export const dynamic="force-dynamic";
export async function GET(req:Request){return auth.handler(req);}
export async function POST(req:Request){
 try{
 assertOrigin(req);
 const data=await body(req.clone(),32_768);
 if(!data||typeof data!=="object"||Array.isArray(data))throw new HttpError(400,"JSON-objekt kreves");
 const endpoint=new URL(req.url).pathname.split("/").pop()??"";
 if(["sign-in","email","sign-up","request-password-reset","reset-password"].some(v=>new URL(req.url).pathname.includes(v))){
 await limit("auth:global:"+endpoint,100);
 const email=typeof data.email==="string"?data.email.trim().toLowerCase():"anonymous";
 const key=createHash("sha256").update(email).digest("hex");
 await limit("auth:email:"+endpoint+":"+key,endpoint==="request-password-reset"?3:5);
 }
 if(endpoint==="request-password-reset"&&!mailConfigured())return Response.json({error:"Passordgjenoppretting er ikke konfigurert. Kontakt tjenesteeieren."},{status:503});
 if(new URL(req.url).pathname.endsWith("/delete-user")&&(req.headers.get("x-confirm-delete")!=="DELETE"||typeof data.password!=="string"||!data.password))return Response.json({error:"Bekreft kontosletting"},{status:400});
 if(new URL(req.url).pathname.endsWith("/delete-user")){const s=await auth.api.getSession({headers:req.headers});if(s&&await isAdmin(s.user.id))return Response.json({error:"Administratorkontoen er beskyttet mot sletting her"},{status:409});}
 if(new URL(req.url).pathname.endsWith("/sign-up/email"))return await registerWithInvitation(req.headers.get("x-penge-invite")??"",data.email,()=>auth.handler(req));
 return await auth.handler(req);
 }catch(e){return errorResponse(e);}
}
