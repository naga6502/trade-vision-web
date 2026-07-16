const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function nseCookies() {
  const h = { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" };
  const home = await fetch("https://www.nseindia.com", {
    headers: { ...h, Accept: "text/html,application/xhtml+xml" },
  });
  const c1 = home.headers.getSetCookie?.() ?? [];
  const ck1 = c1.map((c) => c.split(";")[0]).join("; ");
  await new Promise((r) => setTimeout(r, 300));
  const mkt = await fetch("https://www.nseindia.com/market-data/live-equity-market", {
    headers: { ...h, Cookie: ck1, Referer: "https://www.nseindia.com" },
  });
  const c2 = mkt.headers.getSetCookie?.() ?? [];
  const ck2 = c2.map((c) => c.split(";")[0]).join("; ");
  const all = (ck1 + "; " + ck2)
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  const m = new Map();
  all.forEach((p) => {
    const i = p.indexOf("=");
    if (i > 0) m.set(p.slice(0, i), p);
  });
  return [...m.values()].join("; ");
}

async function tryJson(url, headers) {
  try {
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
    const t = await r.text();
    return { status: r.status, body: t };
  } catch (e) {
    return { error: String(e) };
  }
}

const ck = await nseCookies();
const nse = await tryJson("https://www.nseindia.com/api/ipo-current", {
  "User-Agent": UA,
  Cookie: ck,
  Referer: "https://www.nseindia.com",
  "X-Requested-With": "XMLHttpRequest",
  Accept: "application/json",
});
console.log("=== NSE ipo-current", nse.status ?? nse.error);
if (nse.body) {
  try {
    const j = JSON.parse(nse.body);
    const arr = j.data ?? j;
    console.log("NSE top keys:", Object.keys(j));
    console.log("NSE first:", JSON.stringify(Array.isArray(arr) ? arr[0] : j, null, 1).slice(0, 1400));
  } catch {
    console.log("NSE parse fail:", nse.body.slice(0, 300));
  }
}

for (const url of [
  "https://webnodejs.investorgain.com/api/ipo/latest",
  "https://webnodejs.investorgain.com/api/ipo/upcoming",
  "https://www.ipowatch.in/ipo-gmp/",
  "https://www.chittorgarh.com/ipo/",
]) {
  const res = await tryJson(url, {
    "User-Agent": UA,
    Accept: "application/json, text/html",
    Referer: url,
  });
  console.log(`\n=== ${url} ::`, res.status ?? res.error);
  if (res.body) {
    console.log(res.body.slice(0, 600));
  }
}
