const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const code = "500325";
const url = `https://www.bseindia.com/corporates/shareholding.aspx?Code=${code}`;
const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*" }, signal: AbortSignal.timeout(25000) });
const html = await r.text();
console.log("status", r.status, "len", html.length);
console.log("tables:", (html.match(/<table/gi) || []).length, " tr:", (html.match(/<tr/gi) || []).length, " td:", (html.match(/<td/gi) || []).length);
for (const kw of ["Promoter", "Public", "as on", "FII", "DII", "Mutual", "Shareholding", "shareholding", "pattern", "Pattern"]) {
  const i = html.indexOf(kw);
  console.log(`  '${kw}': ${i >= 0 ? "FOUND @" + i : "absent"}`);
}
// any api/aspx references inside scripts
const refs = [...new Set([...html.matchAll(/(?:href|src|action|url|fetch|ajax)\s*[:=]\s*["']([^"']+)["']/gi)].map((m) => m[1]))];
console.log("script/ref urls:", refs.slice(0, 20));
// print a window around first <table
const ti = html.indexOf("<table");
if (ti >= 0) console.log("\n--- around <table ---\n", html.slice(ti, ti + 600).replace(/\s+/g, " "));
