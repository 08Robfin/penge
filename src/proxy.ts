import { NextRequest,NextResponse } from "next/server";
export function proxy(request:NextRequest){
 const nonce=Buffer.from(crypto.randomUUID()).toString("base64");
 const dev=process.env.NODE_ENV==="development";
 const csp="default-src 'self'; script-src 'self' 'nonce-"+nonce+"' 'strict-dynamic'"+(dev?" 'unsafe-eval'":"")+"; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
 const headers=new Headers(request.headers);headers.set("x-nonce",nonce);headers.set("Content-Security-Policy",csp);
 const response=NextResponse.next({request:{headers}});
 response.headers.set("Content-Security-Policy",csp);
 if(process.env.BETTER_AUTH_URL?.startsWith("https://"))response.headers.set("Strict-Transport-Security","max-age=15552000");
 return response;
}
export const config={matcher:["/((?!_next/static|_next/image|icon|apple-touch-icon|manifest.webmanifest|sw.js).*)"]};
