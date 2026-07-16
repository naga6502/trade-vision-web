const APPLY_THRESHOLD = 25;
const SKIP_THRESHOLD = -10;
const MAX_SCORE = 120;
/**
 * Explainable IPO verdict. Every dimension contributes a weighted, signed
 * `points` value plus a human-readable `note`, so the final APPLY / SKIP /
 * WATCH call is fully auditable rather than a black box.
 */
export function computeIpoSignal(ipo) {
    const checks = [];
    const f = ipo.financials;
    const s = ipo.subscription;
    const band = ipo.priceBand;
    // Effective GMP %: use the explicit figure, else derive from the rupee GMP
    // against the price-band midpoint.
    let gmpPct = ipo.gmpPercent;
    if (gmpPct === null && ipo.gmp !== null && band) {
        const mid = (band.min + band.max) / 2;
        if (mid > 0)
            gmpPct = (ipo.gmp / mid) * 100;
    }
    const add = (c) => checks.push(c);
    // 1. Valuation — issue P/E vs industry P/E
    if (f?.peRatio != null && f?.industryPe != null && f.industryPe > 0) {
        const ratio = f.peRatio / f.industryPe;
        if (f.peRatio <= f.industryPe)
            add({ id: "valuation_pe", label: "Valuation (P/E vs industry)", weight: 25, status: "PASS", points: 25, note: `Issue P/E ${f.peRatio} is at/below the industry P/E ${f.industryPe}.` });
        else if (ratio <= 1.25)
            add({ id: "valuation_pe", label: "Valuation (P/E vs industry)", weight: 25, status: "WARN", points: 8, note: `Issue P/E ${f.peRatio} is slightly above industry P/E ${f.industryPe} (${ratio.toFixed(2)}x).` });
        else
            add({ id: "valuation_pe", label: "Valuation (P/E vs industry)", weight: 25, status: "FAIL", points: -25, note: `Issue P/E ${f.peRatio} is rich vs industry P/E ${f.industryPe} (${ratio.toFixed(2)}x).` });
    }
    else {
        add({ id: "valuation_pe", label: "Valuation (P/E vs industry)", weight: 25, status: "WARN", points: 0, note: "P/E comparison unavailable (issue or industry P/E missing)." });
    }
    // 2. Grey-market premium (GMP)
    if (gmpPct != null) {
        if (gmpPct >= 15)
            add({ id: "gmp", label: "Grey-market premium", weight: 20, status: "PASS", points: 20, note: `GMP implies +${gmpPct.toFixed(1)}% over issue price — healthy grey-market demand.` });
        else if (gmpPct > 0)
            add({ id: "gmp", label: "Grey-market premium", weight: 20, status: "WARN", points: 8, note: `GMP implies +${gmpPct.toFixed(1)}% — modest grey-market interest.` });
        else
            add({ id: "gmp", label: "Grey-market premium", weight: 20, status: "FAIL", points: -20, note: `GMP is ${gmpPct.toFixed(1)}% (flat/negative) — weak grey-market sentiment.` });
    }
    else {
        add({ id: "gmp", label: "Grey-market premium", weight: 20, status: "WARN", points: 0, note: "GMP unavailable (grey-market data not fetched)." });
    }
    // 3. QIB subscription
    if (s?.qib != null) {
        if (s.qib >= 10)
            add({ id: "sub_qib", label: "QIB subscription", weight: 20, status: "PASS", points: 20, note: `QIB subscribed ${s.qib}x — strong institutional demand.` });
        else if (s.qib >= 3)
            add({ id: "sub_qib", label: "QIB subscription", weight: 20, status: "WARN", points: 10, note: `QIB subscribed ${s.qib}x.` });
        else if (s.qib < 1)
            add({ id: "sub_qib", label: "QIB subscription", weight: 20, status: "FAIL", points: -15, note: `QIB under-subscribed (${s.qib}x).` });
        else
            add({ id: "sub_qib", label: "QIB subscription", weight: 20, status: "WARN", points: 4, note: `QIB subscribed ${s.qib}x.` });
    }
    else {
        add({ id: "sub_qib", label: "QIB subscription", weight: 20, status: "WARN", points: 0, note: "QIB subscription unavailable." });
    }
    // 4. HNI / NII subscription
    if (s?.nii != null) {
        if (s.nii >= 20)
            add({ id: "sub_nii", label: "HNI/NII subscription", weight: 12, status: "PASS", points: 12, note: `HNI subscribed ${s.nii}x.` });
        else if (s.nii >= 5)
            add({ id: "sub_nii", label: "HNI/NII subscription", weight: 12, status: "WARN", points: 6, note: `HNI subscribed ${s.nii}x.` });
        else if (s.nii < 1)
            add({ id: "sub_nii", label: "HNI/NII subscription", weight: 12, status: "FAIL", points: -10, note: `HNI under-subscribed (${s.nii}x).` });
        else
            add({ id: "sub_nii", label: "HNI/NII subscription", weight: 12, status: "WARN", points: 3, note: `HNI subscribed ${s.nii}x.` });
    }
    else {
        add({ id: "sub_nii", label: "HNI/NII subscription", weight: 12, status: "WARN", points: 0, note: "HNI subscription unavailable." });
    }
    // 5. Retail subscription
    if (s?.retail != null) {
        if (s.retail >= 5)
            add({ id: "sub_retail", label: "Retail subscription", weight: 5, status: "PASS", points: 5, note: `Retail subscribed ${s.retail}x.` });
        else if (s.retail < 1)
            add({ id: "sub_retail", label: "Retail subscription", weight: 5, status: "WARN", points: -5, note: `Retail under-subscribed (${s.retail}x).` });
        else
            add({ id: "sub_retail", label: "Retail subscription", weight: 5, status: "WARN", points: 0, note: `Retail subscribed ${s.retail}x.` });
    }
    else {
        add({ id: "sub_retail", label: "Retail subscription", weight: 5, status: "WARN", points: 0, note: "Retail subscription unavailable." });
    }
    // 6. Fundamentals — growth
    const rg = f?.revenueGrowth ?? null;
    const pg = f?.profitGrowth ?? null;
    if (rg != null || pg != null) {
        const pos = [rg, pg].filter((v) => v != null && v > 0).length;
        const neg = [rg, pg].filter((v) => v != null && v < 0).length;
        if (neg > 0)
            add({ id: "fnd_growth", label: "Fundamentals — growth", weight: 12, status: "FAIL", points: -12, note: `Declining top-line/profit (rev ${rg ?? "n/a"}%, PAT ${pg ?? "n/a"}%).` });
        else if (pos === 2)
            add({ id: "fnd_growth", label: "Fundamentals — growth", weight: 12, status: "PASS", points: 12, note: `Growing revenue (${rg}%) and PAT (${pg}%).` });
        else
            add({ id: "fnd_growth", label: "Fundamentals — growth", weight: 12, status: "WARN", points: 6, note: `Mixed growth (rev ${rg ?? "n/a"}%, PAT ${pg ?? "n/a"}%).` });
    }
    else {
        add({ id: "fnd_growth", label: "Fundamentals — growth", weight: 12, status: "WARN", points: 0, note: "Growth data unavailable." });
    }
    // 7. Fundamentals — profitability (ROE)
    if (f?.roe != null) {
        if (f.roe >= 15)
            add({ id: "fnd_roe", label: "Fundamentals — ROE", weight: 10, status: "PASS", points: 10, note: `ROE ${f.roe}% — healthy returns.` });
        else if (f.roe >= 0)
            add({ id: "fnd_roe", label: "Fundamentals — ROE", weight: 10, status: "WARN", points: 4, note: `ROE ${f.roe}%.` });
        else
            add({ id: "fnd_roe", label: "Fundamentals — ROE", weight: 10, status: "FAIL", points: -10, note: `Negative ROE (${f.roe}%).` });
    }
    else {
        add({ id: "fnd_roe", label: "Fundamentals — ROE", weight: 10, status: "WARN", points: 0, note: "ROE unavailable." });
    }
    // 8. Fundamentals — leverage
    if (f?.debtEquity != null) {
        if (f.debtEquity <= 0.5)
            add({ id: "fnd_leverage", label: "Fundamentals — leverage", weight: 8, status: "PASS", points: 8, note: `Low debt/equity (${f.debtEquity}).` });
        else if (f.debtEquity <= 1)
            add({ id: "fnd_leverage", label: "Fundamentals — leverage", weight: 8, status: "WARN", points: 3, note: `Moderate debt/equity (${f.debtEquity}).` });
        else
            add({ id: "fnd_leverage", label: "Fundamentals — leverage", weight: 8, status: "FAIL", points: -8, note: `High debt/equity (${f.debtEquity}).` });
    }
    else {
        add({ id: "fnd_leverage", label: "Fundamentals — leverage", weight: 8, status: "WARN", points: 0, note: "Debt/equity unavailable." });
    }
    // 9. Risk flags (can force SKIP)
    let criticalFail = false;
    const weakDemand = (s?.total != null && s.total < 1) || (s?.qib != null && s.qib < 1);
    const negativeGmp = gmpPct != null && gmpPct <= 0;
    const richVal = f?.peRatio != null && f?.industryPe != null && f.industryPe > 0 &&
        f.peRatio / f.industryPe > 1.5;
    if (negativeGmp && weakDemand) {
        criticalFail = true;
        add({ id: "risk", label: "Risk flag", weight: 0, status: "FAIL", points: -30, note: "Negative GMP combined with under-subscription — weak overall demand." });
    }
    else if (richVal && (negativeGmp || weakDemand)) {
        criticalFail = true;
        add({ id: "risk", label: "Risk flag", weight: 0, status: "FAIL", points: -25, note: "Rich valuation with weak demand signals." });
    }
    const score = checks.reduce((a, c) => a + c.points, 0);
    const haveGmp = ipo.gmp != null || ipo.gmpPercent != null;
    const haveSub = ipo.subscription != null;
    const haveFnd = ipo.financials != null;
    const completeness = [haveGmp, haveSub, haveFnd].filter(Boolean).length;
    const confidence = completeness === 3 && ipo.priceBand ? "HIGH" : completeness >= 1 ? "MEDIUM" : "LOW";
    let signal;
    if (criticalFail)
        signal = "SKIP";
    else if (score >= APPLY_THRESHOLD)
        signal = "APPLY";
    else if (score <= SKIP_THRESHOLD)
        signal = "SKIP";
    else
        signal = "WATCH";
    const decisive = checks
        .filter((c) => c.status !== "WARN" || c.points !== 0)
        .sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
    const reasons = decisive.slice(0, 6).map((c) => `[${c.status}] ${c.label}: ${c.note}`);
    reasons.push(`Overall score ${score} (higher = more favourable). Confidence: ${confidence}.`);
    return {
        signal,
        score,
        maxScore: MAX_SCORE,
        confidence,
        checks: checks.map((c) => ({
            id: c.id,
            label: c.label,
            weight: c.weight,
            status: c.status,
            points: c.points,
            note: c.note,
        })),
        reasons,
        disclaimer: "Heuristic signal for research only — not investment advice. GMP is unofficial grey-market data and is volatile.",
    };
}
//# sourceMappingURL=signal.js.map