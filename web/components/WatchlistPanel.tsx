"use client";

import { useState } from "react";
import { useWatchlist, toggleSignal, clearWatchlist, type WatchlistEntry } from "@/lib/watchlist";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { fetchJson } from "@/lib/fetchJson";

const BUY = "#16c784";
const SELL = "#ea3943";

const r = (x?: number) =>
  typeof x === "number" && !Number.isNaN(x)
    ? `₹${x.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
    : "—";

function labelColor(label: string): string {
  if (label.includes("SELL")) return SELL;
  if (label.includes("BUY")) return BUY;
  return "#5a6072";
}

type Verdict = { label: string; error?: boolean };

function dirOf(label: string): "bull" | "bear" | "neut" {
  const l = label.toUpperCase();
  if (l.includes("BUY")) return "bull";
  if (l.includes("SELL")) return "bear";
  return "neut";
}

async function fetchVerdict(symbol: string): Promise<Verdict> {
  try {
    const j = await fetchJson<any & { error?: string }>(
      `/api/technical?symbol=${encodeURIComponent(symbol)}`,
    );
    if (j?.error) return { label: "", error: true };
    const label = j?.summary?.label;
    return label ? { label } : { label: "", error: true };
  } catch {
    return { label: "", error: true };
  }
}

function Row({
  e,
  onPick,
  verdict,
  scanning,
}: {
  e: WatchlistEntry;
  onPick?: (symbol: string) => void;
  verdict?: Verdict;
  scanning: boolean;
}) {
  const color = labelColor(e.label);
  const p = e.plan;
  const tip = p
    ? [
        p.buyZone ? `Buy ${r(p.buyZone.low)}–${r(p.buyZone.high)} (${p.buyZone.strength} tools)` : null,
        p.sellZone ? `Sell ${r(p.sellZone.low)}–${r(p.sellZone.high)} (${p.sellZone.strength} tools)` : null,
        p.longStop ? `Long stop ${r(p.longStop)} · target ${r(p.longTarget)}` : null,
        p.shortStop ? `Short stop ${r(p.shortStop)} · target ${r(p.shortTarget)}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : e.name;

  const live = verdict?.label;
  const changed = !verdict?.error && !!live && live !== e.label;
  const flipped = changed && dirOf(live!) !== dirOf(e.label);

  return (
    <div
      className="d-flex align-items-center gap-2 flex-wrap"
      style={{
        borderBottom: "1px solid var(--border)",
        paddingBottom: 8,
        ...(flipped ? { boxShadow: "inset 3px 0 0 #ea3943", paddingLeft: 6 } : {}),
      }}
    >
      <button
        className="btn btn-sm p-0"
        style={{ color: "#f0b429" }}
        title="Remove from watchlist"
        onClick={() => toggleSignal(e)}
      >
        <i className="bi bi-star-fill" />
      </button>
      <button
        className="btn btn-link p-0 text-start"
        style={{ textDecoration: "none" }}
        disabled={!onPick}
        onClick={() => onPick?.(e.symbol)}
        title={onPick ? "Open" : undefined}
      >
        <span className="fw-bold" style={{ color: "var(--ink)" }}>
          {e.symbol}
        </span>
        <span className="muted-text ms-1" style={{ fontSize: "0.7rem" }}>
          {e.name}
        </span>
      </button>
      <span className="badge" style={{ background: color, color: "#fff", fontSize: "0.66rem" }}>
        {e.label}
      </span>

      {/* live re-scan verdict vs the saved snapshot */}
      <span className="ms-auto d-flex align-items-center gap-1" style={{ fontSize: "0.7rem" }}>
        {verdict === undefined ? (
          scanning ? (
            <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} />
          ) : null
        ) : verdict.error ? (
          <span className="muted-text" title="Live verdict unavailable">
            —
          </span>
        ) : changed ? (
          <span
            title={`Saved ${e.label} → now ${live}`}
            style={{
              color: flipped ? SELL : "var(--ink)",
              fontWeight: flipped ? 700 : 400,
            }}
          >
            {flipped && <i className="bi bi-exclamation-triangle-fill me-1" />}
            now {live}
          </span>
        ) : (
          <span className="muted-text" title="Verdict unchanged">
            <i className="bi bi-check2" />
          </span>
        )}
      </span>

      <span className="muted-text" style={{ fontSize: "0.7rem", width: "100%" }} title={tip}>
        {r(e.triggerPrice) || r(e.price)}
        {e.triggerDate && <span className="ms-1" style={{ opacity: 0.7 }}>{e.triggerDate}</span>}
      </span>
    </div>
  );
}

export default function WatchlistPanel({
  onPick,
}: {
  onPick?: (symbol: string) => void;
}) {
  const list = useWatchlist();
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [scanning, setScanning] = useState(false);

  // Re-scan every saved symbol against the live technical verdict. Runs once on
  // mount (and whenever the saved list changes), then every 60s. The server
  // caches each /api/technical result for 60s, so repeats are cheap.
  const scan = async () => {
    if (list.length === 0) return;
    setScanning(true);
    for (const e of list) {
      const v = await fetchVerdict(e.symbol);
      setVerdicts((prev) => ({ ...prev, [e.symbol]: v }));
    }
    setScanning(false);
  };
  useAutoRefresh(scan, [list], 60_000);

  return (
    <div className="panel mb-3" style={{ padding: 14 }}>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
        <div className="panel-title mb-0">
          <i className="bi bi-star" /> My Watchlist
          <span className="muted-text ms-2" style={{ fontSize: "0.7rem", fontWeight: 400 }}>
            {list.length} saved signal{list.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={scan}
            disabled={scanning || list.length === 0}
            title="Re-check saved signals against the live verdict"
          >
            {scanning ? (
              <span className="spinner-border spinner-border-sm" />
            ) : (
              <>
                <i className="bi bi-arrow-repeat me-1" /> Re-scan
              </>
            )}
          </button>
          {list.length > 0 && (
            <button className="btn btn-sm btn-outline-secondary" onClick={clearWatchlist}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="muted-text small">
          No saved signals yet. Star a BUY/SELL signal from the scanner or a stock&apos;s
          Technical page to track it here.
        </div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {list.map((e) => (
            <Row
              key={e.symbol}
              e={e}
              onPick={onPick}
              verdict={verdicts[e.symbol]}
              scanning={scanning}
            />
          ))}
        </div>
      )}
    </div>
  );
}
