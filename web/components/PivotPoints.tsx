import type { Fundamentals } from "@/lib/mcp";
import { fmt, clsx } from "@/lib/format";

export default function PivotPoints({ f }: { f: Fundamentals }) {
  const h = f.dayHigh ?? 0;
  const l = f.dayLow ?? 0;
  const c = f.price ?? 0;
  if (!h || !l || !c) {
    return (
      <div className="panel" style={{ padding: 16 }}>
        <div className="panel-title">
          <i className="bi bi-rulers" /> Pivot Points (Standard)
        </div>
        <div className="empty-note">Intraday high/low unavailable.</div>
      </div>
    );
  }
  const pp = (h + l + c) / 3;
  const r1 = 2 * pp - l;
  const s1 = 2 * pp - h;
  const r2 = pp + (h - l);
  const s2 = pp - (h - l);
  const r3 = h + 2 * (pp - l);
  const s3 = l - 2 * (h - pp);

  const rows: [string, number, "gain" | "loss" | ""][] = [
    ["R3", r3, "loss"],
    ["R2", r2, "loss"],
    ["R1", r1, "loss"],
    ["PP", pp, ""],
    ["S1", s1, "gain"],
    ["S2", s2, "gain"],
    ["S3", s3, "gain"],
  ];

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="panel-title">
        <i className="bi bi-rulers" /> Pivot Points (Standard)
      </div>
      <table className="table table-sm mono mb-0">
        <tbody>
          {rows.map(([k, v, d]) => (
            <tr key={k}>
              <td className="muted-text">{k}</td>
              <td className={clsx("text-end", d === "gain" ? "gain-text" : d === "loss" ? "loss-text" : "")}>
                ₹{fmt(v)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
