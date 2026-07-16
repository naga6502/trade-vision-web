"use client";

import { useState } from "react";
import type { IncomeStatementRow } from "@/lib/mcp";
import { fmt, fmtCompact, dir, clsx } from "@/lib/format";

type View = "quarterly" | "annual";

function periodLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

// Each row: [label, value accessor, money?]. EPS is shown as a plain number.
const ROWS: [string, (r: IncomeStatementRow) => number | null, boolean][] = [
  ["Total Revenue", (r) => r.totalRevenue, true],
  ["Cost of Revenue", (r) => r.costOfRevenue, true],
  ["Gross Profit", (r) => r.grossProfit, true],
  ["Operating Income", (r) => r.operatingIncome, true],
  ["EBIT", (r) => r.ebit, true],
  ["EBITDA", (r) => r.ebitda, true],
  ["Net Income", (r) => r.netIncome, true],
  ["Net Income (Common)", (r) => r.netIncomeCommonStockholders, true],
  ["Diluted EPS", (r) => r.dilutedEPS, false],
];

export default function IncomeStatement({
  quarterly,
  annual,
}: {
  quarterly: IncomeStatementRow[];
  annual: IncomeStatementRow[];
}) {
  const [view, setView] = useState<View>("quarterly");
  const data = view === "quarterly" ? quarterly : annual;

  // Latest period first (columns read left-to-right, newest to oldest).
  const cols = [...data].reverse();

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="d-flex align-items-center mb-3 flex-wrap gap-2">
        <div className="section-title mb-0">
          <i className="bi bi-table" /> Income Statement
        </div>
        <div className="btn-group btn-group-sm ms-auto" role="group" aria-label="Period toggle">
          <button
            type="button"
            className={clsx("btn", view === "quarterly" ? "btn-terminal" : "btn-outline-secondary")}
            onClick={() => setView("quarterly")}
          >
            Quarterly
          </button>
          <button
            type="button"
            className={clsx("btn", view === "annual" ? "btn-terminal" : "btn-outline-secondary")}
            onClick={() => setView("annual")}
          >
            Yearly
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-muted small">
          Income statement data unavailable for this view.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm mono mb-0">
            <thead>
              <tr>
                <th className="muted-text" style={{ position: "sticky", left: 0, background: "var(--surface)" }}>
                  Metric
                </th>
                {cols.map((c) => (
                  <th key={c.periodEnd} className="text-end">
                    {periodLabel(c.periodEnd)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, get, isMoney]) => (
                <tr key={label}>
                  <td className="muted-text" style={{ position: "sticky", left: 0, background: "var(--surface)" }}>
                    {label}
                  </td>
                  {cols.map((c) => {
                    const v = get(c);
                    const cls = isMoney && v != null ? dir(v) : "";
                    return (
                      <td
                        key={c.periodEnd}
                        className={clsx(
                          "text-end",
                          cls === "gain" ? "gain-text" : cls === "loss" ? "loss-text" : "",
                        )}
                      >
                        {v == null ? "—" : isMoney ? `₹${fmtCompact(v)}` : fmt(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
