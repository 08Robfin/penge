import { Pool } from "pg";
const globalDb=globalThis as unknown as {pengePool?:Pool};
export const db=globalDb.pengePool??new Pool({connectionString:process.env.DATABASE_URL,max:8,idleTimeoutMillis:10000});
if(process.env.NODE_ENV!=="production")globalDb.pengePool=db;
