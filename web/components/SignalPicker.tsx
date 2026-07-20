"use client";

import { useState } from "react";
import { useWatchlist, toggleSignal, type WatchlistEntry } from "@/lib/watchlist";
import { fetchJson } from "@/lib/fetchJson";

interface Scanned {
  symbol: string;
  name: string;
  label: string;
  price?: number;
  triggerPrice?: number;
  triggerDate?: string;
  plan?: {
    buyZone?: { low: number; high: number; strength: number };
    sellZone?: { low: number; high: number; strength: number };
    longStop?: number;
    longTarget?: number;
    shortStop?: number;
    shortTarget?: number;
  };
}

const BUY = "#16c784";
const SELL = "#ea3943";

export default function SignalPicker({
  onPick,
}: {
  onPick: (symbol: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<{ BUY: Scanned[]; SELL: Scanned[]; NEUTRAL: Scanned[] } | null>(null);
  const [scanned, setScanned] = useState(0);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const list = useWatchlist();

  const toggle = (s: Scanned) => {
    const entry: WatchlistEntry = {
      symbol: s.symbol,
      name: s.name,
      label: s.label,
      price: s.price ?? NaN,
      triggerPrice: s.triggerPrice,
      triggerDate: s.triggerDate,
      plan: s.plan,
      savedAt: new Date().toISOString(),
    };
    toggleSignal(entry);
  };

  const scan = () => {
    setLoading(true);
    setErr(null);
    setGroups(null);
    fetchJson<any>("/signals.json")
      .then((j) => {
        if (j.error) {
          setErr(j.error);
          return;
        }
        setGroups(j.groups);
        setScanned(j.scanned ?? 0);
        setTotal(j.total ?? j.scanned ?? 0);
        setFailed(j.failed ?? []);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  };

  const Chip = ({
    s,
    color,
    saved,
    onToggle,
  }: {
    s: Scanned;
    color: string;
    saved: boolean;
    onToggle: () => void;
  }) => {
    const trigger =
      typeof s.triggerPrice === "number" && !Number.isNaN(s.triggerPrice)
        ? `₹${s.triggerPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
        : typeof s.price === "number" && !Number.isNaN(s.price)
        ? `₹${s.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
        : "";
    const date = s.triggerDate ?? "";
    const r = (x?: number) =>
      typeof x === "number" && !Number.isNaN(x)
        ? `₹${x.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
        : "—";
    const p = s.plan;
    const tip = p
      ? [
          s.name,
          p.buyZone
            ? `Buy ${r(p.buyZone.low)}–${r(p.buyZone.high)} (${p.buyZone.strength} tools)`
            : null,
          p.sellZone
            ? `Sell ${r(p.sellZone.low)}–${r(p.sellZone.high)} (${p.sellZone.strength} tools)`
            : null,
          p.longStop ? `Long stop ${r(p.longStop)} · target ${r(p.longTarget)}` : null,
          p.shortStop ? `Short stop ${r(p.shortStop)} · target ${r(p.shortTarget)}` : null,
        ]
          .filter(Boolean)
          .join("\n")
      : s.name;
    return (
      <span className="position-relative d-inline-block me-1 mb-1">
        <button
          className="btn btn-sm"
          style={{
            border: `1px solid ${color}`,
            color,
            background: "transparent",
            fontSize: "0.72rem",
          }}
          onClick={() => onPick(s.symbol)}
          title={tip}
        >
          {s.symbol}
          {trigger && (
            <span className="muted-text ms-1" style={{ color }}>
              {trigger}
              {date && <span className="ms-1" style={{ opacity: 0.7 }}>{date}</span>}
            </span>
          )}
        </button>
        <button
          type="button"
          className="btn btn-sm p-0"
          style={{
            position: "absolute",
            top: -7,
            right: -7,
            lineHeight: 1,
            color: saved ? "#f0b429" : "#8a90a2",
            background: "var(--panel-bg, #fff)",
            borderRadius: "50%",
            border: "1px solid var(--border)",
          }}
          title={saved ? "Remove from watchlist" : "Add to watchlist"}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          <i className={saved ? "bi bi-star-fill" : "bi bi-star"} />
        </button>
      </span>
    );
  };

  return (
    <div className="panel mb-3" style={{ padding: 14 }}>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
        <div className="panel-title mb-0">
          <i className="bi bi-lightning-charge" /> Signal Scanner
          <span className="muted-text ms-2" style={{ fontSize: "0.7rem", fontWeight: 400 }}>
            technical verdict across the stock list
          </span>
        </div>
        <button className="btn btn-sm btn-accent" onClick={scan} disabled={loading}>
          {loading ? (
            <span className="spinner-border spinner-border-sm" />
          ) : groups ? (
            "Re-scan"
          ) : (
            "Scan for BUY / SELL"
          )}
        </button>
      </div>

      {err && <div className="alert alert-warning py-2 small mb-0">{err}</div>}

      {!loading && !err && !groups && (
        <div className="muted-text small">
          Click <strong>Scan for BUY / SELL</strong> to find stocks with an active
          technical signal, then pick one to load its full analysis &amp; backtest.
        </div>
      )}

      {groups && (
        <div>
          <div className="mb-1">
            <span className="small fw-semibold" style={{ color: BUY }}>
              BUY ({groups.BUY.length})
            </span>
            <div className="mt-1">
              {groups.BUY.length
                ? groups.BUY.map((s) => (
                    <Chip
                      key={s.symbol}
                      s={s}
                      color={BUY}
                      saved={list.some((e) => e.symbol === s.symbol)}
                      onToggle={() => toggle(s)}
                    />
                  ))
                : <span className="muted-text small">none right now</span>}
            </div>
          </div>
          <div>
            <span className="small fw-semibold" style={{ color: SELL }}>
              SELL ({groups.SELL.length})
            </span>
            <div className="mt-1">
              {groups.SELL.length
                ? groups.SELL.map((s) => (
                    <Chip
                      key={s.symbol}
                      s={s}
                      color={SELL}
                      saved={list.some((e) => e.symbol === s.symbol)}
                      onToggle={() => toggle(s)}
                    />
                  ))
                : <span className="muted-text small">none right now</span>}
            </div>
          </div>
          <div className="muted-text mt-2" style={{ fontSize: "0.66rem" }}>
            Scanned {scanned}
            {total && total !== scanned ? ` / ${total}` : ""} symbols · technical
            only, not investment advice.
            {failed.length > 0 && ` (${failed.length} failed)`}
          </div>
        </div>
      )}
    </div>
  );
}
