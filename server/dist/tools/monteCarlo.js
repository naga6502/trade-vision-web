import { validateSymbol, fetchDailyBars, logReturns, mean, std, percentile, randn, round } from "../quant/util.js";
export async function getMonteCarlo(args) {
    const ticker = validateSymbol(args.symbol);
    const horizonDays = Math.max(1, Math.min(252, args.horizonDays ?? 30));
    const paths = Math.max(100, Math.min(100_000, args.paths ?? 10_000));
    const histDays = args.historicalDays ?? 365;
    const { bars } = await fetchDailyBars(ticker, histDays);
    if (bars.length < 30)
        throw new Error(`Not enough history for ${ticker}`);
    const closes = bars.map((b) => b.close);
    const spot = closes[closes.length - 1];
    const rets = logReturns(closes);
    const muDaily = mean(rets);
    const sigmaDaily = std(rets);
    if (!Number.isFinite(sigmaDaily) || sigmaDaily <= 0) {
        throw new Error(`Could not estimate volatility for ${ticker}`);
    }
    // GBM per-step multiplier: exp((mu - 0.5 sigma^2) + sigma * Z).
    const driftStep = muDaily - 0.5 * sigmaDaily * sigmaDaily;
    const terminals = new Float64Array(paths);
    for (let p = 0; p < paths; p++) {
        let price = spot;
        for (let t = 0; t < horizonDays; t++) {
            price *= Math.exp(driftStep + sigmaDaily * randn());
        }
        terminals[p] = price;
    }
    // Sort a copy for percentile extraction.
    const sorted = Array.from(terminals).sort((a, b) => a - b);
    const meanPrice = mean(Array.from(terminals));
    const medianPrice = percentile(sorted, 50);
    const range90 = [percentile(sorted, 5), percentile(sorted, 95)];
    const range68 = [percentile(sorted, 16), percentile(sorted, 84)];
    let above = 0;
    let drop10 = 0;
    const threshold10 = spot * 0.9;
    for (const v of terminals) {
        if (v > spot)
            above++;
        if (v < threshold10)
            drop10++;
    }
    // Histogram into ~12 buckets spanning the 1st-99th percentile range.
    const lo = percentile(sorted, 1);
    const hi = percentile(sorted, 99);
    const buckets = 12;
    const width = (hi - lo) / buckets || 1;
    const dist = Array.from({ length: buckets }, (_, i) => ({
        bucketLow: round(lo + i * width, 2),
        bucketHigh: round(lo + (i + 1) * width, 2),
        count: 0,
        prob: 0,
    }));
    for (const v of terminals) {
        let idx = Math.floor((v - lo) / width);
        if (idx < 0)
            idx = 0;
        if (idx >= buckets)
            idx = buckets - 1;
        dist[idx].count++;
    }
    for (const d of dist)
        d.prob = round(d.count / paths, 4);
    const tradingDaysPerYear = 252;
    return {
        symbol: ticker,
        spot: round(spot, 2),
        horizonDays,
        paths,
        meanPrice: round(meanPrice, 2),
        medianPrice: round(medianPrice, 2),
        range90: [round(range90[0], 2), round(range90[1], 2)],
        range68: [round(range68[0], 2), round(range68[1], 2)],
        probAboveSpot: round(above / paths, 4),
        prob10PctDrop: round(drop10 / paths, 4),
        expectedAnnualDriftPct: round(muDaily * tradingDaysPerYear * 100, 2),
        annualVolPct: round(sigmaDaily * Math.sqrt(tradingDaysPerYear) * 100, 2),
        distribution: dist,
        generatedAt: new Date().toISOString(),
    };
}
//# sourceMappingURL=monteCarlo.js.map