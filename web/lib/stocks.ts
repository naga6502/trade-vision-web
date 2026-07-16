// Curated NSE stock directory used to populate the analytics stock selector.
// Covers the Nifty 50 plus other widely traded large/mid caps. This is a
// static, offline list so the dropdown always loads; extend it (or swap it
// for a live feed) as needed. Values are NSE tickers; labels are company
// names so users can search by either.

export interface StockEntry {
  symbol: string;
  name: string;
}

export const STOCKS: StockEntry[] = [
  { symbol: "RELIANCE", name: "Reliance Industries" },
  { symbol: "TCS", name: "Tata Consultancy Services" },
  { symbol: "HDFCBANK", name: "HDFC Bank" },
  { symbol: "INFY", name: "Infosys" },
  { symbol: "ICICIBANK", name: "ICICI Bank" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever" },
  { symbol: "ITC", name: "ITC" },
  { symbol: "SBIN", name: "State Bank of India" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel" },
  { symbol: "LICI", name: "Life Insurance Corporation of India" },
  { symbol: "TATAMOTORS", name: "Tata Motors" },
  { symbol: "TATASTEEL", name: "Tata Steel" },
  { symbol: "AXISBANK", name: "Axis Bank" },
  { symbol: "MARUTI", name: "Maruti Suzuki India" },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical Industries" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank" },
  { symbol: "WIPRO", name: "Wipro" },
  { symbol: "M&M", name: "Mahindra & Mahindra" },
  { symbol: "NTPC", name: "NTPC" },
  { symbol: "POWERGRID", name: "Power Grid Corporation of India" },
  { symbol: "ONGC", name: "Oil and Natural Gas Corporation" },
  { symbol: "TITAN", name: "Titan Company" },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement" },
  { symbol: "ADANIPORTS", name: "Adani Ports and SEZ" },
  { symbol: "NESTLEIND", name: "Nestle India" },
  { symbol: "HCLTECH", name: "HCL Technologies" },
  { symbol: "TECHM", name: "Tech Mahindra" },
  { symbol: "ASIANPAINT", name: "Asian Paints" },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv" },
  { symbol: "DRREDDY", name: "Dr Reddy's Laboratories" },
  { symbol: "CIPLA", name: "Cipla" },
  { symbol: "COALINDIA", name: "Coal India" },
  { symbol: "DIVISLAB", name: "Divi's Laboratories" },
  { symbol: "EICHERMOT", name: "Eicher Motors" },
  { symbol: "GRASIM", name: "Grasim Industries" },
  { symbol: "HDFCLIFE", name: "HDFC Life Insurance" },
  { symbol: "HEROMOTOCO", name: "Hero MotoCorp" },
  { symbol: "HINDALCO", name: "Hindalco Industries" },
  { symbol: "INDUSINDBK", name: "IndusInd Bank" },
  { symbol: "JSWSTEEL", name: "JSW Steel" },
  { symbol: "LT", name: "Larsen & Toubro" },
  { symbol: "LTIM", name: "LTIMindtree" },
  { symbol: "SBILIFE", name: "SBI Life Insurance" },
  { symbol: "TATACONSUM", name: "Tata Consumer Products" },
  { symbol: "UPL", name: "UPL" },
  { symbol: "VEDL", name: "Vedanta" },
  { symbol: "APOLLOHOSP", name: "Apollo Hospitals Enterprise" },
  { symbol: "BPCL", name: "Bharat Petroleum Corporation" },
  { symbol: "BRITANNIA", name: "Britannia Industries" },
  { symbol: "DLF", name: "DLF" },
  { symbol: "GAIL", name: "GAIL (India)" },
  { symbol: "HAVELLS", name: "Havells India" },
  { symbol: "IOC", name: "Indian Oil Corporation" },
  { symbol: "PIDILITIND", name: "Pidilite Industries" },
  { symbol: "SHRIRAMFIN", name: "Shriram Finance" },
  { symbol: "TRENT", name: "Trent" },
  { symbol: "ADANIENT", name: "Adani Enterprises" },
  { symbol: "BAJAJ-AUTO", name: "Bajaj Auto" },
  { symbol: "BANKBARODA", name: "Bank of Baroda" },
  { symbol: "CANBK", name: "Canara Bank" },
  { symbol: "HDFC", name: "Housing Development Finance Corporation" },
  { symbol: "IDFCFIRSTB", name: "IDFC First Bank" },
  { symbol: "INDIGO", name: "InterGlobe Aviation" },
  { symbol: "PFC", name: "Power Finance Corporation" },
  { symbol: "PNB", name: "Punjab National Bank" },
  { symbol: "RECLTD", name: "Rural Electrification Corporation" },
  { symbol: "TATAPOWER", name: "Tata Power" },
  { symbol: "TORNTPHARMA", name: "Torrent Pharmaceuticals" },
  { symbol: "UNITDSPR", name: "United Spirits" },
  { symbol: "ZEEL", name: "Zee Entertainment Enterprises" },
  { symbol: "INDIANB", name: "Indian Bank" },
  { symbol: "FEDERALBNK", name: "Federal Bank" },
  { symbol: "AUBANK", name: "AU Small Finance Bank" },
  { symbol: "MUTHOOTFIN", name: "Muthoot Finance" },
  { symbol: "CHOLAFIN", name: "Cholamandalam Investment" },
  { symbol: "PEL", name: "Piramal Enterprises" },
  { symbol: "LUPIN", name: "Lupin" },
  { symbol: "AUROPHARMA", name: "Aurobindo Pharma" },
  { symbol: "BIOCON", name: "Biocon" },
  { symbol: "CADILAHC", name: "Zydus Lifesciences" },
  { symbol: "GLAND", name: "Gland Pharma" },
  { symbol: "TORNTPOWER", name: "Torrent Power" },
  { symbol: "NMDC", name: "NMDC" },
  { symbol: "SAIL", name: "Steel Authority of India" },
  { symbol: "JINDALSTEL", name: "Jindal Steel & Power" },
  { symbol: "HINDPETRO", name: "Hindustan Petroleum Corporation" },
  { symbol: "ADANIGREEN", name: "Adani Green Energy" },
  { symbol: "ADANITRANS", name: "Adani Transmission" },
  { symbol: "DMART", name: "Avenue Supermarts" },
  { symbol: "PERSISTENT", name: "Persistent Systems" },
  { symbol: "COFORGE", name: "Coforge" },
  { symbol: "LTTS", name: "L&T Technology Services" },
  { symbol: "KPITTECH", name: "KPIT Technologies" },
  { symbol: "POLYCAB", name: "Polycab India" },
  { symbol: "DIXON", name: "Dixon Technologies" },
  { symbol: "VARUNBEVER", name: "Varun Beverages" },
  { symbol: "GODREJCP", name: "Godrej Consumer Products" },
  { symbol: "MARICO", name: "Marico" },
  { symbol: "COLPAL", name: "Colgate-Palmolive (India)" },
  { symbol: "DABUR", name: "Dabur India" },
  { symbol: "BERGEPAINT", name: "Berger Paints India" },
  { symbol: "ASHOKLEY", name: "Ashok Leyland" },
  { symbol: "BOSCHLTD", name: "Bosch" },
  { symbol: "MOTHERSON", name: "Samvardhana Motherson International" },
  { symbol: "TVSMOTOR", name: "TVS Motor Company" },
  { symbol: "BAJAJHLDNG", name: "Bajaj Holdings & Investment" },
  { symbol: "GODREJPROP", name: "Godrej Properties" },
  { symbol: "OBEROIRLTY", name: "Oberoi Realty" },
  { symbol: "PHOENIXLTD", name: "Phoenix Mills" },
  { symbol: "IRB", name: "IRB Infrastructure Developers" },
  { symbol: "NHPC", name: "NHPC" },
  { symbol: "SIEMENS", name: "Siemens" },
  { symbol: "ABB", name: "ABB India" },
  { symbol: "SKFINDIA", name: "SKF India" },
  { symbol: "VOLTAS", name: "Voltas" },
  { symbol: "WHIRLPOOL", name: "Whirlpool of India" },
  { symbol: "CROMPTON", name: "Crompton Greaves Consumer Electricals" },
  { symbol: "BLUESTARCO", name: "Blue Star" },
  { symbol: "SRF", name: "SRF" },
  { symbol: "AARTIIND", name: "Aarti Industries" },
  { symbol: "DEEPAKNTR", name: "Deepak Nitrite" },
  { symbol: "GUJALKALI", name: "Gujarat Alkalies and Chemicals" },
  { symbol: "TATACHEM", name: "Tata Chemicals" },
  { symbol: "GNFC", name: "Gujarat Narmada Valley Fertilizers & Chemicals" },
  { symbol: "MFSL", name: "Max Financial Services" },
  { symbol: "ICICIPRULI", name: "ICICI Prudential Life Insurance" },
];

// Sorted by company name for predictable dropdown ordering.
STOCKS.sort((a, b) => a.name.localeCompare(b.name));

// Resolve free-text (a ticker, a company name, or a name with stray spaces)
// to a canonical NSE ticker. Falls back to the alnum-only form of the input
// so "JSW INFRA" -> "JSWINFRA" and "jswinfra" -> "JSWINFRA".
const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function resolveSymbol(input: string): string {
  const q = input.trim().toUpperCase();
  if (!q) return "";
  const bySym = STOCKS.find((s) => s.symbol.toUpperCase() === q);
  if (bySym) return bySym.symbol;
  const qn = norm(q);
  const byName = STOCKS.find((s) => norm(s.name) === qn);
  if (byName) return byName.symbol;
  return q.replace(/[^A-Z0-9]/g, "");
}
