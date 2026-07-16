export interface ResearchReport {
    symbol: string;
    report: string;
    generatedAt: string;
}
export interface ResearchReportArgs {
    /** NSE symbol, e.g. RELIANCE. */
    symbol: string;
}
export declare function generateStockResearchReport(args: ResearchReportArgs): Promise<ResearchReport>;
