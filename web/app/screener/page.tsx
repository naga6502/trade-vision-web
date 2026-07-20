"use client";

import { useState } from "react";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import type { ScreenerScreen } from "@/lib/marketData";
import ScreenerSheet from "@/components/ScreenerSheet";
import { SymCell } from "@/components/ScreenerTable";
import { fmtPct, clsx } from "@/lib/format";
import { downloadCsv } from "@/lib/exportCsv";
import { fetchJson } from "@/lib/fetchJson";

interface PortfolioPick {
  symbol: string;
  name: string | null;
  tag: string;
  note: string;
}
interface Portfolio {
  picks: PortfolioPick[];
  disclaimer: string;
}
interface ScreenerData {
  screens: ScreenerScreen[];
  portfolio: Portfolio;
  universeSize: number;
  generatedAt: string;
}

// Distinct icon per screen style.
const SCREEN_ICONS: Record<string, string> = {
  momentum: "bi-lightning-charge",
  breakout: "bi-graph-up-arrow",
  intraday: "bi-speedometer2",
  swing: "bi-arrow-left-right",
  "mean-reversion": "bi-arrow-counterclockwise",
  volatility: "bi-activity",
  "sector-rotation": "bi-pie-chart",
  accumulation: "bi-inboxes",
};

function titleCase(s: string): string {
  return s.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("-");
}

const tagPill = (tag: string) =>
  tag === "Value" ? "gain" : tag === "Momentum" || tag === "Breakout" ? "accent" : "warn";

export default function ScreenersPage() {
  const [data, setData] = useState<ScreenerData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string>("");
  const [deleted, setDeleted] = useState<Set<string>>(new Set());

  useAutoRefresh(() => {
    (async () => {
      try {
        const r = await fetchJson<ScreenerData>("/api/screener");
        setData(r);
        setErr(null);
        setLoading(false);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
        setLoading(false);
      }
    })();
  }, [], 15_000);

  const screens = (data?.screens ?? []).filter((s) => !deleted.has(s.name));
  const totalCandidates = screens.reduce((a, s) => a + s.results.length, 0);
  // Each tab is one screen; the active tab falls back to the first screen
  // once data arrives (and to the next surviving screen after a delete).
  const activeScreen =
    screens.find((s) => s.name === active) ?? screens[0] ?? null;

  // Downloads one spreadsheet (CSV) per tab — each file holds that tab's
  // stocks, sorted by score. Browsers may prompt once to allow multiple
  // downloads from this site.
  const exportCsv = () => {
    if (screens.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 10);
    const clean = (sym: string) => sym.replace(/\.(NS|BO)$/, "");
    for (const s of screens) {
      if (s.results.length === 0) continue;
      const header = [
        "Symbol", "Name", "Price", "Chg%", "Score", "Risk", "Trend",
        "Momentum", "Volume", "Pattern", "RSI", "ADX", "EMA20", "EMA50",
        "EMA200", "ATR", "VolRatio", "Reason",
      ];
      const rows: (string | number | null)[][] = [header];
      for (const r of [...s.results].sort((a, b) => b.score - a.score)) {
        rows.push([
          clean(r.symbol),
          r.name ?? "",
          r.price,
          r.changePct,
          r.score,
          r.risk,
          r.trend,
          r.momentum,
          r.volume,
          r.pattern,
          r.indicators.rsi ?? null,
          r.indicators.adx ?? null,
          r.indicators.ema20 ?? null,
          r.indicators.ema50 ?? null,
          r.indicators.ema200 ?? null,
          r.indicators.atr ?? null,
          r.indicators.volRatio ?? null,
          r.reason,
        ]);
      }
      downloadCsv(`screener-${s.name}-${stamp}.csv`, rows);
    }
  };

  const tabs = screens.map((s) => ({
    key: s.name,
    label: titleCase(s.name),
    icon: SCREEN_ICONS[s.name] ?? "bi-funnel",
  }));

  return (
    <div>
      <div className="d-flex align-items-center mb-3">
        <h1 className="page-title mb-0">Market Screeners</h1>
        <span className="pill accent ms-3">Technical scans</span>
        {data && (
          <span className="pill ms-2">{totalCandidates} candidates · {data.universeSize} scanned</span>
        )}
        {data && !loading && (
          <button className="btn-export ms-2" onClick={exportCsv}>
            <i className="bi bi-download me-1" /> Export CSV
          </button>
        )}
        {deleted.size > 0 && (
          <button className="btn-restore ms-2" onClick={() => setDeleted(new Set())}>
            <i className="bi bi-arrow-counterclockwise me-1" /> Restore {deleted.size}
          </button>
        )}
      </div>
      <p className="muted-text" style={{ fontSize: "0.85rem", marginTop: -4 }}>
        Live technical screen engine — momentum, breakout, intraday, swing, mean-reversion,
        volatility, sector-rotation and accumulation reads computed from each stock&apos;s price,
        volume and indicator structure. Each score (0–100) carries a <em>why</em> + indicator
        breakdown — hover the score pill to see it.
      </p>

      {loading && (
        <div className="text-center text-muted py-5">
          <span className="spinner-border spinner-border-sm me-2" /> Scanning market…
        </div>
      )}
      {err && !loading && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2" />
          {err}
        </div>
      )}

      {data && !loading && (
        <>
          <div className="news-tabs mb-3">
            {tabs.map((t) => (
              <div
                key={t.key}
                className={clsx("news-tab", active === t.key && "active")}
                onClick={() => setActive(t.key)}
              >
                <i className={`bi ${t.icon} me-1`} /> {t.label}
              </div>
            ))}
          </div>

          {activeScreen ? (
            <ScreenerSheet
              key={activeScreen.name}
              results={activeScreen.results}
              onDelete={() => {
                setDeleted((d) => new Set(d).add(activeScreen.name));
                const next = screens.find(
                  (s) => s.name !== activeScreen.name,
                );
                setActive(next?.name ?? "");
              }}
            />
          ) : null}

          {screens.length === 0 && (
            <div className="empty-note mt-3">
              All screens deleted.{" "}
              <button className="link-btn" onClick={() => setDeleted(new Set())}>
                Restore all
              </button>
            </div>
          )}

          <div className="panel mt-4" style={{ padding: 16 }}>
            <div className="panel-title">
              <i className="bi bi-briefcase" /> Build Good Portfolio
              <span className="sub">model book</span>
            </div>
            {data.portfolio.picks.length === 0 ? (
              <div className="empty-note">No qualifying picks right now — market conditions thin.</div>
            ) : (
              <div className="scanner-grid mt-2">
                {data.portfolio.picks.map((p) => (
                  <div key={p.symbol} className="scanner-col">
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="sym-cell">
                        <SymCell className="sym-code" symbol={p.symbol} />
                        {p.name && p.name !== p.symbol && (
                          <span className="sym-name" title={p.name}>
                            {p.name}
                          </span>
                        )}
                      </div>
                      <span className={clsx("pill", tagPill(p.tag))}>{p.tag}</span>
                    </div>
                    <div className="muted-text mt-1" style={{ fontSize: "0.78rem" }}>
                      {p.note}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="alert alert-warning mt-3 mb-0" style={{ fontSize: "0.78rem" }}>
              <i className="bi bi-info-circle me-1" />
              {data.portfolio.disclaimer}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
