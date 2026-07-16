export interface ModelVote {
    model: string;
    vote: "BULLISH" | "BEARISH" | "NEUTRAL";
    weight: number;
    detail: string;
}
export interface AiPrediction {
    symbol: string;
    prediction: "UP" | "DOWN" | "FLAT";
    upProbability: number;
    confidence: number;
    signalStrength: number;
    regime: "TRENDING" | "RANGING" | "VOLATILE";
    modelVotes: ModelVote[];
    bullishFactors: string[];
    bearishFactors: string[];
    method: string;
    generatedAt: string;
}
export interface AiPredictionArgs {
    symbol: string;
}
export declare function getAiPrediction(args: AiPredictionArgs): Promise<AiPrediction>;
