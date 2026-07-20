"use client";

import { useMemo, useState } from "react";
import { type Col, SymCell } from "@/components/ScreenerTable";
import { fmt, fmtPct, clsx } from "@/lib/format";
import type { ScreenerResult } from "@/lib/marketData";

interface SortState {
  col: number;
  dir: 1 | -1;
}

// Strip the exchange suffix so NSE/BSE codes read cleanly in the sheet.
const clean = (s: string) => s.replace(/\.(NS|BO)$/, "");

function riskRank(r: string): number {
  return r === "LOW" ? 0 : r === "MEDIUM" ? 1 : 2;
}
function scorePill(score: number): string {
  if (score >= 70) return "gain";
  if (score >= 50) return "accent";
  return "warn";
}
function trendClass(t: string): string {
  return t === "UP" ? "gain-text" : t === "DOWN" ? "loss-text" : "muted-text";
}

// Builds the column model. When `showScreen` is true a SCREEN column is
// prepended so the combined "All" sheet can tell candidates apart.
function buildCols(showScreen: boolean): Col[] {
  const cols: Col[] = [];

  if (showScreen) {
    cols.push({
      header: "SCREEN",
      sortValue: (r: ScreenerResult) => r.screenName,
      cell: (r: ScreenerResult) => (
        <span className="sheet-screen">{r.screenName.replace(/-/g, " ")}</span>
      ),
    });
  }

  cols.push(
    {
      header: "SYMBOL",
      sortValue: (r: ScreenerResult) => clean(r.symbol),
      cell: (r: ScreenerResult) => {
        const c = clean(r.symbol);
        return (
          <div className="sym-cell">
            <div className="sym-line">
              <SymCell className="sym-code" symbol={c} href={`/stock/${c}/technical`} />
            </div>
            {r.name && r.name !== c && (
              <span className="sym-name" title={r.name}>
                {r.name}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "NAME",
      sortValue: (r: ScreenerResult) => r.name ?? "",
      cell: (r: ScreenerResult) => (
        <span className="sheet-name" title={r.name ?? ""}>
          {r.name ?? "—"}
        </span>
      ),
    },
    {
      header: "PRICE",
      align: "end",
      sortValue: (r: ScreenerResult) => r.price,
      cell: (r: ScreenerResult) => `₹${fmt(r.price)}`,
    },
    {
      header: "CHG%",
      align: "end",
      sortValue: (r: ScreenerResult) => r.changePct,
      cell: (r: ScreenerResult) => (
        <span className={clsx(r.changePct >= 0 ? "gain-text" : "loss-text")}>
          {fmtPct(r.changePct)}
        </span>
      ),
    },
    {
      header: "SCORE",
      align: "end",
      sortValue: (r: ScreenerResult) => r.score,
      cell: (r: ScreenerResult) => (
        <span className={clsx("pill", scorePill(r.score))}>{r.score}</span>
      ),
    },
    {
      header: "RISK",
      sortValue: (r: ScreenerResult) => riskRank(r.risk),
      cell: (r: ScreenerResult) => (
        <span className="sheet-risk">
          <span className={clsx("risk-dot", r.risk.toLowerCase())} title={`Risk: ${r.risk}`} />
          {r.risk}
        </span>
      ),
    },
    {
      header: "TREND",
      sortValue: (r: ScreenerResult) => r.trend,
      cell: (r: ScreenerResult) => (
        <span className={trendClass(r.trend)}>{r.trend}</span>
      ),
    },
    {
      header: "MOMENTUM",
      sortValue: (r: ScreenerResult) => r.momentum,
      cell: (r: ScreenerResult) => <span className="sheet-tag">{r.momentum}</span>,
    },
    {
      header: "VOLUME",
      sortValue: (r: ScreenerResult) => r.volume,
      cell: (r: ScreenerResult) => <span className="sheet-tag">{r.volume}</span>,
    },
    {
      header: "PATTERN",
      sortValue: (r: ScreenerResult) => r.pattern,
      cell: (r: ScreenerResult) => (
        <span className="sheet-pattern" title={r.pattern}>
          {r.pattern}
        </span>
      ),
    },
    {
      header: "RSI",
      align: "end",
      sortValue: (r: ScreenerResult) => r.indicators.rsi ?? null,
      cell: (r: ScreenerResult) => fmt(r.indicators.rsi),
    },
    {
      header: "ADX",
      align: "end",
      sortValue: (r: ScreenerResult) => r.indicators.adx ?? null,
      cell: (r: ScreenerResult) => fmt(r.indicators.adx),
    },
    {
      header: "EMA20",
      align: "end",
      sortValue: (r: ScreenerResult) => r.indicators.ema20 ?? null,
      cell: (r: ScreenerResult) => fmt(r.indicators.ema20),
    },
    {
      header: "EMA50",
      align: "end",
      sortValue: (r: ScreenerResult) => r.indicators.ema50 ?? null,
      cell: (r: ScreenerResult) => fmt(r.indicators.ema50),
    },
    {
      header: "EMA200",
      align: "end",
      sortValue: (r: ScreenerResult) => r.indicators.ema200 ?? null,
      cell: (r: ScreenerResult) => fmt(r.indicators.ema200),
    },
    {
      header: "ATR",
      align: "end",
      sortValue: (r: ScreenerResult) => r.indicators.atr ?? null,
      cell: (r: ScreenerResult) => fmt(r.indicators.atr),
    },
    {
      header: "VOL×",
      align: "end",
      sortValue: (r: ScreenerResult) => r.indicators.volRatio ?? null,
      cell: (r: ScreenerResult) =>
        r.indicators.volRatio != null ? `${fmt(r.indicators.volRatio)}x` : "—",
    },
    {
      header: "WHY",
      sortValue: (r: ScreenerResult) => r.reason,
      cell: (r: ScreenerResult) => (
        <span className="sheet-reason" title={r.reason}>
          {r.reason}
        </span>
      ),
    },
  );

  return cols;
}

function sortRows(
  rows: ScreenerResult[],
  cols: Col[],
  sort: SortState | null,
): ScreenerResult[] {
  if (!sort) return rows;
  const getV = cols[sort.col]?.sortValue as
    | ((r: ScreenerResult) => number | string | null)
    | undefined;
  if (!getV) return rows;
  const dir = sort.dir;
  return [...rows].sort((a, b) => {
    const va = getV(a);
    const vb = getV(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    let cmp = 0;
    if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
    else cmp = String(va).localeCompare(String(vb));
    return cmp * dir;
  });
}

export default function ScreenerSheet({
  results,
  showScreen = false,
  onDelete,
}: {
  results: ScreenerResult[];
  showScreen?: boolean;
  onDelete?: () => void;
}) {
  const cols = useMemo(() => buildCols(showScreen), [showScreen]);
  const scoreIdx = useMemo(
    () => cols.findIndex((c) => c.header === "SCORE"),
    [cols],
  );

  const [sort, setSort] = useState<SortState | null>({
    col: scoreIdx,
    dir: -1,
  });
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return results;
    return results.filter(
      (r) =>
        clean(r.symbol).toLowerCase().includes(t) ||
        (r.name ?? "").toLowerCase().includes(t),
    );
  }, [results, q]);

  const sorted = useMemo(
    () => sortRows(filtered, cols, sort),
    [filtered, cols, sort],
  );

  function toggle(col: number) {
    setSort((s) => {
      if (!s || s.col !== col) return { col, dir: -1 }; // first click: desc
      if (s.dir === -1) return { col, dir: 1 };
      return null; // third click clears sort
    });
  }

  return (
    <div className="screener-sheet-wrap">
      <div className="sheet-toolbar">
        <i className="bi bi-funnel" style={{ color: "var(--muted)" }} />
        <input
          className="sheet-search"
          placeholder="Filter symbol or name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="sheet-count">
          {sorted.length} of {results.length} stocks
        </span>
        {sort && (
          <span className="sort-chip">
            sorted: {cols[sort.col].header} {sort.dir === -1 ? "▼" : "▲"}
          </span>
        )}
        {onDelete && (
          <button
            className="screen-del"
            onClick={onDelete}
            aria-label="Delete this screen"
            title="Delete this screen"
          >
            <i className="bi bi-x-lg" />
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="empty-note">
          {q ? "No matching stocks." : "No candidates right now."}
        </div>
      ) : (
        <div className="screener-sheet">
          <table className="table table-sm mono mb-0">
            <thead>
              <tr>
                {cols.map((c, i) => {
                  const sortable = !!c.sortValue;
                  const active = sort?.col === i;
                  return (
                    <th
                      key={i}
                      className={clsx(
                        c.align === "end" ? "text-end" : "",
                        sortable ? "th-sort" : "",
                        active ? "th-sorted" : "",
                      )}
                      onClick={sortable ? () => toggle(i) : undefined}
                      title={sortable ? `Sort by ${c.header}` : undefined}
                    >
                      {c.header}
                      {sortable && (
                        <span className="th-caret">
                          {active ? (sort!.dir === -1 ? "▼" : "▲") : "⇅"}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={`${r.symbol}-${i}`}>
                  {cols.map((c, j) => (
                    <td
                      key={j}
                      className={c.align === "end" ? "text-end" : ""}
                    >
                      {c.cell(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
