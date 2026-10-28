import nodemailer from "nodemailer";
import {emailTemplate,type EmailContent} from "./email-templates";
export const mailConfigured=()=>Boolean(process.env.MAIL_FROM&&(process.env.RESEND_API_KEY||process.env.SMTP_URL));
export type OutgoingMail={to:string;from?:string;subject:string;html:string;text:string;headers?:Record<string,string>};
export class MailDeliveryError extends Error{constructor(public code:string,public retryable:boolean){super(code);}}
export async function deliverMail(message:OutgoingMail,idempotencyKey:string){
 if(!mailConfigured())throw new MailDeliveryError("not_configured",false);
 const from=message.from??process.env.MAIL_FROM!;
 if(process.env.RESEND_API_KEY){
  let response:Response;
  try{response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{authorization:"Bearer "+process.env.RESEND_API_KEY,"content-type":"application/json","Idempotency-Key":idempotencyKey},body:JSON.stringify({...message,from}),signal:AbortSignal.timeout(20000)});}catch{throw new MailDeliveryError("network_timeout",true);}
  if(!response.ok)throw new MailDeliveryError("provider_"+response.status,response.status===429||response.status>=500||response.status===409);
  const result=await response.json();if(typeof result.id!=="string")throw new MailDeliveryError("invalid_response",true);
  return result.id as string;
 }
 // SMTP is retained for existing installations and isolated integration tests.
 try{const r=await nodemailer.createTransport(process.env.SMTP_URL!).sendMail({...message,from});return String(r.messageId);}catch{throw new MailDeliveryError("smtp_failed",true);}
}
export async function sendAccountMail(to:string,content:EmailContent,userId:string){
 const {enqueueMail}=await import("./mail-queue");
 return enqueueMail({to,subject:content.subject,...emailTemplate(content)},{kind:"account",userId,expiresAt:new Date(Date.now()+55*60*1000)});
}
