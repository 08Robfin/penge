import {Lexer,type Token,type Tokens} from "marked";
export const escapeEmailHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
const paragraph='margin:0 0 18px;color:#526057;font-size:16px;line-height:1.7;overflow-wrap:anywhere';
function safeLink(href:string,base:string){
 try{const url=new URL(href,base);return ["https:","mailto:"].includes(url.protocol)?url.href:null;}catch{return null;}
}
export function renderEmailMarkdown(source:string,base:string){
 const e=escapeEmailHtml;
 // Render a small allowlist of token types, never Marked's raw HTML output.
 function inline(tokens:Token[]=[],depth=0):string{
  if(depth>24)return tokens.map(t=>e(t.raw)).join("");
  return tokens.map(t=>{
   switch(t.type){
    case "strong":return "<strong>"+inline(t.tokens,depth+1)+"</strong>";
    case "em":return "<em>"+inline(t.tokens,depth+1)+"</em>";
    case "del":return "<del>"+inline(t.tokens,depth+1)+"</del>";
    case "link":{const label=inline(t.tokens,depth+1),href=safeLink(t.href,base);return href?'<a href="'+e(href)+'" style="color:#285f43;text-decoration:underline">'+label+"</a>":label;}
    case "image":return e(t.text);
    case "codespan":return '<code style="font-family:monospace;background:#edf4ee;padding:2px 4px;border-radius:4px">'+e(t.text)+"</code>";
    case "br":return "<br>";
    case "text":return t.tokens?inline(t.tokens,depth+1):e(t.text);
    case "escape":case "html":return e(t.text);
    default:return e(t.raw);
   }
  }).join("");
 }
 function block(tokens:Token[]=[],depth=0):string{
  if(depth>24)return tokens.map(t=>e(t.raw)).join("");
  return tokens.map(t=>{
   switch(t.type){
    case "space":return "";
    case "paragraph":return '<p style="'+paragraph+'">'+inline(t.tokens)+"</p>";
    case "heading":{const level=Math.min(4,Math.max(2,t.depth));return "<h"+level+' style="margin:26px 0 14px;color:#202b25;font-size:'+(level===2?22:level===3?19:17)+'px;line-height:1.35">'+inline(t.tokens)+"</h"+level+">";}
    case "list":{const list=t as Tokens.List;const tag=list.ordered?"ol":"ul",start=t.ordered&&Number.isInteger(t.start)?' start="'+Math.max(1,Math.min(1000000,Number(t.start)))+'"':"";return "<"+tag+start+' style="margin:0 0 20px;padding-left:24px;color:#526057;font-size:16px;line-height:1.7">'+list.items.map(item=>'<li style="margin:6px 0">'+(item.task?(item.checked?"☑ ":"☐ "):"")+block(item.tokens,depth+1)+"</li>").join("")+"</"+tag+">";}
    case "text":return t.tokens?inline(t.tokens):e(t.text);
    case "blockquote":return '<blockquote style="margin:20px 0;padding:4px 0 4px 18px;border-left:3px solid #79a789">'+block(t.tokens,depth+1)+"</blockquote>";
    case "code":return '<pre style="padding:14px;background:#edf4ee;border-radius:8px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px"><code>'+e(t.text)+"</code></pre>";
    case "hr":return '<hr style="border:0;border-top:1px solid #e5ebe6;margin:24px 0">';
    case "table":{const table=t as Tokens.Table;return '<table style="border-collapse:collapse;width:100%;font-size:14px;margin:20px 0"><thead><tr>'+table.header.map(cell=>'<th scope="col" style="padding:10px;border:1px solid #e5ebe6;text-align:left">'+inline(cell.tokens)+"</th>").join("")+"</tr></thead><tbody>"+table.rows.map(row=>"<tr>"+row.map(cell=>'<td style="padding:10px;border:1px solid #e5ebe6;overflow-wrap:anywhere">'+inline(cell.tokens)+"</td>").join("")+"</tr>").join("")+"</tbody></table>";}
    case "html":return '<p style="'+paragraph+'">'+e(t.text).replace(/\n/g,"<br>")+"</p>";
    default:return '<p style="'+paragraph+'">'+inline([t])+"</p>";
   }
  }).join("");
 }
 return block(Lexer.lex(source,{gfm:true,breaks:true}));
}
