const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
async function get(url, headers = {}) {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, ...headers },
      signal: AbortSignal.timeout(20000),
    });
    return { status: r.status, body: await r.text() };
  } catch (e) {
    return { status: 0, body: "ERR:" + e };
  }
}

// --- BSE IPO API ---
const bse =
  "https://api.bseindia.com/Bse_data/equity/IPOOpenClose.aspx?strCat=-1&strPrevList=-1&strToDate=&strFromDate=&strOrder=A&strSortBy=ADate&scrip=&sseries=&page=1&skip=0&pagesize=100";
const b = await get(bse, { Accept: "application/json" });
console.log("=== BSE IPO API", b.status, "len", b.body.length);
try {
  const j = JSON.parse(b.body);
  console.log("BSE keys:", Object.keys(j));
  const arr = j.Table ?? j.table ?? j.data ?? j;
  console.log("BSE sample:", JSON.stringify(Array.isArray(arr) ? arr[0] : arr).slice(0, 400));
} catch {
  console.log(b.body.slice(0, 300));
}

// --- Chittorgarh: does the HTML embed GMP data? ---
const c = await get("https://www.chittorgarh.com/ipo/", { Accept: "text/html" });
console.log("\n=== Chittorgarh /ipo/ len", c.body.length);
for (const kw of ["__NEXT_DATA__", "ipoGmp", "GMP", "companyName", "liveIpo"]) {
  const i = c.body.indexOf(kw);
  console.log(`'${kw}' index:`, i, i >= 0 ? c.body.slice(i, i + 160).replace(/\s+/g, " ") : "");
}

// --- IPO Watch: GMP table present? ---
const w = await get("https://www.ipowatch.in/ipo-gmp/", { Accept: "text/html" });
console.log("\n=== IPO Watch /ipo-gmp/ len", w.body.length);
const gi = w.body.indexOf("GMP");
console.log("'GMP' index:", gi, gi >= 0 ? w.body.slice(gi - 80, gi + 160).replace(/\s+/g, " ") : "");
