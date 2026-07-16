import type { Fundamentals } from "@/lib/mcp";

function fmt(n: number | null, d = 2): string {
  return n == null ? "—" : n.toLocaleString("en-IN", { maximumFractionDigits: d });
}

export default function StockHeader({ f }: { f: Fundamentals }) {
  const up = f.price >= f.previousClose;
  const change = f.price - f.previousClose;
  const pct = f.previousClose ? (change / f.previousClose) * 100 : 0;
  const hi = f.fiftyTwoWeekHigh;
  const lo = f.fiftyTwoWeekLow;
  const rangePct =
    hi != null && lo != null && hi > lo
      ? ((f.price - lo) / (hi - lo)) * 100
      : 0;

  return (
    <div>
      <div className="d-flex align-items-baseline gap-2 flex-wrap">
        <h4 className="mb-0">{f.ticker.replace(/\.NS$/, "")}</h4>
        <span className="text-muted small">
          {f.name ?? ""} · {f.exchange ?? "NSE"}
        </span>
      </div>
      <div className="d-flex align-items-baseline gap-2 mt-1">
        <span className="fs-3 fw-bold">{fmt(f.price)}</span>
        <span className={up ? "gain-text" : "loss-text"}>
          <i className={`bi ${up ? "bi-arrow-up" : "bi-arrow-down"}`} />{" "}
          {fmt(change)} ({pct >= 0 ? "+" : ""}
          {pct.toFixed(2)}%)
        </span>
      </div>
      <div className="small text-muted mb-2">
        52w: {fmt(f.fiftyTwoWeekLow)} &ndash; {fmt(f.fiftyTwoWeekHigh)}
      </div>
      <div className="range-track">
        <div
          className="range-fill"
          style={{ left: "0%", right: `${100 - rangePct}%` }}
        />
        <div className="range-marker" style={{ left: `${rangePct}%` }} />
      </div>
    </div>
  );
}
