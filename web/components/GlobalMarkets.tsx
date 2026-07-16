import type { GlobalIndex } from "@/lib/mcp";
import { fmt, fmtPct, dir, clsx } from "@/lib/format";

export default function GlobalMarkets({ indices }: { indices: GlobalIndex[] }) {
  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="panel-title">
        <i className="bi bi-globe2" /> Global Markets
        <span className="sub">Previous close · {indices[0]?.currency ?? "USD"}</span>
      </div>
      {indices.length === 0 ? (
        <div className="empty-note">No data.</div>
      ) : (
        <div className="mini-grid">
          {indices.map((g) => {
            const d = dir(g.changePercent);
            return (
              <div className="mini-card" key={g.symbol}>
                <div className="d-flex justify-content-between align-items-baseline">
                  <span className="mini-name">{g.name}</span>
                  <span className={clsx("mono mini-pct", d === "gain" ? "gain-text" : d === "loss" ? "loss-text" : "")}>
                    {fmtPct(g.changePercent)}
                  </span>
                </div>
                <div className="mono mini-value">{fmt(g.price)}</div>
                <div className={clsx("mini-sub", d === "gain" ? "gain-text" : d === "loss" ? "loss-text" : "")}>
                  <i className={`bi ${d === "gain" ? "bi-arrow-up-right" : d === "loss" ? "bi-arrow-down-right" : "bi-dash"}`} />{" "}
                  {fmt(g.change)} {g.currency}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
