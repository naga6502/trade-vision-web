const { getSessionCookies } = await import("./dist/nse/session.js");
let ck = await getSessionCookies();
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function merge(...jars){const m=new Map();for(const j of jars)for(const p of j.split(";")){const i=p.indexOf("=");if(i>0)m.set(p.slice(0,i).trim(),p.trim());}return [...m.values()].join("; ");}
const shpUrl = "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern?symbol=RELIANCE&tabIndex=equity";
const shp = await fetch(shpUrl,{headers:{"User-Agent":UA,Cookie:ck,Referer:"https://www.nseindia.com/"},signal:AbortSignal.timeout(25000)});
ck = merge(ck, shp.headers.get("set-cookie")||"");
const html = await shp.text();
console.log("page len:", html.length);
for(const kw of ["pr_and_prgrp","promoter","shareHolding","shareholding","but-available","api/","_next/static/chunks","fii","dii","mutual"]){
  const i=html.toLowerCase().indexOf(kw.toLowerCase());
  console.log(`  '${kw}': ${i>=0?"FOUND @"+i:"absent"}`);
}
// Extract any /api/ urls
const apis=[...new Set([...html.matchAll(/https?:\/\/www\.nseindia\.com\/api\/[^\"'<\s)\]+/gi)].map(m=>m[0]))];
console.log("api urls in html:", apis.slice(0,15));
// Extract _next static chunk urls (we can fetch one to find the endpoint)
const chunks=[...new Set([...html.matchAll(/\/_next\/static\/chunks\/[^\"'<\s)+]+\.js/gi)].map(m=>m[0]))];
console.log("chunk count:", chunks.length, "sample:", chunks.slice(0,5));
