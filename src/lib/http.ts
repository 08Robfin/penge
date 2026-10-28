import { headers } from "next/headers";
import { auth } from "./auth";
import { db } from "./db";
import { HttpError } from "./store";
export async function identity(){
 const session=await auth.api.getSession({headers:await headers()});
 if(!session)throw new HttpError(401,"Logg inn for å fortsette");
 if((await db.query("SELECT 1 FROM disabled_account WHERE user_id=$1",[session.user.id])).rowCount)throw new HttpError(403,"Kontoen er deaktivert");
 return session;
}
export function assertOrigin(req:Request){
 const allowed=new URL(process.env.BETTER_AUTH_URL??"http://localhost:3000").origin;
 if(req.headers.get("origin")!==allowed)throw new HttpError(403,"Ugyldig forespørselsopprinnelse");
}
export async function body(req:Request,max=2_000_000){
 if(Number(req.headers.get("content-length"))>max)throw new HttpError(413,"Filen er for stor");
 if(!req.headers.get("content-type")?.includes("application/json"))throw new HttpError(415,"JSON kreves");
 if(!req.body)throw new HttpError(400,"Tom forespørsel");
 const reader=req.body.getReader();const chunks:Uint8Array[]=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new HttpError(413,"Filen er for stor");}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new HttpError(400,"Ugyldig JSON");}
}
export async function limit(key:string,max=120){
 await db.query("DELETE FROM request_limit WHERE expires_at<now()-interval '1 day'");
 const r=await db.query("INSERT INTO request_limit(key,count,expires_at) VALUES($1,1,now()+interval '1 minute') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN request_limit.expires_at<now() THEN 1 ELSE request_limit.count+1 END, expires_at=CASE WHEN request_limit.expires_at<now() THEN now()+interval '1 minute' ELSE request_limit.expires_at END RETURNING count",[key]);
 if(r.rows[0].count>max)throw new HttpError(429,"For mange forespørsler. Vent litt og prøv igjen.");
}
export function errorResponse(e:unknown){
 if(e instanceof HttpError)return Response.json({error:e.message},{status:e.status});
 if(e&&typeof e==="object"&&"issues"in e)return Response.json({error:"Kontroller feltene",issues:(e as {issues:unknown}).issues},{status:400});
 console.error("Penge request failed",e instanceof Error?e.name:"Unknown");
 return Response.json({error:"Noe gikk galt. Prøv igjen."},{status:500});
}
