import { getOptionChain } from "../options/optionChain.js";
import { validateSymbol } from "../quant/util.js";
function parseExpiry(s) {
    // NSE expiryDates arrive as DD-MM-YYYY.
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
    if (!m)
        return null;
    const d = new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00Z`);
    if (isNaN(d.getTime()))
        return null;
    return d.getTime();
}
function gaussian(x, width) {
    return Math.exp(-(x * x) / (2 * width * width));
}
export async function getOptionPressure(args) {
    const symbol = (args.symbol ?? "").trim().toUpperCase();
    if (!symbol)
        throw new Error("symbol is required");
    const ticker = validateSymbol(symbol);
    const base = ticker.replace(/\.(NS|BO)$/, "");
    const notes = [];
    let chain = null;
    try {
        chain = await getOptionChain(base, args.expiry);
    }
    catch {
        chain = null;
    }
    if (!chain || !chain.strikes.length || !chain.underlying) {
        notes.push("Option chain unavailable (non-F&O stock, or NSE blocked programmatic access). Option-pressure metrics require an active chain.");
        return {
            symbol: ticker,
            underlying: null,
            expiryDate: null,
            daysToExpiry: null,
            maxPain: null,
            gammaWall: null,
            expectedMove: { points: null, pct: null, method: "unknown" },
            squeezeTargets: null,
            pressureZones: [],
            notes,
            generatedAt: new Date().toISOString(),
        };
    }
    const underlying = chain.underlying;
    const strikes = chain.strikes;
    const expiryDate = chain.expiryDates[0] ?? null;
    // Days to expiry.
    let daysToExpiry = null;
    if (expiryDate) {
        const expMs = parseExpiry(expiryDate);
        if (expMs != null)
            daysToExpiry = Math.max(0, Math.round((expMs - Date.now()) / 86_400_000));
    }
    const maxPain = chain.summary.maxPain;
    // ATM straddle -> expected move.
    let atmStrike = strikes[0];
    let best = Infinity;
    for (const s of strikes) {
        const d = Math.abs(s.strikePrice - underlying);
        if (d < best) {
            best = d;
            atmStrike = s;
        }
    }
    const atmCall = atmStrike.ce?.lastPrice ?? 0;
    const atmPut = atmStrike.pe?.lastPrice ?? 0;
    const straddle = atmCall + atmPut;
    const expectedMove = {
        points: straddle > 0 ? Number(straddle.toFixed(2)) : null,
        pct: straddle > 0 && underlying > 0 ? Number(((straddle / underlying) * 100).toFixed(2)) : null,
        method: straddle > 0 ? "straddle" : "unknown",
    };
    // Gamma wall: aggregate dealer gamma exposure per strike. Higher OI near the
    // money implies larger hedging flow, so the level where that exposure peaks
    // tends to pin or accelerate price.
    const width = underlying * 0.04;
    let gammaWall = null;
    let maxExposure = -Infinity;
    for (const s of strikes) {
        const ceOI = s.ce?.openInterest ?? 0;
        const peOI = s.pe?.openInterest ?? 0;
        const oi = ceOI + peOI;
        if (oi <= 0)
            continue;
        const g = oi * gaussian(s.strikePrice - underlying, width);
        if (g > maxExposure) {
            maxExposure = g;
            gammaWall = { strike: s.strikePrice, exposure: Number(g.toFixed(0)) };
        }
    }
    // Squeeze targets anchored at max pain +/- expected move.
    const emPoints = expectedMove.points;
    const squeezeTargets = maxPain != null && emPoints != null
        ? {
            up: Number((maxPain + emPoints).toFixed(2)),
            down: Number((maxPain - emPoints).toFixed(2)),
        }
        : null;
    // Pressure zones: top call-OI strikes (resistance) and put-OI strikes (support).
    const withOi = strikes.filter((s) => (s.ce?.openInterest ?? 0) > 0 || (s.pe?.openInterest ?? 0) > 0);
    const callZones = [...withOi]
        .sort((a, b) => (b.ce?.openInterest ?? 0) - (a.ce?.openInterest ?? 0))
        .slice(0, 3)
        .map((s) => ({
        role: "CALL_RESISTANCE",
        strike: s.strikePrice,
        oi: s.ce?.openInterest ?? 0,
        distancePct: Number((((s.strikePrice - underlying) / underlying) * 100).toFixed(2)),
    }));
    const putZones = [...withOi]
        .sort((a, b) => (b.pe?.openInterest ?? 0) - (a.pe?.openInterest ?? 0))
        .slice(0, 3)
        .map((s) => ({
        role: "PUT_SUPPORT",
        strike: s.strikePrice,
        oi: s.pe?.openInterest ?? 0,
        distancePct: Number((((s.strikePrice - underlying) / underlying) * 100).toFixed(2)),
    }));
    const pressureZones = [...callZones, ...putZones].sort((a, b) => a.distancePct - b.distancePct);
    return {
        symbol: ticker,
        underlying: Number(underlying.toFixed(2)),
        expiryDate,
        daysToExpiry,
        maxPain,
        gammaWall,
        expectedMove,
        squeezeTargets,
        pressureZones,
        notes,
        generatedAt: new Date().toISOString(),
    };
}
//# sourceMappingURL=optionPressure.js.map