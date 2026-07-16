// Curated sector -> stocks universe for the Sector Fundamentals scanner.
//
// Local NSE tooling exposes no sector classification for individual stocks
// (only sector *indices*), and the remote `screen_stocks` (which carries a
// sector field) is rate-limited. So we ship a curated map of major, liquid
// NSE tickers per sector. Symbols are well-known large/mid caps; any ticker
// the quote endpoint can't resolve is skipped gracefully at scoring time.
//
// This can later be replaced by live constituents pulled from the remote
// screener when it is responsive — the rest of the pipeline is unchanged.

export interface SectorDef {
  name: string;
  symbols: string[];
}

export const SECTORS: SectorDef[] = [
  {
    name: "IT",
    symbols: ["TCS", "INFY", "WIPRO", "HCLTECH", "TECHM", "LTIM", "PERSISTENT", "COFORGE", "LTTS", "KPITTECH"],
  },
  {
    name: "Banks",
    symbols: ["HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK", "INDUSINDBK", "BANKBARODA", "FEDERALBNK", "PNB", "IDFCFIRSTB"],
  },
  {
    name: "NBFC",
    symbols: ["BAJFINANCE", "BAJAJFINSV", "CHOLAFIN", "MUTHOOTFIN", "SHRIRAMFIN", "MANNAPURAM", "PEL", "PNBHOUSING"],
  },
  {
    name: "Pharma",
    symbols: ["SUNPHARMA", "DRREDDY", "CIPLA", "DIVISLAB", "LUPIN", "AUROPHARMA", "TORNTPHARMA", "BIOCON", "LALPATHLAB", "APOLLOHOSP"],
  },
  {
    name: "Auto",
    symbols: ["MARUTI", "TATAMOTORS", "M&M", "BAJAJ-AUTO", "EICHERMOT", "HEROMOTOCO", "TVSMOTOR", "ASHOKLEY", "MOTHERSON", "BOSCHLTD"],
  },
  {
    name: "FMCG",
    symbols: ["HINDUNILEVER", "ITC", "NESTLEIND", "BRITANNIA", "DABUR", "TATACONSUM", "MARICO", "GODREJCP", "COLPAL", "UNITDSPR"],
  },
  {
    name: "Energy & Oil/Gas",
    symbols: ["RELIANCE", "ONGC", "IOC", "BPCL", "HINDPETRO", "GAIL", "ADANIPORTS", "POWERGRID", "NTPC", "TATAPOWER"],
  },
  {
    name: "Metals & Mining",
    symbols: ["TATASTEEL", "JSWSTEEL", "HINDALCO", "SAIL", "VEDL", "NALCO", "NMDC", "COALINDIA", "HINDZINC", "JINDALSTEL"],
  },
  {
    name: "Realty",
    symbols: ["DLF", "GODREJPROP", "OBEROIRLTY", "SOBHA", "PRESTIGE", "BRIGADE", "PHOENIXLTD", "MACROTECH"],
  },
  {
    name: "Telecom",
    symbols: ["BHARTIARTL", "IDEA"],
  },
  {
    name: "Consumer Durables",
    symbols: ["TITAN", "VOLTAS", "HAVELLS", "BLUESTARCO", "DIXON", "WHIRLPOOL", "CROMPTON", "VARUNBEVER", "WESTLIFE"],
  },
  {
    name: "Infra & Cement",
    symbols: ["LARSEN", "ULTRACEMCO", "AMBUJACEM", "SHREECEM", "NCC", "KEC", "KNRCL", "PNCINFRA", "IRB", "ASHOKA"],
  },
  {
    name: "Chemicals",
    symbols: ["PIDILITIND", "SRF", "AARTIIND", "DEEPAKNTR", "GUJALKALI", "TATACHEM", "NAVINFLUOR", "ALKYLAMINE", "SUMICHEM", "GNFC"],
  },
];

export type SectorTag = "Strong" | "Moderate" | "Weak";

export interface QuoteLike {
  price?: number | null;
  previousClose?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  trailingPE?: number | null;
  marketCap?: number | null;
  dividendYield?: number | null;
}

// Min/max of log(marketCap) across the scanned universe, used to normalize the
// "quality/size" axis so large-caps read as stronger/stabler.
export interface ScoreInput {
  q: QuoteLike;
  capMin: number;
  capMax: number;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function valuationScore(pe: number | null | undefined): number {
  if (pe == null || pe <= 0) return 0;
  if (pe < 8) return 1;
  if (pe > 40) return 0;
  return (40 - pe) / (40 - 8); // pe=8 -> 1, pe=40 -> 0
}

function performanceScore(
  price: number | null | undefined,
  low: number | null | undefined,
  high: number | null | undefined,
): number {
  if (price == null || !(low && low > 0) || !(high && high > low)) return 0.5;
  return clamp01((price - low) / (high - low));
}

function qualityScore(
  mktCap: number | null | undefined,
  min: number,
  max: number,
): number {
  if (mktCap == null || mktCap <= 0 || !isFinite(min) || !isFinite(max) || min === max)
    return 0.5;
  return clamp01((Math.log(mktCap) - min) / (max - min));
}

function incomeScore(dy: number | null | undefined): number {
  return clamp01((dy ?? 0) / 3);
}

export function scoreStock({ q, capMin, capMax }: ScoreInput): {
  strength: number;
  tag: SectorTag;
} {
  const val = valuationScore(q.trailingPE);
  const perf = performanceScore(q.price, q.fiftyTwoWeekLow, q.fiftyTwoWeekHigh);
  const qual = qualityScore(q.marketCap, capMin, capMax);
  const inc = incomeScore(q.dividendYield);

  const strength = Math.round(
    100 * (0.35 * val + 0.4 * perf + 0.2 * qual + 0.05 * inc),
  );
  const tag: SectorTag = strength >= 66 ? "Strong" : strength >= 40 ? "Moderate" : "Weak";
  return { strength, tag };
}
