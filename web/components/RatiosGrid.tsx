import type { Fundamentals } from "@/lib/mcp";
import { fmt } from "@/lib/format";

export default function RatiosGrid({ f }: { f: Fundamentals }) {
  const cells: { label: string; value: string; tag: string }[] = [
    { label: "ROE", value: f.returnOnEquity != null ? `${fmt(f.returnOnEquity)}%` : "—", tag: "TTM" },
    { label: "P/E RATIO", value: f.trailingPE != null ? `${fmt(f.trailingPE)}x` : "—", tag: "TTM" },
    { label: "DEBT/EQUITY", value: f.debtToEquity != null ? fmt(f.debtToEquity) : "—", tag: "MRQ" },
    { label: "CURRENT RATIO", value: f.currentRatio != null ? fmt(f.currentRatio) : "—", tag: "MRQ" },
    { label: "OP. MARGIN", value: f.operatingMargins != null ? `${fmt(f.operatingMargins)}%` : "—", tag: "TTM" },
    { label: "EPS (TTM)", value: f.eps != null ? `₹${fmt(f.eps)}` : "—", tag: "TTM" },
  ];

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="panel-title">
        <i className="bi bi-pie-chart" /> Ratios
        <span className="sub">FY audited · TTM</span>
      </div>
      <div className="grid-3">
        {cells.map((c) => (
          <div
            key={c.label}
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <div className="muted-text" style={{ fontSize: "0.7rem", letterSpacing: "0.04em" }}>
              {c.label}
            </div>
            <div className="mono" style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: 4 }}>
              {c.value}
            </div>
            <div className="muted-text" style={{ fontSize: "0.68rem" }}>
              {c.tag}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
