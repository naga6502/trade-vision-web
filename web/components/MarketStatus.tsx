import type { MarketStatusItem } from "@/lib/mcp";

function badgeFor(status: string): { cls: string; icon: string } {
  const s = status.toUpperCase();
  if (s.includes("CLOSE")) return { cls: "bg-secondary", icon: "bi-x-circle" };
  if (s.includes("OPEN") || s.includes("LIVE")) return { cls: "bg-success", icon: "bi-check-circle" };
  return { cls: "bg-warning text-dark", icon: "bi-clock" };
}

export default function MarketStatus({ items }: { items: MarketStatusItem[] }) {
  if (!items || items.length === 0) {
    return <p className="text-muted">No market status data available.</p>;
  }
  return (
    <div className="row g-3">
      {items.map((m, i) => {
        const { cls, icon } = badgeFor(m.marketStatus);
        const up = m.percentChange >= 0;
        return (
          <div className="col-12 col-md-6 col-lg-4" key={i}>
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <strong>{m.market}</strong>
                  <span className={`badge ${cls}`}>
                    <i className={`bi ${icon} me-1`} />
                    {m.marketStatus}
                  </span>
                </div>
                <div className="mt-2">
                  <span className={up ? "gain-text fw-semibold" : "loss-text fw-semibold"}>
                    <i className={`bi ${up ? "bi-arrow-up" : "bi-arrow-down"} me-1`} />
                    {m.last.toLocaleString("en-IN")}
                  </span>
                  <span className="text-muted small ms-2">
                    ({up ? "+" : ""}
                    {m.percentChange}%)
                  </span>
                </div>
                <div className="text-muted small mt-1">
                  {m.index} &middot; {m.tradeDate}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
