import type { Fundamentals } from "@/lib/mcp";

export default function RiskScore({ f }: { f: Fundamentals }) {
  const beta = f.beta ?? 1;
  const de = f.debtToEquity ?? 0;
  const score = Math.max(1, Math.min(10, Math.round(beta * 2.5 + de * 1.5)));
  const level = score <= 3 ? "Low Risk" : score <= 6 ? "Medium Risk" : "High Risk";
  const color = score <= 3 ? "var(--gain)" : score <= 6 ? "var(--accent)" : "var(--loss)";

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="panel-title">
        <i className="bi bi-shield-check" /> Risk Score
      </div>
      <div className="d-flex align-items-baseline gap-2">
        <span className="mono" style={{ fontSize: "1.5rem", fontWeight: 700, color }}>
          {level}
        </span>
        <span className="muted-text" style={{ fontSize: "0.8rem" }}>
          Scale: 1–10
        </span>
      </div>
      <div className="gauge mt-2">
        <div style={{ width: `${(score / 10) * 100}%`, background: color }} />
      </div>
      <div className="d-flex justify-content-between muted-text mt-1" style={{ fontSize: "0.72rem" }}>
        <span>1</span>
        <span>derived from β {fmt1(beta)} · D/E {fmt1(de)}</span>
        <span>10</span>
      </div>
    </div>
  );
}

function fmt1(n: number): string {
  return n.toFixed(1);
}
