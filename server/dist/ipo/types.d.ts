export interface IpoSubscription {
    /** Times subscribed by Qualified Institutional Buyers. */
    qib: number | null;
    /** Times subscribed by HNI / Non-Institutional Investors (NII). */
    nii: number | null;
    /** Times subscribed by retail investors. */
    retail: number | null;
    /** Overall times subscribed (all categories). */
    total: number | null;
}
export interface IpoFinancials {
    /** Latest FY revenue, ₹ Cr. */
    revenue: number | null;
    /** Latest FY profit after tax, ₹ Cr. */
    pat: number | null;
    /** Fully diluted EPS. */
    eps: number | null;
    /** Issue P/E (price band / EPS). */
    peRatio: number | null;
    /** Industry / peer median P/E. */
    industryPe: number | null;
    /** Return on equity, %. */
    roe: number | null;
    /** Debt / equity ratio. */
    debtEquity: number | null;
    /** Revenue CAGR / growth, %. */
    revenueGrowth: number | null;
    /** Profit CAGR / growth, %. */
    profitGrowth: number | null;
}
/** Grey-market + fundamentals enrichment from a third-party aggregator. */
export interface GmpEnrichment {
    /** Grey-market premium per share, ₹. */
    gmp: number | null;
    /** GMP as a % over the issue price. */
    gmpPercent: number | null;
    /** As-of date for the GMP quote. */
    gmpAsOf: string | null;
    subscription?: IpoSubscription | null;
    financials?: IpoFinancials | null;
    /** Which aggregator provided this data. */
    source?: string;
}
export interface IpoPriceBand {
    min: number;
    max: number;
    kind: "BAND" | "FIXED";
    raw: string;
}
/**
 * Unified IPO record. `gmp*`, `subscription` and `financials` are optional —
 * they are sourced from third-party aggregators and may be unavailable.
 */
export interface Ipo {
    companyName: string;
    symbol: string | null;
    isin: string | null;
    exchange: "NSE" | "BSE" | "ALL" | string;
    type: "Mainline" | "SME";
    issueType: string | null;
    priceBand: IpoPriceBand | null;
    issueSizeCr: number | null;
    lotSize: number | null;
    faceValue: number | null;
    openDate: string | null;
    closeDate: string | null;
    listingDate: string | null;
    allotmentDate: string | null;
    gmp: number | null;
    gmpPercent: number | null;
    gmpAsOf: string | null;
    subscription: IpoSubscription | null;
    financials: IpoFinancials | null;
    drhpLink: string | null;
    /** "NSE" when only official data is present, "NSE+aggregator" when enriched. */
    dataSource: string;
}
export type IpoSignalVerdict = "APPLY" | "SKIP" | "WATCH";
export interface IpoSignalCheck {
    id: string;
    label: string;
    weight: number;
    status: "PASS" | "WARN" | "FAIL";
    points: number;
    note: string;
}
export interface IpoSignal {
    signal: IpoSignalVerdict;
    /** Weighted sum of check points. */
    score: number;
    /** Maximum achievable score (for context). */
    maxScore: number;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    checks: IpoSignalCheck[];
    reasons: string[];
    disclaimer: string;
}
/** An IPO record with its computed signal attached. */
export type IpoWithSignal = Ipo & {
    signal: IpoSignal;
};
