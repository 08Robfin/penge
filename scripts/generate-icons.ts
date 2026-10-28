import sharp from "sharp";
import {readFile,writeFile,mkdir} from "node:fs/promises";
const source=await readFile("assets/brand/home-screen-logo.png");
const background="#2a543e";
await mkdir("public/app-icons",{recursive:true});
const icons=[["penge-192-v2.png",192,"icon-192.png"],["penge-512-v2.png",512,"icon-512.png"],["penge-apple-180-v2.png",180,"apple-touch-icon.png"],["penge-favicon-48-v2.png",48,null]] as const;
for(const [name,size,legacy] of icons){
 const png=await sharp(source).flatten({background}).resize(size,size).png().toBuffer();
 await writeFile("public/app-icons/"+name,png);
 if(legacy)await writeFile("public/"+legacy,png);
}
const inset=await sharp(source).flatten({background}).resize(410,410).png().toBuffer();
const mask=await sharp({create:{width:512,height:512,channels:3,background}}).composite([{input:inset,left:51,top:51}]).png().toBuffer();
await writeFile("public/app-icons/penge-maskable-512-v2.png",mask);
await writeFile("public/icon-maskable.png",mask);
console.log("Generated Penge icons from supplied artwork");
