export function assertTestEnvironment(){
 const database=new URL(process.env.DATABASE_URL??"postgresql://invalid/invalid");
 const origin=new URL(process.env.BETTER_AUTH_URL??"https://invalid.example");
 if(!/^\/penge_test(?:_[a-z0-9_]+)?$/.test(database.pathname)||!["localhost","127.0.0.1","[::1]"].includes(origin.hostname)){
  throw new Error("Refusing test: use an explicitly disposable penge_test database and loopback app URL. Never use production credentials.");
 }
}
