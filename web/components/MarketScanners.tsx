"use client";

import { useState } from "react";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import Link from "next/link";
import type { NseStock } from "@/lib/mcp";
import { fmt, fmtPct, clsx } from "@/lib/format";

interface ScanRow {
  symbol: string;
  name: string | null;
  lastPrice: number;
  pChange: number;
  yearHigh?: number;
  yearLow?: number;
  pctFromHigh?: number;
  pctFromLow?: number;
}

interface ScannerData {
  gainers: ScanRow[];
  losers: ScanRow[];
  onlyBuyers: ScanRow[];
  onlySellers: ScanRow[];
  fiftyTwoWeekHighs: ScanRow[];
  fiftyTwoWeekLows: ScanRow[];
}

type ScanKey = "gainers" | "losers" | "onlyBuyers" | "onlySellers" | "fiftyTwoWeekHighs" | "fiftyTwoWeekLows";

const CARDS: {
  key: ScanKey;
  title: string;
  icon: string;
  accent: "gain" | "loss" | "accent" | "info";
  metric: (r: ScanRow) => { value: number; label: string; cls: string };
}[] = [
  {
    key: "gainers",
    title: "Top Gainers",
    icon: "bi-trending-up",
    accent: "gain",
    metric: (r) => ({ value: r.pChange, label: fmtPct(r.pChange), cls: r.pChange >= 0 ? "gain" : "loss" }),
  },
  {
    key: "losers",
    title: "Top Losers",
    icon: "bi-trending-down",
    accent: "loss",
    metric: (r) => ({ value: r.pChange, label: fmtPct(r.pChange), cls: r.pChange >= 0 ? "gain" : "loss" }),
  },
  {
    key: "onlyBuyers",
    title: "Only Buyers",
    icon: "bi-cart-plus",
    accent: "accent",
    metric: (r) => ({ value: r.pChange, label: fmtPct(r.pChange), cls: "gain" }),
  },
  {
    key: "onlySellers",
    title: "Only Sellers",
    icon: "bi-cart-dash",
    accent: "loss",
    metric: (r) => ({ value: r.pChange, label: fmtPct(r.pChange), cls: "loss" }),
  },
  {
    key: "fiftyTwoWeekHighs",
    title: "Near 52W High",
    icon: "bi-arrow-up-square",
    accent: "info",
    metric: (r) => ({
      value: r.pctFromHigh ?? 0,
      label: r.pctFromHigh != null ? fmtPct(r.pctFromHigh) : "—",
      cls: "info",
    }),
  },
  {
    key: "fiftyTwoWeekLows",
    title: "Near 52W Low",
    icon: "bi-arrow-down-square",
    accent: "info",
    metric: (r) => ({
      value: r.pctFromLow ?? 0,
      label: r.pctFromLow != null ? fmtPct(r.pctFromLow) : "—",
      cls: "info",
    }),
  },
];

function ScannerCard({
  title,
  icon,
  accent,
  rows,
  metric,
  sortMode,
}: {
  title: string;
  icon: string;
  accent: "gain" | "loss" | "accent" | "info";
  rows: ScanRow[];
  metric: (r: ScanRow) => { value: number; label: string; cls: string };
  sortMode: "pct" | "price";
}) {
  const sorted = [...rows]
    .sort((a, b) =>
      sortMode === "price" ? b.lastPrice - a.lastPrice : b.pChange - a.pChange,
    )
    .slice(0, 8);

  const maxAbs = Math.max(0.1, ...sorted.map((r) => Math.abs(metric(r).value)));

  if (sorted.length === 0) {
    return (
      <div className={clsx("scan-card", `accent-${accent}`)}>
        <div className="scan-card-head">
          <i className={`bi ${icon}`} />
          <span>{title}</span>
          <span className="scan-count">0</span>
        </div>
        <div className="empty-note">—</div>
      </div>
    );
  }

  return (
    <div className={clsx("scan-card", `accent-${accent}`)}>
      <div className="scan-card-head">
        <i className={`bi ${icon}`} />
        <span>{title}</span>
        <span className="scan-count">{rows.length}</span>
      </div>
      <div className="scan-list">
        {sorted.map((r) => {
          const m = metric(r);
          const w = (Math.abs(m.value) / maxAbs) * 100;
          return (
            <Link
              key={r.symbol}
              href={`/stock/${r.symbol}`}
              className="scan-row"
              title={r.name ?? r.symbol}
            >
              <div className="scan-id">
                <div className="scan-sym">{r.symbol}</div>
                {r.name && r.name !== r.symbol && (
                  <div className="scan-name">{r.name}</div>
                )}
              </div>
              <div className="scan-right">
                <div className="scan-price">₹{fmt(r.lastPrice)}</div>
                <div className={clsx("scan-chg", `chg-${m.cls}`)}>{m.label}</div>
              </div>
              <div className="scan-bar-track">
                <div
                  className={clsx("scan-bar-fill", `bar-${m.cls}`)}
                  style={{ width: `${w}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function MarketScanners() {
  const [data, setData] = useState<ScannerData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<"pct" | "price">("pct");

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
  }, []);

  if (loading) {
    return (
      <div className="text-center text-muted py-4">
        <span className="spinner-border spinner-border-sm me-2" /> Scanning…
      </div>
    );
  }
  if (err) return <div className="alert alert-danger">{err}</div>;
  if (!data) return null;

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="panel-title">
        <i className="bi bi-grid-3x3-gap" /> Market Scanners
        <span className="sub">live</span>
        <span className="screener-sort" style={{ marginLeft: "auto", marginTop: -2 }}>
          <span className="screener-sort-lbl">Sort</span>
          <button
            className={clsx("mini-btn", sortMode === "pct" && "active")}
            onClick={() => setSortMode("pct")}
          >
            %Chg
          </button>
          <button
            className={clsx("mini-btn", sortMode === "price" && "active")}
            onClick={() => setSortMode("price")}
          >
            Price
          </button>
        </span>
      </div>
      <div className="scanner-grid mt-2">
        {CARDS.map((c) => (
          <ScannerCard
            key={c.key}
            title={c.title}
            icon={c.icon}
            accent={c.accent}
            rows={data[c.key]}
            metric={c.metric}
            sortMode={sortMode}
          />
        ))}
      </div>
    </div>
  );
}
