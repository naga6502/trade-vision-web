const { getSessionCookies } = await import("./dist/nse/session.js");
let ck = await getSessionCookies();
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Does the working quote-equity API embed shareholding data?
const url = "https://www.nseindia.com/api/quote-equity?symbol=RELIANCE";
const r = await fetch(url, {
  headers: { "User-Agent": UA, Cookie: ck, Referer: "https://www.nseindia.com/get-quotes/equity?symbol=RELIANCE", "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
  signal: AbortSignal.timeout(25000),
});
const t = await r.text();
console.log("quote-equity status:", r.status, "len:", t.length);
try {
  const j = JSON.parse(t);
  const keys = Object.keys(j);
  console.log("top keys:", keys.join(","));
  const has = ["shareHoldingPattern", "shareHolding", "promoter", "fii", "dii", "pr_and_prgrp"];
  for (const k of has) console.log(`  '${k}':`, k in j ? "PRESENT" : "absent");
  if (j.shareHoldingPattern) console.log("shareHoldingPattern sample:", JSON.stringify(j.shareHoldingPattern).slice(0, 500));
} catch {
  console.log("parse fail:", t.slice(0, 200));
}
