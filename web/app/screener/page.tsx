"use client";

import { useState } from "react";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import type { ScreenerScreen } from "@/lib/marketData";
import ScreenerScreenCard from "@/components/ScreenerScreenCard";
import { SymCell } from "@/components/ScreenerTable";
import { fmtPct, clsx } from "@/lib/format";

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
  const [active, setActive] = useState<string>("all");
  const [deleted, setDeleted] = useState<Set<string>>(new Set());

  useAutoRefresh(() => {
    (async () => {
      try {
        const r = await fetch("/api/screener").then((x) => x.json());
        if (r.error) throw new Error(r.error);
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
  const visible = active === "all" ? screens : screens.filter((s) => s.name === active);

  const tabs = [
    { key: "all", label: "All", icon: "bi-grid-3x3-gap" },
    ...screens.map((s) => ({
      key: s.name,
      label: titleCase(s.name),
      icon: SCREEN_ICONS[s.name] ?? "bi-funnel",
    })),
  ];

  return (
    <div>
      <div className="d-flex align-items-center mb-3">
        <h1 className="page-title mb-0">Market Screeners</h1>
        <span className="pill accent ms-3">Technical scans</span>
        {data && (
          <span className="pill ms-2">{totalCandidates} candidates · {data.universeSize} scanned</span>
        )}
        {data && !loading && (
          <button className="btn-del-all ms-2" onClick={() => { setActive("all"); setDeleted(new Set(screens.map((s) => s.name))); }}>
            <i className="bi bi-trash3 me-1" /> Delete ALL
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

          {active === "all" ? (
            <div className="screener-grid">
              {visible.map((s) => (
                <ScreenerScreenCard
                  key={s.name}
                  screen={s}
                  icon={SCREEN_ICONS[s.name] ?? "bi-funnel"}
                  onDelete={() => { if (active === s.name) setActive("all"); setDeleted((d) => new Set(d).add(s.name)); }}
                />
              ))}
            </div>
          ) : (
            visible.map((s) => (
              <ScreenerScreenCard
                key={s.name}
                screen={s}
                icon={SCREEN_ICONS[s.name] ?? "bi-funnel"}
                full
                onDelete={() => setDeleted((d) => new Set(d).add(s.name))}
              />
            ))
          )}

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
