import { betterAuth } from "better-auth";
import { createAuthMiddleware, APIError, getSessionFromCtx } from "better-auth/api";
import { hash, verify } from "@node-rs/argon2";
import { createHash } from "node:crypto";
import {mailConfigured,sendAccountMail} from "./mail-transport";
import { db } from "./db";
export const auth=betterAuth({
 database:db,
 baseURL:process.env.BETTER_AUTH_URL,
 secret:process.env.BETTER_AUTH_SECRET,
 trustedOrigins:[process.env.BETTER_AUTH_URL??"http://localhost:3000"],
 verification:{storeIdentifier:"hashed"},
 databaseHooks:{session:{create:{before:async session=>{
  if((await db.query("SELECT 1 FROM disabled_account WHERE user_id=$1",[session.userId])).rowCount)throw new APIError("UNAUTHORIZED",{code:"INVALID_EMAIL_OR_PASSWORD",message:"Invalid email or password"});
  return {data:session};
 }}}},
 emailAndPassword:{
 enabled:true,minPasswordLength:12,maxPasswordLength:128,resetPasswordTokenExpiresIn:3600,
 revokeSessionsOnPasswordReset:true,
 password:{
 hash:(password)=>hash(password,{algorithm:2,memoryCost:65536,timeCost:3,parallelism:1}),
 verify:({hash:encoded,password})=>verify(encoded,password)
 },
 sendResetPassword:async({user,url})=>{
 if(!mailConfigured())throw new Error("E-post er ikke konfigurert");
 await sendAccountMail(user.email,{subject:"Tilbakestill passordet i Penge",title:"Velg et nytt passord.",body:"Vi har mottatt en forespørsel om å tilbakestille passordet ditt. Lenken gjelder i én time.\n\nHvis du ikke ba om dette, kan du se bort fra e-posten. Passordet ditt er ikke endret.",buttonLabel:"Velg nytt passord",buttonUrl:url},user.id);
 },
 },
 user:{deleteUser:{enabled:true},changeEmail:{enabled:true,updateEmailWithoutVerification:false}},
 emailVerification:{sendVerificationEmail:async({user,url})=>{
 if(!mailConfigured())throw new Error("E-post er ikke konfigurert");
 await sendAccountMail(user.email,{subject:"Bekreft e-postadressen i Penge",title:"Bekreft den nye e-postadressen.",body:"Du har bedt om å bruke denne e-postadressen i Penge. Trykk på knappen for å bekrefte endringen.\n\nHvis du ikke ba om dette, kan du se bort fra e-posten.",buttonLabel:"Bekreft e-postadresse",buttonUrl:url},user.id);
 }},
 session:{expiresIn:60*60*24*7,updateAge:60*60*24},
 rateLimit:{enabled:true,storage:"database",window:60,max:30,customRules:{"/sign-in/email":{window:60,max:5},"/sign-up/email":{window:60,max:3},"/request-password-reset":{window:60,max:3}}},
 advanced:{useSecureCookies:process.env.BETTER_AUTH_URL?.startsWith("https://"),ipAddress:{ipAddressHeaders:[]}},
 hooks:{before:createAuthMiddleware(async ctx=>{
 if(ctx.path==="/change-email"){
 if(!mailConfigured())throw new APIError("SERVICE_UNAVAILABLE",{message:"E-post er ikke konfigurert"});
 const session=await getSessionFromCtx(ctx);
 const encoded=session?await db.query('SELECT password FROM account WHERE "userId"=$1 AND "providerId"=\'credential\'',[session.user.id]):null;
 if(!encoded?.rowCount||typeof ctx.body?.currentPassword!=="string"||!(await verify(encoded.rows[0].password,ctx.body.currentPassword)))throw new APIError("UNAUTHORIZED",{message:"Bekreft med riktig passord"});
 }
 if(ctx.path==="/sign-up/email"){
 const token=ctx.headers?.get("x-penge-invite")??"";
 const digest=createHash("sha256").update(token).digest("hex");
 const invite=await db.query("SELECT id FROM invitation WHERE token_hash=$1 AND lower(email)=lower($2) AND expires_at>now() AND used_at IS NULL",[digest,ctx.body?.email??""]);
 if(!invite.rowCount)throw new APIError("FORBIDDEN",{message:"Gyldig invitasjon kreves"});
 }
 })}
});
