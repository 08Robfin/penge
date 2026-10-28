import {db} from "@/lib/db";
export const dynamic="force-dynamic";
export async function POST(req:Request){
 const token=new URL(req.url).searchParams.get("token")??"";
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))return Response.json({error:"Ugyldig avmeldingslenke"},{status:400});
 await db.query("UPDATE email_subscription SET enabled=false,updated_at=now() WHERE token=$1",[token]);
 if(req.headers.get("content-type")?.includes("application/x-www-form-urlencoded")&&req.headers.get("origin"))return Response.redirect(new URL("/email/unsubscribe?done=1",process.env.BETTER_AUTH_URL!),303);
 return Response.json({ok:true});
}

export async function GET(req:Request){const token=new URL(req.url).searchParams.get("token")??"";return Response.redirect(new URL("/email/unsubscribe?token="+encodeURIComponent(token),process.env.BETTER_AUTH_URL!),303);}
