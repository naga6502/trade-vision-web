import type { Fundamentals } from "@/lib/mcp";
import { fmt } from "@/lib/format";

export default function ConsensusPanel({ f }: { f: Fundamentals }) {
  const target = f.targetMeanPrice;
  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="panel-title">
        <i className="bi bi-crosshair" /> Consensus PT
      </div>
      <div className="mono" style={{ fontSize: "1.5rem", fontWeight: 700 }}>
        {target != null ? `₹${fmt(target)}` : "—"}
      </div>
      <div className="d-flex gap-3 mt-2 muted-text" style={{ fontSize: "0.8rem" }}>
        <span>
          <span className="muted-text">L</span>{" "}
          <span className="mono">{target != null ? `₹${fmt(target * 0.85)}` : "—"}</span>
        </span>
        <span>
          <span className="muted-text">H</span>{" "}
          <span className="mono">{target != null ? `₹${fmt(target * 1.15)}` : "—"}</span>
        </span>
      </div>
      <div className="muted-text mt-2" style={{ fontSize: "0.72rem" }}>
        Analyst 12-mo target (mean). L/H shown as ±15% band.
      </div>
    </div>
  );
}
