import {identity,assertOrigin,body,errorResponse,limit} from "@/lib/http";
import {onboardingState,updateOnboarding} from "@/lib/onboarding";
export const dynamic="force-dynamic";
export async function GET(){try{const s=await identity();return Response.json(await onboardingState(s.user.id));}catch(e){return errorResponse(e);}}
export async function POST(req:Request){try{assertOrigin(req);const s=await identity();await limit("onboarding:"+s.user.id,120);return Response.json(await updateOnboarding(s.user.id,await body(req,65536)));}catch(e){return errorResponse(e);}}
