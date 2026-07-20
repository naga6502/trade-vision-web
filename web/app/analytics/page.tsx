"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type {
  AnalyzeStock,
  ResearchReport,
  StockImagesResult,
  IpoWithSignal,
} from "@/lib/mcp";
import { resolveSymbol } from "@/lib/stocks";
import {
  getSelectedSymbol,
  setSelectedSymbol,
  subscribeSelected,
} from "@/lib/selectedStore";
import AnalyzeStockPanel from "@/components/AnalyzeStockPanel";
import ResearchReportPanel from "@/components/ResearchReportPanel";
import StockImagesPanel from "@/components/StockImagesPanel";
import IpoPanel from "@/components/IpoPanel";
import SignalPicker from "@/components/SignalPicker";
import WatchlistPanel from "@/components/WatchlistPanel";
import { fetchJson } from "@/lib/fetchJson";

export default function AnalyticsPage() {
  // Driven by the top search bar / global selected-symbol store rather than a
  // local search box — searching any stock from the header loads it here.
  // useSyncExternalStore reads getSelectedSymbol, which hydrates from
  // localStorage. That value is unavailable during SSR, so the server and the
  // first client render must agree on an empty symbol; read the store only
  // after mount to avoid a hydration text mismatch.
  const storeSymbol = useSyncExternalStore(
    subscribeSelected,
    getSelectedSymbol,
    getSelectedSymbol,
  );
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const symbol = mounted ? storeSymbol : "";
  const [analyze, setAnalyze] = useState<AnalyzeStock | null>(null);
  const [research, setResearch] = useState<ResearchReport | null>(null);
  const [images, setImages] = useState<StockImagesResult | null>(null);
  const [ipo, setIpo] = useState<IpoWithSignal | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = (raw: string) => {
    const s = resolveSymbol(raw);
    if (!s) return;
    setSelectedSymbol(s);
  };

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setErr(null);
    Promise.all([
      fetchJson<any>(`/api/analyze?symbol=${encodeURIComponent(symbol)}`),
      fetchJson<any>(`/api/research?symbol=${encodeURIComponent(symbol)}`),
      fetchJson<any>(`/api/stock-images?symbol=${encodeURIComponent(symbol)}`),
      fetchJson<any>(`/api/ipo/details?symbol=${encodeURIComponent(symbol)}`).catch(
        () => ({ ipo: null }),
      ),
    ])
      .then(([a, r, i, ip]) => {
        setAnalyze(a.error ? null : a);
        setResearch(r.error ? null : r);
        setImages(i.error ? null : i);
        setIpo(ip?.ipo ?? null);
        if (a.error) setErr(a.error);
        setLoading(false);
      })
      .catch((e) => {
        setErr(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }, [symbol]);

  const hasData = analyze || research || images || ipo;

  return (
    <div>
      <div className="d-flex align-items-center mb-3 flex-wrap gap-2">
        <h1 className="page-title mb-0">Analytics &amp; Quant Lab</h1>
        <span className="pill accent ms-1">AI · Options · Monte Carlo</span>
      </div>

      <SignalPicker onPick={run} />

      <WatchlistPanel onPick={run} />

      {loading && (
        <div className="text-center text-muted py-5">
          <span className="spinner-border spinner-border-sm me-2" /> Running analysis…
        </div>
      )}

      {!loading && err && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2" />
          {err}
        </div>
      )}

      {!loading && !err && !hasData && (
        <div className="empty-note text-center py-5">
          <i className="bi bi-search fs-2 d-block mb-2" />
          {symbol ? (
            <>No analytics data available for {symbol}.</>
          ) : (
            <>
              Search a stock from the top bar (e.g. RELIANCE) to load its AI
              prediction, IV radar, option pressure, Monte Carlo &amp; equity
              curves.
            </>
          )}
        </div>
      )}

      {!loading && !err && symbol && hasData && (
        <div className="d-flex flex-column gap-3">
          <AnalyzeStockPanel symbol={symbol} data={analyze} />
          <IpoPanel data={ipo} />
          <div className="grid-2">
            <ResearchReportPanel symbol={symbol} data={research} />
            <StockImagesPanel symbol={symbol} data={images} />
          </div>
        </div>
      )}
    </div>
  );
}
