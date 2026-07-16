import { useEffect, useMemo, useState } from "react";
import type { ScreenerScreen } from "@/lib/marketData";
import { SymCell } from "@/components/ScreenerTable";
import { fmt, fmtPct, clsx } from "@/lib/format";

const PAGE = 10;

type SortKey = "score" | "price" | "change" | "risk";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Score" },
  { key: "price", label: "Price" },
  { key: "change", label: "Chg%" },
  { key: "risk", label: "Risk" },
];
function riskRank(r: string): number {
  return r === "LOW" ? 0 : r === "MEDIUM" ? 1 : 2;
}

function scorePill(score: number): string {
  if (score >= 70) return "gain";
  if (score >= 50) return "accent";
  return "warn";
}

function riskDotClass(risk: string): string {
  if (risk === "LOW") return "low";
  if (risk === "HIGH") return "high";
  return "medium";
}

function titleCase(s: string): string {
  return s
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("-");
}

export default function ScreenerScreenCard({
  screen,
  icon,
  full = false,
  onDelete,
}: {
  screen: ScreenerScreen;
  icon: string;
  full?: boolean;
  onDelete?: () => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const arr = [...screen.results];
    arr.sort((a, b) => {
      switch (sortKey) {
        case "price":
          return b.price - a.price;
        case "change":
          return b.changePct - a.changePct;
        case "risk":
          return riskRank(a.risk) - riskRank(b.risk);
        default:
          return b.score - a.score;
      }
    });
    return arr;
  }, [screen.results, sortKey]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));

  // Reset to first page whenever the underlying screen or sort changes.
  useEffect(() => setPage(0), [screen.name, sortKey]);

  const start = page * PAGE;
  const pageRows = rows.slice(start, start + PAGE);

  return (
    <div
      className="panel screener-card"
      style={{ padding: 14, ...(full ? { gridColumn: "1 / -1" } : {}) }}
    >
      <div className="panel-title">
        <i className={`bi ${icon}`} /> {titleCase(screen.name)}
        <span className="sub">{rows.length}</span>
        {onDelete && (
          <button
            className="screen-del"
            onClick={onDelete}
            aria-label={`Delete ${titleCase(screen.name)} screen`}
            title="Delete this screen"
          >
            <i className="bi bi-x-lg" />
          </button>
        )}
      </div>

      <div className="screener-sort">
        <span className="screener-sort-lbl">Sort</span>
        {SORTS.map((s) => (
          <button
            key={s.key}
            className={clsx("mini-btn", sortKey === s.key && "active")}
            onClick={() => setSortKey(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="empty-note">No {screen.name} candidates right now.</div>
      ) : (
        <>
          <table className="table table-sm mono mb-0">
            <thead>
              <tr>
                <th>STOCK</th>
                <th className="text-end">PRICE</th>
                <th className="text-end">CHG%</th>
                <th className="text-end">SCORE</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.symbol}>
                  <td>
                    <div className="sym-cell">
                      <div className="sym-line">
                        <span
                          className={clsx("risk-dot", riskDotClass(r.risk))}
                          title={`Risk: ${r.risk}`}
                        />
                        <SymCell
                          className="sym-code"
                          symbol={r.symbol.replace(/\.(NS|BO)$/, "")}
                          href={`/stock/${r.symbol.replace(/\.(NS|BO)$/, "")}/technical`}
                        />
                      </div>
                      {r.name && r.name !== r.symbol.replace(/\.(NS|BO)$/, "") && (
                        <span className="sym-name" title={r.name}>
                          {r.name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-end">₹{fmt(r.price)}</td>
                  <td
                    className={clsx(
                      "text-end",
                      r.changePct >= 0 ? "gain-text" : "loss-text",
                    )}
                  >
                    {fmtPct(r.changePct)}
                  </td>
                  <td className="text-end">
                    <span className="tip">
                      <span className={clsx("pill", scorePill(r.score))}>{r.score}</span>
                      <span className="tip-body">
                        <div className="tip-h">Why scored {r.score}</div>
                        <div>{r.reason}</div>
                        <div className="tip-k">
                          RSI {fmt(r.indicators.rsi)} · ADX {fmt(r.indicators.adx)} ·
                          EMA20 {fmt(r.indicators.ema20)} · EMA50 {fmt(r.indicators.ema50)} ·
                          EMA200 {fmt(r.indicators.ema200)} · ATR {fmt(r.indicators.atr)} ·
                          Vol {fmt(r.indicators.volRatio)}x
                        </div>
                        {r.pattern && r.pattern !== "—" && (
                          <div className="tip-k">Pattern: {r.pattern}</div>
                        )}
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {rows.length > PAGE && (
            <div className="screener-foot">
              <button
                className="pg-btn"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                aria-label="Previous page"
              >
                <i className="bi bi-chevron-left" />
              </button>
              <span className="pg-info">
                Page {page + 1} / {pages} · {rows.length} stocks
              </span>
              <button
                className="pg-btn"
                disabled={page >= pages - 1}
                onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                aria-label="Next page"
              >
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
