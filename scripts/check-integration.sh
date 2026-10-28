#!/bin/sh
set -eu
# Test SMTP sink only; never inherit a production Resend credential.
export RESEND_API_KEY=
npm run migrate
npm run build
DATABASE_URL="${RUNTIME_DATABASE_URL:-$DATABASE_URL}" npm start > /tmp/penge-http.log 2>&1 &
app_pid=$!
trap 'kill "$app_pid" 2>/dev/null || true' EXIT
node -e 'let n=0;const timer=setInterval(async()=>{try{const r=await fetch("http://localhost:3000/api/health");if(r.ok){clearInterval(timer);process.exit(0)}}catch{}if(++n>60){clearInterval(timer);process.exit(1)}},500)'
npm run integration || { cat /tmp/penge-http.log; exit 1; }

npx tsx --test tests/admin-integration.ts || { cat /tmp/penge-http.log; exit 1; }

npx tsx --test tests/payday-integration.ts || { cat /tmp/penge-http.log; exit 1; }

npx tsx --test tests/onboarding-integration.ts || { cat /tmp/penge-http.log; exit 1; }

npx tsx --test tests/mail-integration.ts || { cat /tmp/penge-http.log; exit 1; }

npx tsx --test tests/security-integration.ts

npx tsx --test tests/runtime-role-integration.ts
