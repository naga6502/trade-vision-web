const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function mergeCookies(...jars) {
  const m = new Map();
  jars.flatMap((j) => String(j).split(";"))
    .map((p) => p.trim())
    .filter(Boolean)
    .forEach((p) => {
      const i = p.indexOf("=");
      if (i > 0) m.set(p.slice(0, i), p);
    });
  return [...m.values()].join("; ");
}
async function get(url, headers) {
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  const a = r.headers.getSetCookie?.() ?? [];
  const ck = a.map((c) => c.split(";")[0]).join("; ");
  return { status: r.status, body: await r.text(), ck };
}

const h = { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" };
let ck = "";
const r1 = await get("https://www.nseindia.com", { ...h, Accept: "text/html" });
ck = mergeCookies(ck, r1.ck);
await new Promise((r) => setTimeout(r, 300));
const r2 = await get("https://www.nseindia.com/market-data/ipo", {
  ...h, Cookie: ck, Referer: "https://www.nseindia.com", Accept: "text/html",
});
ck = mergeCookies(ck, r2.ck);
await new Promise((r) => setTimeout(r, 300));
const r3 = await get("https://www.nseindia.com/market-data/live-equity-market", {
  ...h, Cookie: ck, Referer: "https://www.nseindia.com/market-data/ipo", Accept: "text/html",
});
ck = mergeCookies(ck, r3.ck);

const nsePaths = [
  "/api/ipo-current", "/api/ipo-latest", "/api/ipo-upcoming", "/api/ipo-closed",
  "/api/sme/ipo-current", "/api/sme/ipo-latest", "/api/sme/ipo-upcoming",
];
for (const p of nsePaths) {
  const res = await get(`https://www.nseindia.com${p}`, {
    "User-Agent": UA, Cookie: ck, Referer: "https://www.nseindia.com/market-data/ipo",
    "X-Requested-With": "XMLHttpRequest", Accept: "application/json, text/plain, */*",
  });
  let info = "";
  if (res.status === 200) {
    try {
      const j = JSON.parse(res.body);
      const arr = j.data ?? j.csvData ?? j;
      info = `keys=${Object.keys(j).join(",")} | sample=${JSON.stringify(Array.isArray(arr) ? arr[0] : j).slice(0, 220)}`;
    } catch {
      info = res.body.slice(0, 140);
    }
  } else {
    info = res.body.slice(0, 80);
  }
  console.log(`NSE ${p} -> ${res.status} | ${info}`);
}

const igPaths = [
  "https://webnodejs.investorgain.com/api/ipo/live",
  "https://webnodejs.investorgain.com/api/ipos",
  "https://webnodejs.investorgain.com/api/ipo",
  "https://api.investorgain.com/ipo/latest",
  "https://webnodejs.investorgain.com/api/ipo/gmp",
];
for (const u of igPaths) {
  const res = await get(u, { "User-Agent": UA, Accept: "application/json", Referer: u });
  console.log(`IG ${u} -> ${res.status} | ${res.body.slice(0, 160)}`);
}
