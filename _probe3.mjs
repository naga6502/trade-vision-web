const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function html(url) {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*" },
      signal: AbortSignal.timeout(20000),
    });
    return await r.text();
  } catch (e) {
    return `ERR:${e}`;
  }
}

function findApis(t, label) {
  const re = /(?:['"`])([^'"`]*\/api\/[^'"`]*)/g;
  const set = new Set();
  let m;
  while ((m = re.exec(t)) !== null) set.add(m[1]);
  const ipo = [...set].filter((s) => /ipo|IPO|gmp|GMP/i.test(s));
  console.log(`\n[${label}] candidate API paths (ipo/gmp):`);
  console.log(ipo.length ? ipo.join("\n") : "(none found in /api/ matches)");
  // also show any webnodejs / investorgain endpoints
  const wn = [...new Set((t.match(/https?:\/\/[a-z0-9.\-]*investorgain\.com\/[^\s'"\\]+/gi) || []))];
  if (wn.length) { console.log("investorgain hosts:"); console.log([...new Set(wn.map((u) => u.replace(/\?.*/, "")))].join("\n")); }
}

const pages = [
  ["NSE ipo", "https://www.nseindia.com/market-data/ipo"],
  ["InvestorGain", "https://www.investorgain.com/ipo/latest"],
  ["InvestorGain2", "https://webnodejs.investorgain.com/"],
  ["IPO Watch", "https://www.ipowatch.in/ipo-gmp/"],
  ["Chittorgarh", "https://www.chittorgarh.com/ipo/"],
  ["BSE ipo", "https://www.bseindia.com/markets/public/issues/Equity/current_issue.aspx"],
];
for (const [label, url] of pages) {
  const t = await html(url);
  console.log(`\n##### ${label} (${url}) len=${t.length}`);
  if (t.startsWith("ERR:")) { console.log(t); continue; }
  findApis(t, label);
}
