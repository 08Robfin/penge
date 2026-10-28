import {test} from "node:test";
import assert from "node:assert/strict";
import {validateRuntimeConfig} from "../scripts/runtime-config.cjs";
const valid={DATABASE_URL:"postgresql://penge:synthetic-only-db-password@db/penge",BETTER_AUTH_SECRET:"synthetic-only-authentication-secret-42",BETTER_AUTH_URL:"http://localhost:3000"};
test("runtime configuration requires independent secrets and a safe exact origin",()=>{
 assert.doesNotThrow(()=>validateRuntimeConfig(valid));
 for(const patch of [{BETTER_AUTH_SECRET:"short"},{BETTER_AUTH_SECRET:"generate-a-different-random-64-character-hex-value"},{BETTER_AUTH_URL:"https://example.test/path"},{BETTER_AUTH_URL:"http://example.test"},{DATABASE_URL:"postgresql://penge:your-postgres-password@db/penge"},{RESEND_API_KEY:"synthetic-key",MAIL_FROM:""}])assert.throws(()=>validateRuntimeConfig({...valid,...patch}));
 assert.doesNotThrow(()=>validateRuntimeConfig({...valid,BETTER_AUTH_URL:"https://budget.example.test",RESEND_API_KEY:"synthetic-key",MAIL_FROM:"Penge <sender@example.test>"}));
});
