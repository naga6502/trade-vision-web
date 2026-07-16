import { useState } from "react";
import type { NiftyMoversResult } from "@/lib/mcp";
import { fmt, fmtPct, dir, clsx } from "@/lib/format";

function Column({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: NiftyMoversResult["gainers"];
  tone: "gain" | "loss";
}) {
  const maxW = Math.max(0.1, ...rows.map((r) => r.weight));
  return (
    <div>
      <div className="muted-text mb-2" style={{ fontSize: "0.74rem", fontWeight: 600 }}>
        {title}
      </div>
      {rows.length === 0 ? (
        <div className="empty-note">—</div>
      ) : (
        rows.map((r) => {
          const d = tone === "gain" ? "gain" : "loss";
          return (
            <div key={r.symbol} className="nifty-row">
              <div className="d-flex justify-content-between align-items-baseline">
                <span className="fw-semibold" style={{ fontSize: "0.85rem" }}>
                  {r.symbol}
                </span>
                <span className={clsx("mono", d === "gain" ? "gain-text" : "loss-text")} style={{ fontSize: "0.82rem" }}>
                  {fmtPct(r.pChange)}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center muted-text" style={{ fontSize: "0.72rem" }}>
                <span className="mono">₹{fmt(r.lastPrice)}</span>
                <span className="mono wt-label">{r.weight.toFixed(2)}% wt</span>
              </div>
              <div className="wt-track">
                <div
                  className={clsx("wt-fill", d === "gain" ? "wt-gain" : "wt-loss")}
                  style={{ width: `${(r.weight / maxW) * 100}%` }}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function NiftyMovers({ data }: { data: NiftyMoversResult }) {
  const [sortMode, setSortMode] = useState<"pct" | "weight">("pct");

  const sortCol = (rows: NiftyMoversResult["gainers"]) =>
    [...rows].sort((a, b) =>
      sortMode === "weight" ? b.weight - a.weight : b.pChange - a.pChange,
    );

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="panel-title">
        <i className="bi bi-bar-chart-line" /> NIFTY 50 Movers
        <span className="sub">
          {data.fallbackWeights ? "approx weights" : "live weights"}
        </span>
        <span className="screener-sort" style={{ marginLeft: "auto", marginTop: -2 }}>
          <span className="screener-sort-lbl">Sort</span>
          <button
            className={clsx("mini-btn", sortMode === "pct" && "active")}
            onClick={() => setSortMode("pct")}
          >
            %Chg
          </button>
          <button
            className={clsx("mini-btn", sortMode === "weight" && "active")}
            onClick={() => setSortMode("weight")}
          >
            Weight
          </button>
        </span>
      </div>
      <div className="grid-2">
        <Column title="TOP GAINERS" rows={sortCol(data.gainers)} tone="gain" />
        <Column title="TOP LOSERS" rows={sortCol(data.losers)} tone="loss" />
      </div>
    </div>
  );
}
