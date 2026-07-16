"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import MarketDashboard from "@/components/MarketDashboard";
import { setSelectedSymbol } from "@/lib/selectedStore";

export default function MarketIntelPage() {
  const params = useParams();
  const symbol = String(params.symbol ?? "").toUpperCase().replace(/\.NS$/, "");

  useEffect(() => {
    setSelectedSymbol(symbol || null);
  }, [symbol]);

  return <MarketDashboard />;
}
