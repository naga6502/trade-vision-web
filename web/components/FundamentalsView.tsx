import type { Fundamentals } from "@/lib/mcp";

function fmt(n: number | null, opts: { money?: boolean; pct?: boolean; d?: number } = {}): string {
  if (n == null) return "—";
  const d = opts.d ?? 2;
  if (opts.pct) return `${n.toFixed(2)}%`;
  if (opts.money) {
    // Express large values in crore for readability.
    if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
    return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: d })}`;
  }
  return n.toLocaleString("en-IN", { maximumFractionDigits: d });
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border rounded p-2" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
      <div className="text-muted small">{label}</div>
      <div className="fw-semibold">{value}</div>
      {sub && <div className="text-muted" style={{ fontSize: "0.72rem" }}>{sub}</div>}
    </div>
  );
}

export default function FundamentalsView({ f }: { f: Fundamentals }) {
  return (
    <div>
      <div className="section-title">
        <i className="bi bi-clipboard-data" /> Fundamentals
      </div>
      <div className="row row-cols-2 row-cols-md-3 g-2">
        <Metric label="Market Cap" value={fmt(f.marketCap, { money: true })} />
        <Metric label="P/E (TTM)" value={fmt(f.trailingPE)} />
        <Metric label="Forward P/E" value={fmt(f.forwardPE)} />
        <Metric label="P/B" value={fmt(f.priceToBook)} />
        <Metric label="EPS (TTM)" value={fmt(f.eps)} />
        <Metric label="Beta" value={fmt(f.beta)} />
        <Metric label="Dividend Yield" value={fmt(f.dividendYield, { pct: true })} />
        <Metric label="Profit Margin" value={fmt(f.profitMargins, { pct: true })} />
        <Metric label="Operating Margin" value={fmt(f.operatingMargins, { pct: true })} />
        <Metric label="Gross Margin" value={fmt(f.grossMargins, { pct: true })} />
        <Metric label="ROE" value={fmt(f.returnOnEquity, { pct: true })} />
        <Metric label="ROA" value={fmt(f.returnOnAssets, { pct: true })} />
        <Metric label="Debt / Equity" value={fmt(f.debtToEquity)} />
        <Metric label="Current Ratio" value={fmt(f.currentRatio)} />
        <Metric label="Total Cash" value={fmt(f.totalCash, { money: true })} />
        <Metric label="Total Debt" value={fmt(f.totalDebt, { money: true })} />
        <Metric
          label="Revenue Growth"
          value={fmt(f.revenueGrowth, { pct: true })}
        />
        <Metric
          label="Earnings Growth"
          value={fmt(f.earningsGrowth, { pct: true })}
        />
        <Metric label="Free Cash Flow" value={fmt(f.freeCashflow, { money: true })} />
      </div>
    </div>
  );
}
