import {z} from "zod";
import {identity,assertOrigin,body,errorResponse,limit} from "@/lib/http";
import {emailPreference} from "@/lib/mail-preferences";
import {db} from "@/lib/db";
export const dynamic="force-dynamic";
export async function GET(){try{const s=await identity();const p=await emailPreference(s.user.id);return Response.json({enabled:p.enabled});}catch(e){return errorResponse(e);}}
export async function POST(req:Request){try{assertOrigin(req);const s=await identity();await limit("mail-preference:"+s.user.id,20);const p=z.object({enabled:z.boolean()}).strict().parse(await body(req,1024));await emailPreference(s.user.id);await db.query("UPDATE email_subscription SET enabled=$2,updated_at=now() WHERE user_id=$1",[s.user.id,p.enabled]);return Response.json({enabled:p.enabled});}catch(e){return errorResponse(e);}}
