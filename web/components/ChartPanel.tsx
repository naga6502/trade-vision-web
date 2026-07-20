"use client";

import { memo } from "react";
import TradingViewChart from "@/components/TradingViewChart";

// Thin wrapper kept for the existing import in the Technical page. The real
// TradingView-style chart (candles + volume + indicator overlays) lives in
// TradingViewChart, which fetches its own price history and manages state.
function ChartPanel({ symbol, height = 440 }: { symbol: string; height?: number }) {
  return <TradingViewChart symbol={symbol} height={height} />;
}

export default memo(ChartPanel);
