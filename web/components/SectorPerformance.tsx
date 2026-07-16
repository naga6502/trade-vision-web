import type { NseIndex } from "@/lib/mcp";
import { fmtPct, dir, clsx } from "@/lib/format";

// Keywords that identify NIFTY sector indices among the ~139 allIndices rows.
const SECTOR_KEYWORDS = [
  "AUTO", "BANK", "FMCG", "IT", "METAL", "PHARMA", "PSU", "REALTY", "MEDIA",
  "CONSUMER", "FINANCIAL", "ENERGY", "INFRA", "COMMODIT", "MNC", "SERVICES",
  "OIL", "HEALTH", "PSE", "CONSUMPTION",
];

function isSector(name: string): boolean {
  const n = name.toUpperCase();
  if (!n.startsWith("NIFTY ")) return false;
  return SECTOR_KEYWORDS.some((k) => n.includes(k));
}

export default function SectorPerformance({ indices }: { indices: NseIndex[] }) {
  const sectors = indices
    .filter((i) => isSector(i.name))
    .sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange));

  const maxAbs = Math.max(0.1, ...sectors.map((s) => Math.abs(s.percentChange)));

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="panel-title">
        <i className="bi bi-pie-chart" /> Sector Performance
        <span className="sub">{sectors.length} sectors</span>
        <span className="live-dot" title="Live — updates every 10s">
          <i className="bi bi-broadcast" /> LIVE
        </span>
      </div>
      {sectors.length === 0 ? (
        <div className="empty-note">No data.</div>
      ) : (
        <div className="sector-list">
          {sectors.map((s) => {
            const d = dir(s.percentChange);
            return (
              <div className="sector-row" key={s.key || s.name}>
                <div className="sector-name">{s.name.replace("NIFTY ", "")}</div>
                <div className="sector-bar-track">
                  <div
                    className={clsx("sector-bar", d === "gain" ? "bar-gain" : "bar-loss")}
                    style={{ width: `${(Math.abs(s.percentChange) / maxAbs) * 100}%` }}
                  />
                </div>
                <div className={clsx("mono sector-pct", d === "gain" ? "gain-text" : d === "loss" ? "loss-text" : "")}>
                  {fmtPct(s.percentChange)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
