import { identity,assertOrigin,body,errorResponse,limit } from "@/lib/http";
import { isAdmin,adminSnapshot,adminAction } from "@/lib/admin";
import { HttpError } from "@/lib/store";
export const dynamic="force-dynamic";
async function administrator(){
 const s=await identity();
 if(!await isAdmin(s.user.id))throw new HttpError(403,"Kun administrator har tilgang");
 return s;
}
export async function GET(){
 try{const s=await administrator();await limit("admin-read:"+s.user.id,60);return Response.json(await adminSnapshot());}catch(e){return errorResponse(e);}
}
export async function POST(req:Request){
 try{assertOrigin(req);const s=await administrator();await limit("admin-write:"+s.user.id,30);return Response.json(await adminAction(s.user.id,await body(req,8192)));}catch(e){return errorResponse(e);}
}
