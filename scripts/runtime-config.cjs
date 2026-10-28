/** @param {Record<string, string | undefined>} [env] */
function validateRuntimeConfig(env=process.env){
 for(const name of ["DATABASE_URL","BETTER_AUTH_SECRET","BETTER_AUTH_URL"]){
  if(!env[name])throw new Error("Missing required configuration: "+name);
 }
 if(env.BETTER_AUTH_SECRET.length<32||/generate-|replace-|default-secret/i.test(env.BETTER_AUTH_SECRET))throw new Error("Generate a fresh authentication secret with at least 32 characters.");
 const base=new URL(env.BETTER_AUTH_URL);
 if(!["http:","https:"].includes(base.protocol)||base.username||base.password||!["","/"].includes(base.pathname)||base.search||base.hash)throw new Error("BETTER_AUTH_URL must be an exact HTTP(S) origin.");
 if(base.protocol!=="https:"&&!["localhost","127.0.0.1","[::1]"].includes(base.hostname))throw new Error("Remote installations require an HTTPS origin.");
 const db=new URL(env.DATABASE_URL);
 if(!["postgres:","postgresql:"].includes(db.protocol)||!db.password||/generate-|replace-|your-postgres-password/i.test(decodeURIComponent(db.password)))throw new Error("Configure an independent PostgreSQL credential.");
 if((env.RESEND_API_KEY||env.SMTP_URL)&&!env.MAIL_FROM)throw new Error("MAIL_FROM is required when email delivery is configured.");
}
module.exports={validateRuntimeConfig};
