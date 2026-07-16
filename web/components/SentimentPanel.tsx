import type { Fundamentals } from "@/lib/mcp";

function labelFor(mean: number): string {
  if (mean <= 1.5) return "Strong Buy";
  if (mean <= 2.5) return "Buy";
  if (mean <= 3.5) return "Hold";
  if (mean <= 4.5) return "Sell";
  return "Strong Sell";
}

export default function SentimentPanel({ f }: { f: Fundamentals }) {
  const mean = f.recommendationMean ?? 3;
  const buyPct = Math.max(0, Math.min(100, ((5 - mean) / 4) * 100));
  const sellPct = 100 - buyPct;
  const label = labelFor(mean);
  const color =
    mean <= 2 ? "var(--gain)" : mean >= 4 ? "var(--loss)" : "var(--accent)";

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="panel-title">
        <i className="bi bi-heart-pulse" /> Sentiment
      </div>
      <div className="d-flex justify-content-between align-items-baseline">
        <span className="mono" style={{ fontSize: "1.5rem", fontWeight: 700, color }}>
          {Math.round(buyPct)}%
        </span>
        <span className="pill" style={{ color, borderColor: color }}>
          {label}
        </span>
      </div>
      <div className="gauge mt-2">
        <div className="buy" style={{ width: `${buyPct}%` }} />
        <div className="sell" style={{ width: `${sellPct}%` }} />
      </div>
      <div className="d-flex justify-content-between muted-text mt-1" style={{ fontSize: "0.74rem" }}>
        <span>{Math.round(buyPct)}% BUY</span>
        <span>{Math.round(sellPct)}% SELL</span>
      </div>
    </div>
  );
}
