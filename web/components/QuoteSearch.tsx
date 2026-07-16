"use client";

import { useState } from "react";
import type { Quote } from "@/lib/mcp";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded p-2">
      <div className="text-muted small">{label}</div>
      <div className="fw-semibold">{value}</div>
    </div>
  );
}

function QuoteCard({ q }: { q: Quote }) {
  const up = q.price >= q.previousClose;
  const change = q.price - q.previousClose;
  const pct = q.previousClose ? (change / q.previousClose) * 100 : 0;
  const rangePct =
    q.fiftyTwoWeekHigh > q.fiftyTwoWeekLow
      ? ((q.price - q.fiftyTwoWeekLow) / (q.fiftyTwoWeekHigh - q.fiftyTwoWeekLow)) * 100
      : 0;
  const fmt = (n: number | null, d = 2) =>
    n == null ? "—" : n.toLocaleString("en-IN", { maximumFractionDigits: d });

  return (
    <div>
      <div className="d-flex align-items-baseline gap-2">
        <h4 className="mb-0">{q.ticker}</h4>
        <span className="text-muted small">{q.exchange ?? ""}</span>
      </div>
      <div className="d-flex align-items-baseline gap-2 mt-1">
        <span className="fs-3 fw-bold">{fmt(q.price)}</span>
        <span className={up ? "gain-text" : "loss-text"}>
          <i className={`bi ${up ? "bi-arrow-up" : "bi-arrow-down"}`} /> {fmt(change)} (
          {pct >= 0 ? "+" : ""}
          {pct.toFixed(2)}%)
        </span>
      </div>
      <div className="text-muted small mb-2">
        52w range: {fmt(q.fiftyTwoWeekLow)} &ndash; {fmt(q.fiftyTwoWeekHigh)}
      </div>
      <div className="range-track">
        <div className="range-fill" style={{ left: "0%", right: `${100 - rangePct}%` }} />
        <div className="range-marker" style={{ left: `${rangePct}%` }} />
      </div>
      <div className="row row-cols-2 row-cols-md-3 g-2 mt-3">
        <Metric label="Prev Close" value={fmt(q.previousClose)} />
        <Metric label="Volume" value={fmt(q.volume, 0)} />
        <Metric label="Avg Volume" value={fmt(q.averageVolume, 0)} />
        <Metric label="Mkt Cap" value={fmt(q.marketCap, 0)} />
        <Metric label="P/E (TTM)" value={fmt(q.trailingPE)} />
        <Metric label="Div Yield" value={q.dividendYield == null ? "—" : `${q.dividendYield}%`} />
      </div>
    </div>
  );
}

export default function QuoteSearch() {
  const [symbol, setSymbol] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const s = symbol.trim().toUpperCase();
    if (!s) return;
    setLoading(true);
    setError(null);
    setQuote(null);
    try {
      const r = await fetch(`/api/quote?symbol=${encodeURIComponent(s)}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to fetch quote");
      setQuote(j as Quote);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card h-100">
      <div className="card-body">
        <div className="section-title">
          <i className="bi bi-search" /> Stock Quote
        </div>
        <form className="d-flex gap-2 mb-3" onSubmit={run}>
          <input
            className="form-control"
            placeholder="e.g. RELIANCE, TCS"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? (
              <span className="spinner-border spinner-border-sm" />
            ) : (
              "Get"
            )}
          </button>
        </form>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {quote && <QuoteCard q={quote} />}
      </div>
    </div>
  );
}
