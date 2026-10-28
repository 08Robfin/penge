import { identity,assertOrigin,body,errorResponse,limit } from "@/lib/http";
import { csvPreview } from "@/lib/csv";
import { HttpError } from "@/lib/store";
export async function POST(req:Request){
 try{assertOrigin(req);const s=await identity();await limit("csv:"+s.user.id,20);const input=await body(req);
 try{return Response.json(csvPreview(input));}catch(e){throw new HttpError(400,e instanceof Error?e.message:"Ugyldig CSV");}
 }catch(e){return errorResponse(e);}
}
