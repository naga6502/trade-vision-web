const { getSessionCookies } = await import("./dist/nse/session.js");
let ck = await getSessionCookies();
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function merge(...jars){const m=new Map();for(const j of jars)for(const p of j.split(";")){const i=p.indexOf("=");if(i>0)m.set(p.slice(0,i).trim(),p.trim());}return [...m.values()].join("; ");}
async function get(url,ref,accept="text/html,application/xhtml+xml"){const r=await fetch(url,{headers:{"User-Agent":UA,Cookie:ck,Referer:ref,Accept:accept},signal:AbortSignal.timeout(25000)});return r;}

// Visit the exact shareholding page (with symbol) to set session cookies
const shpUrl = "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern?symbol=RELIANCE&tabIndex=equity";
const shp = await get(shpUrl, "https://www.nseindia.com/");
ck = merge(ck, shp.headers.get("set-cookie") || "");
console.log("after shareholding page, cookie len:", ck.length, "status:", shp.status);

const api = "https://www.nseindia.com/api/security-but-available?symbol=RELIANCE";
const r = await fetch(api, {headers:{"User-Agent":UA,Cookie:ck,Referer:shpUrl,"X-Requested-With":"XMLHttpRequest",Accept:"application/json"},signal:AbortSignal.timeout(25000)});
const t = await r.text();
console.log("security-but-available status:", r.status, "len:", t.length);
try{const j=JSON.parse(t);const shp2=j.shareHoldingPattern||j.shareHolding||j.data;if(Array.isArray(shp2)){console.log("rows:",shp2.length,"keys:",Object.keys(shp2[0]||{}).join(","));console.log("sample:",JSON.stringify(shp2[0]).slice(0,800));}else console.log("top keys:",Object.keys(j).join(","),JSON.stringify(j).slice(0,400));}catch{console.log("parse fail:",t.slice(0,200));}
