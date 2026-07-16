"use client";

import { useState } from "react";
import type {
  AnalyzeStock,
  ResearchReport,
  StockImagesResult,
  IpoWithSignal,
} from "@/lib/mcp";
import { STOCKS, resolveSymbol } from "@/lib/stocks";
import AnalyzeStockPanel from "@/components/AnalyzeStockPanel";
import ResearchReportPanel from "@/components/ResearchReportPanel";
import StockImagesPanel from "@/components/StockImagesPanel";
import IpoPanel from "@/components/IpoPanel";

export default function AnalyticsPage() {
  const [query, setQuery] = useState("");
  const [symbol, setSymbol] = useState("");
  const [analyze, setAnalyze] = useState<AnalyzeStock | null>(null);
  const [research, setResearch] = useState<ResearchReport | null>(null);
  const [images, setImages] = useState<StockImagesResult | null>(null);
  const [ipo, setIpo] = useState<IpoWithSignal | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = (raw: string) => {
    const s = resolveSymbol(raw);
    if (!s) return;
    setSymbol(s);
    setQuery(s);
    setLoading(true);
    setErr(null);
    Promise.all([
      fetch(`/api/analyze?symbol=${encodeURIComponent(s)}`).then((r) => r.json()),
      fetch(`/api/research?symbol=${encodeURIComponent(s)}`).then((r) => r.json()),
      fetch(`/api/stock-images?symbol=${encodeURIComponent(s)}`).then((r) => r.json()),
      fetch(`/api/ipo/details?symbol=${encodeURIComponent(s)}`)
        .then((r) => r.json())
        .catch(() => ({ ipo: null })),
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
  };

  const onSearch = () => run(query);

  const hasData = analyze || research || images || ipo;

  return (
    <div>
      <div className="d-flex align-items-center mb-3 flex-wrap gap-2">
        <h1 className="page-title mb-0">Analytics &amp; Quant Lab</h1>
        <span className="pill accent ms-1">AI · Options · Monte Carlo</span>
      </div>

      <div className="panel mb-3" style={{ padding: 14 }}>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <input
            className="form-control"
            style={{ maxWidth: 320 }}
            list="analytics-stock-list"
            placeholder="Search stock by name or symbol (e.g. RELIANCE)"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            autoComplete="off"
          />
          <datalist id="analytics-stock-list">
            {STOCKS.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.name}
              </option>
            ))}
          </datalist>
          <button
            className="btn btn-sm btn-accent"
            onClick={onSearch}
            disabled={loading || !query.trim()}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm" />
            ) : (
              "Search Stock"
            )}
          </button>
          <span className="muted-text small">
            Aggregates AI prediction, IV radar, option pressure, Monte Carlo &amp;
            equity curves into one verdict.
          </span>
        </div>
      </div>

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
          <i className="bi bi-clipboard2-pulse fs-2 d-block mb-2" />
          Pick a stock from the list above and click <strong>Search Stock</strong> to
          load its analytics.
        </div>
      )}

      {!loading && !err && hasData && (
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
