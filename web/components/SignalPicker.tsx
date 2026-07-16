"use client";

import { useState } from "react";

interface Scanned {
  symbol: string;
  name: string;
  label: string;
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
  const [err, setErr] = useState<string | null>(null);

  const scan = () => {
    setLoading(true);
    setErr(null);
    setGroups(null);
    fetch("/signals.json")
      .then((r) => {
        if (!r.ok) throw new Error(`signals.json not available (${r.status})`);
        return r.json();
      })
      .then((j) => {
        if (j.error) {
          setErr(j.error);
          return;
        }
        setGroups(j.groups);
        setScanned(j.scanned ?? 0);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  };

  const Chip = ({ s, color }: { s: Scanned; color: string }) => (
    <button
      key={s.symbol}
      className="btn btn-sm me-1 mb-1"
      style={{
        border: `1px solid ${color}`,
        color,
        background: "transparent",
        fontSize: "0.72rem",
      }}
      onClick={() => onPick(s.symbol)}
      title={s.name}
    >
      {s.symbol}
    </button>
  );

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
                ? groups.BUY.map((s) => <Chip key={s.symbol} s={s} color={BUY} />)
                : <span className="muted-text small">none right now</span>}
            </div>
          </div>
          <div>
            <span className="small fw-semibold" style={{ color: SELL }}>
              SELL ({groups.SELL.length})
            </span>
            <div className="mt-1">
              {groups.SELL.length
                ? groups.SELL.map((s) => <Chip key={s.symbol} s={s} color={SELL} />)
                : <span className="muted-text small">none right now</span>}
            </div>
          </div>
          <div className="muted-text mt-2" style={{ fontSize: "0.66rem" }}>
            Scanned {scanned} symbols · technical only, not investment advice.
          </div>
        </div>
      )}
    </div>
  );
}
