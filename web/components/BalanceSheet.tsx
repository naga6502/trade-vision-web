import type { Fundamentals } from "@/lib/mcp";
import { fmt, fmtCompact, clsx } from "@/lib/format";

export default function BalanceSheet({ f }: { f: Fundamentals }) {
  const cash = f.totalCash ?? null;
  const debt = f.totalDebt ?? null;
  const net = cash != null && debt != null ? cash - debt : null;

  const rows: [string, string | null, "gain" | "loss" | ""][] = [
    ["Total Cash (MRQ)", cash != null ? `₹${fmtCompact(cash)}` : "—", ""],
    ["Total Debt (MRQ)", debt != null ? `₹${fmtCompact(debt)}` : "—", ""],
    [
      "Net Cash / Debt",
      net != null ? `₹${fmtCompact(net)}` : "—",
      net == null ? "" : net >= 0 ? "gain" : "loss",
    ],
  ];

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="panel-title">
        <i className="bi bi-bank" /> Balance Sheet Summary
      </div>
      <table className="table table-sm mono mb-0">
        <tbody>
          {rows.map(([k, v, d]) => (
            <tr key={k}>
              <td className="muted-text">{k}</td>
              <td className={clsx("text-end", d === "gain" ? "gain-text" : d === "loss" ? "loss-text" : "")}>
                {v}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
