import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
// Curated set of global benchmark indices surfaced on the dashboard.
const DEFAULT_INDICES = [
    { symbol: "^GSPC", name: "S&P 500" },
    { symbol: "^IXIC", name: "Nasdaq" },
    { symbol: "^DJI", name: "Dow Jones" },
    { symbol: "^N225", name: "Nikkei 225" },
    { symbol: "^FTSE", name: "FTSE 100" },
    { symbol: "^GDAXI", name: "DAX" },
    { symbol: "^HSI", name: "Hang Seng" },
    { symbol: "^BSESN", name: "SENSEX" },
];
const CACHE_TTL_MS = 60_000;
let cache = null;
export async function getGlobalMarkets(args = {}) {
    const list = (args.symbols ?? DEFAULT_INDICES.map((i) => i.symbol)).map((sym) => {
        const known = DEFAULT_INDICES.find((i) => i.symbol === sym);
        return { symbol: sym, name: known?.name ?? sym };
    });
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
        // Return cached values in the requested symbol order.
        return list
            .map((l) => cache.data.find((d) => d.symbol === l.symbol))
            .filter((d) => d != null);
    }
    const data = await Promise.all(list.map(async (l) => {
        try {
            const r = await yahooFinance.quote(l.symbol);
            const price = typeof r.regularMarketPrice === "number" ? r.regularMarketPrice : 0;
            const prev = typeof r.regularMarketPreviousClose === "number" ? r.regularMarketPreviousClose : 0;
            const change = price - prev;
            return {
                symbol: l.symbol,
                name: l.name,
                price,
                previousClose: prev,
                change,
                changePercent: prev ? (change / prev) * 100 : 0,
                currency: r.currency ?? "USD",
            };
        }
        catch {
            return {
                symbol: l.symbol,
                name: l.name,
                price: 0,
                previousClose: 0,
                change: 0,
                changePercent: 0,
                currency: "USD",
            };
        }
    }));
    cache = { at: Date.now(), data };
    return data;
}
//# sourceMappingURL=globalMarkets.js.map