"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { Fundamentals, Technical } from "@/lib/mcp";
import { setLastUpdated } from "@/lib/updatedStore";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import ChartPanel from "@/components/ChartPanel";
import TechnicalHero from "@/components/TechnicalHero";
import TechnicalAnalysis from "@/components/TechnicalAnalysis";
import VolatilityPanel from "@/components/VolatilityPanel";
import PatternRecognition from "@/components/PatternRecognition";
import ConsensusPanel from "@/components/ConsensusPanel";
import SentimentPanel from "@/components/SentimentPanel";
import AiPredictionPanel from "@/components/AiPredictionPanel";
import PretradeRiskPanel from "@/components/PretradeRiskPanel";
import WatchlistPanel from "@/components/WatchlistPanel";
import PivotLevels from "@/components/PivotLevels";
import { fetchJson } from "@/lib/fetchJson";

export default function TechnicalPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = String(params.symbol ?? "RELIANCE").toUpperCase();

  const [f, setF] = useState<Fundamentals | null>(null);
  const [tech, setTech] = useState<Technical | null>(null);
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState<Date | null>(null);

  useAutoRefresh(
    () => {
      (async () => {
        try {
          const [fr, tr] = await Promise.all([
            fetchJson<Fundamentals & { error?: string }>(`/api/fundamentals?symbol=${encodeURIComponent(symbol)}`),
            fetchJson<Technical & { error?: string }>(`/api/technical?symbol=${encodeURIComponent(symbol)}`),
          ]);
          setF(fr.error ? null : fr);
          setTech(tr.error ? null : tr);
          setLoading(false);
          setUpdated(new Date());
          setLastUpdated(new Date());
        } catch {
          setLoading(false);
        }
      })();
    },
    [symbol],
    10_000,
  );

  const chartSymbol = symbol;

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <span className="pill accent">Technical Analysis</span>
        {updated && (
          <span className="pill" title="Live price refreshes every 10s">
            <i className="bi bi-arrow-repeat me-1" />
            {updated.toLocaleTimeString("en-IN")}
          </span>
        )}
        <Link href={`/stock/${symbol}`} className="btn btn-sm btn-terminal ms-auto">
          <i className="bi bi-speedometer2 me-1" /> Market Intel
        </Link>
      </div>

      <WatchlistPanel onPick={(s) => router.push(`/stock/${s}/technical`)} />

      {loading && (
        <div className="text-center text-muted py-5">
          <span className="spinner-border spinner-border-sm me-2" /> Loading…
        </div>
      )}

      {!loading && (
        <>
          <TechnicalHero f={f} tech={tech} />

          <div className="panel mb-3" style={{ padding: 16 }}>
            <ChartPanel key={chartSymbol} symbol={chartSymbol} height={420} />
          </div>

          <div className="panel mb-3" style={{ padding: 16 }}>
            <div className="panel-title">
              <i className="bi bi-graph-up" /> Technical Summary · Oscillators · Moving Averages
            </div>
            <TechnicalAnalysis key={chartSymbol} symbol={chartSymbol} data={tech} />
          </div>

          <div className="panel mb-3" style={{ padding: 16 }}>
            <div className="panel-title">
              <i className="bi bi-diagram-3" /> Pivot Levels · Support / Resistance
            </div>
            <PivotLevels symbol={chartSymbol} livePrice={f?.price ?? null} />
          </div>

          {f && (
            <div className="grid-2 mb-3">
              <ConsensusPanel f={f} />
              <SentimentPanel f={f} />
            </div>
          )}

          <div className="grid-2">
            <VolatilityPanel symbol={chartSymbol} />
            <PatternRecognition symbol={chartSymbol} />
          </div>

          <div className="grid-2">
            <AiPredictionPanel symbol={symbol} />
            <PretradeRiskPanel symbol={symbol} />
          </div>
        </>
      )}
    </div>
  );
}
