export interface FundamentalsArgs {
    /**
     * NSE stock symbol, e.g. "RELIANCE", "TCS", "HDFC".
     * The .NS Yahoo Finance suffix is appended automatically.
     * Pass the full Yahoo symbol to override, e.g. "RELIANCE.NS" or "TCS.BO".
     */
    symbol: string;
}
export interface RecommendationPoint {
    period: string;
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
}
export interface MajorHolders {
    insidersPercentHeld: number | null;
    institutionsPercentHeld: number | null;
    institutionsFloatPercentHeld: number | null;
    institutionsCount: number | null;
}
export interface CashFlowYear {
    fiscalDate: string;
    operating: number | null;
    investing: number | null;
    financing: number | null;
    freeCashFlow: number | null;
}
export interface IncomeStatementRow {
    periodEnd: string;
    totalRevenue: number | null;
    costOfRevenue: number | null;
    grossProfit: number | null;
    operatingIncome: number | null;
    ebit: number | null;
    ebitda: number | null;
    netIncome: number | null;
    netIncomeCommonStockholders: number | null;
    dilutedEPS: number | null;
}
export interface Fundamentals {
    ticker: string;
    name: string | null;
    currency: string;
    exchange: string | null;
    timestamp: string;
    price: number;
    previousClose: number;
    dayHigh: number | null;
    dayLow: number | null;
    fiftyTwoWeekHigh: number | null;
    fiftyTwoWeekLow: number | null;
    volume: number | null;
    averageVolume: number | null;
    marketCap: number | null;
    beta: number | null;
    trailingPE: number | null;
    forwardPE: number | null;
    priceToBook: number | null;
    eps: number | null;
    dividendYield: number | null;
    profitMargins: number | null;
    operatingMargins: number | null;
    grossMargins: number | null;
    returnOnEquity: number | null;
    returnOnAssets: number | null;
    debtToEquity: number | null;
    currentRatio: number | null;
    totalCash: number | null;
    totalDebt: number | null;
    freeCashflow: number | null;
    revenueGrowth: number | null;
    earningsGrowth: number | null;
    targetMeanPrice: number | null;
    recommendationMean: number | null;
    recommendationTrend: RecommendationPoint[];
    majorHolders: MajorHolders;
    cashflow: CashFlowYear[];
    incomeStatementQuarterly: IncomeStatementRow[];
    incomeStatementAnnual: IncomeStatementRow[];
}
export declare function getFundamentals(args: FundamentalsArgs): Promise<Fundamentals>;
