import { getAiPrediction } from "./aiPrediction.js";
import { getIvRadar } from "./ivRadar.js";
import { getOptionPressure } from "./optionPressure.js";
import { getMonteCarlo } from "./monteCarlo.js";
import { getEquityCurves } from "./equityCurves.js";
export type Verdict = "STRONG BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG SELL";
export interface AnalyzeComponents {
    aiPrediction: Awaited<ReturnType<typeof getAiPrediction>> | null;
    ivRadar: Awaited<ReturnType<typeof getIvRadar>> | null;
    optionPressure: Awaited<ReturnType<typeof getOptionPressure>> | null;
    monteCarlo: Awaited<ReturnType<typeof getMonteCarlo>> | null;
    equityCurves: Awaited<ReturnType<typeof getEquityCurves>> | null;
}
export interface AnalyzeStock {
    symbol: string;
    signal: Verdict;
    confidenceScore: number;
    score: number;
    bullishFactors: string[];
    bearishFactors: string[];
    summary: string;
    components: AnalyzeComponents;
    generatedAt: string;
}
export interface AnalyzeStockArgs {
    /** NSE symbol, e.g. RELIANCE. */
    symbol: string;
}
export declare function getAnalyzeStock(args: AnalyzeStockArgs): Promise<AnalyzeStock>;
