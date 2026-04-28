export interface BulkDeal {
  date: string;
  symbol: string;
  name: string;
  clientName: string;
  dealType: "BUY" | "SELL";
  quantity: number;
  price: number;
  remarks?: string;
}

export interface BlockDeal {
  date: string;
  symbol: string;
  name: string;
  clientName: string;
  dealType: "BUY" | "SELL";
  quantity: number;
  price: number;
}

export interface InsiderTrade {
  symbol: string;
  company: string;
  acquirerName: string;
  personCategory: string;
  typeOfSecurity: string;
  sharesAcquired: number;
  sharesBefore: number;
  sharesAfter: number;
  percentBefore: number;
  percentAfter: number;
  modeOfAcquisition: string;
  acquireFromDate: string;
  acquireToDate: string;
  intimationDate: string;
}

export interface FiiDiiActivity {
  date: string;
  fiiBuyValue: number;
  fiiSellValue: number;
  fiiNetValue: number;
  diiBuyValue: number;
  diiSellValue: number;
  diiNetValue: number;
}

export interface NseIndex {
  key: string;
  name: string;
  lastPrice: number;
  variation: number;
  percentChange: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  yearHigh: number;
  yearLow: number;
  advances: number;
  declines: number;
  unchanged: number;
}

export interface NseStock {
  symbol: string;
  series: string;
  open: number;
  dayHigh: number;
  dayLow: number;
  lastPrice: number;
  previousClose: number;
  change: number;
  pChange: number;
  totalTradedVolume: number;
  totalTradedValue: number;
  yearHigh: number;
  yearLow: number;
  perChange365d: number;
}

export interface Quote {
  ticker: string;
  exchange: string | null;
  currency: string;
  timestamp: string;
  price: number;
  previousClose: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  volume: number;
  averageVolume: number | null;
  marketCap: number | null;
  beta: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  dividendYield: number | null;
  exDividendDate: string | null;
  earningsDate: string | null;
}

export interface NseAnnouncement {
  symbol: string;
  company: string;
  description: string;
  broadcastDateTime: string;
  pdfLink?: string;
}

export interface MarketStatusItem {
  market: string;
  marketStatus: string;
  tradeDate: string;
  index: string;
  last: number;
  variation: number;
  percentChange: number;
  marketStatusMessage: string;
}

export interface CorporateAction {
  symbol: string;
  company: string;
  series: string;
  faceValue: number;
  purpose: string;
  exDate: string;
  recordDate: string;
  bcStartDate: string;
  bcEndDate: string;
  paymentDate: string;
  remarks: string;
}

export interface ShortSellData {
  symbol: string;
  quantitySold: number;
  quantityInSecondLeg: number;
}
