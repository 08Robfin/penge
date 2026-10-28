import {test} from "node:test";
import assert from "node:assert/strict";
import {emailTemplate,invitationContent} from "../src/lib/email-templates";
import {sealMail,openMail} from "../src/lib/mail-queue";
process.env.BETTER_AUTH_SECRET??="unit-test-encryption-secret-not-production";
test("invitation explains Penge, includes exact one-use link, privacy and provider credit",()=>{
 const url="https://penge.example/?invite=secret&email=friend%40example.test",content=invitationContent(url),r=emailTemplate(content,"https://penge.example");
 assert(r.text.includes(url));assert(r.html.includes("invite=secret&amp;email="));assert(r.html.includes("syv dager"));assert(r.html.includes("Personvern"));assert(r.html.includes("En tjeneste levert av"));assert(!r.html.includes("Meld meg av"));
});
test("all author content is HTML-escaped while paragraphs are preserved",()=>{
 const r=emailTemplate({subject:'<script>"x"</script>',title:"<img src=x onerror=alert(1)>",body:"<script>alert(1)</script>\nNext\n\nParagraph",unsubscribeUrl:"https://penge.example/unsubscribe?a=1&b=2"});
 assert(!r.html.includes("<script>"));assert(!r.html.includes("<img"));assert(r.html.includes("&lt;script&gt;"));assert(r.html.includes("Next")&&r.html.includes("Paragraph"));
 const lines=emailTemplate({subject:"Lines",title:"Lines",body:"First\nNext"});assert(lines.html.includes("<br>Next"));assert(r.html.includes("Meld meg av nyhetsmailer"));
});
test("both newsletter designs have text fallback, accessible table layout and no tracking pixel",()=>{
 for(const template of ["news","announcement"] as const){const r=emailTemplate({subject:"Nytt",title:"En forbedring",body:"Se hva som er nytt.",template,buttonUrl:"https://penge.example",unsubscribeUrl:"https://penge.example/unsubscribe"});assert(r.html.includes('role="presentation"'));assert(r.text.includes("Meld meg av"));assert(!r.html.includes("<img"));assert(r.html.includes('lang="nb"'));}
});
test("queue payload encrypts recipient and invitation token with authenticated randomized encryption",()=>{
 const message={to:"friend@example.test",subject:"Invite",html:"<p>token-private</p>",text:"token-private"},a=sealMail(message),b=sealMail(message);assert.notEqual(a,b);assert(!Buffer.from(a,"base64").toString().includes("token-private"));assert.deepEqual(openMail(a),message);
 const damaged=Buffer.from(a,"base64");damaged[damaged.length-1]^=1;assert.throws(()=>openMail(damaged.toString("base64")));
});

test("newsletter Markdown supports headings, emphasis, strike-through, lists and safe links",()=>{
 const r=emailTemplate({subject:"Nytt",title:"En forbedring",body:"## Ny funksjon\n\n**Viktig** og *enkelt*. ~~Gammelt~~\n\n- Første\n- Andre\n\n[Les mer](https://penge.example/news)"});
 assert(r.html.includes("<h2 "));assert(r.html.includes("<strong>Viktig</strong>"));assert(r.html.includes("<em>enkelt</em>"));assert(r.html.includes("<del>Gammelt</del>"));assert(r.html.includes("<ul "));assert(r.html.includes('href="https://penge.example/news"'));
});
test("Markdown never emits raw HTML, images, unsafe URLs or user-supplied styles",()=>{
 const r=emailTemplate({subject:"Test",title:"Test",body:'<img src="https://tracker.example/x" onerror="alert(1)">\n\n[Bad](javascript:alert(1))\n\n[Data](data:text/html,evil)\n\n![Alt](https://tracker.example/pixel)\n\n<script>alert(1)</script>'});
 assert(!r.html.includes("<img"));assert(!r.html.includes("<script"));assert(!r.html.includes('href="javascript:'));assert(!r.html.includes('href="data:'));assert(r.html.includes("&lt;img"));assert(r.html.includes("Alt"));
});
