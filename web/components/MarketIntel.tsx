import type { NseStock, NseAnnouncement, NseIndex } from "@/lib/mcp";
import { fmt, fmtPct, dir, clsx } from "@/lib/format";

export default function MarketIntel({
  trending,
  headlines,
  sectors,
}: {
  trending: NseStock[];
  headlines: NseAnnouncement[];
  sectors: NseIndex[];
}) {
  const topTrending = [...trending].slice(0, 6);
  const topHeadlines = [...headlines].slice(0, 6);
  const topSectors = [...sectors]
    .sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
    .slice(0, 8);

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="panel-title">
        <i className="bi bi-lightning-charge" /> Market Intelligence
      </div>
      <div className="grid-3">
        {/* Trending stocks */}
        <div>
          <div className="muted-text mb-2" style={{ fontSize: "0.74rem", fontWeight: 600 }}>
            TRENDING STOCKS
          </div>
          {topTrending.length === 0 ? (
            <div className="empty-note">—</div>
          ) : (
            topTrending.map((s) => (
              <div
                key={s.symbol}
                className="d-flex justify-content-between align-items-center py-1"
                style={{ borderBottom: "1px solid var(--border-soft)" }}
              >
                <span className="fw-semibold" style={{ fontSize: "0.85rem" }}>
                  {s.symbol}
                </span>
                <span className="mono muted-text" style={{ fontSize: "0.8rem" }}>
                  ₹{fmt(s.lastPrice)}
                </span>
                <span className={clsx("mono", dir(s.pChange) === "gain" ? "gain-text" : "loss-text")} style={{ fontSize: "0.8rem", width: 64, textAlign: "right" }}>
                  {fmtPct(s.pChange)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Headlines */}
        <div>
          <div className="muted-text mb-2" style={{ fontSize: "0.74rem", fontWeight: 600 }}>
            MARKET HEADLINES
          </div>
          {topHeadlines.length === 0 ? (
            <div className="empty-note">—</div>
          ) : (
            topHeadlines.map((a, i) => (
              <div key={i} className="py-1" style={{ borderBottom: "1px solid var(--border-soft)" }}>
                <div style={{ fontSize: "0.82rem" }}>
                  {a.pdfLink ? (
                    <a href={a.pdfLink} target="_blank" rel="noreferrer">
                      {a.description}
                    </a>
                  ) : (
                    a.description
                  )}
                </div>
                <div className="muted-text" style={{ fontSize: "0.68rem" }}>
                  {a.symbol} · {a.broadcastDateTime?.slice(0, 16) || "—"}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sector performance */}
        <div>
          <div className="muted-text mb-2" style={{ fontSize: "0.74rem", fontWeight: 600 }}>
            SECTOR PERFORMANCE
          </div>
          {topSectors.length === 0 ? (
            <div className="empty-note">—</div>
          ) : (
            topSectors.map((s) => (
              <div
                key={s.key || s.name}
                className="d-flex justify-content-between align-items-center py-1"
                style={{ borderBottom: "1px solid var(--border-soft)" }}
              >
                <span style={{ fontSize: "0.82rem" }}>{s.name.replace("NIFTY ", "")}</span>
                <span className={clsx("mono", dir(s.percentChange) === "gain" ? "gain-text" : "loss-text")} style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                  {fmtPct(s.percentChange)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
