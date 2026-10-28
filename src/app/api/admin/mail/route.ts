import {identity,assertOrigin,body,errorResponse,limit} from "@/lib/http";
import {isAdmin} from "@/lib/admin";
import {HttpError} from "@/lib/store";
import {mailAdminSnapshot,campaignAction} from "@/lib/mail-campaigns";
export const dynamic="force-dynamic";
async function admin(){const s=await identity();if(!await isAdmin(s.user.id))throw new HttpError(403,"Kun administrator har tilgang");return s;}
export async function GET(){try{const s=await admin();await limit("mail-admin-read:"+s.user.id,60);return Response.json(await mailAdminSnapshot());}catch(e){return errorResponse(e);}}
export async function POST(req:Request){try{assertOrigin(req);const s=await admin();const input=await body(req,30000);await limit("mail-admin:"+s.user.id,30);if(input?.action==="test")await limit("mail-test:"+s.user.id,3);if(input?.action==="send")await limit("mail-send:"+s.user.id,3);return Response.json(await campaignAction(s.user.id,input));}catch(e){return errorResponse(e);}}
