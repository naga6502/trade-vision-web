import type { MajorHolders } from "@/lib/mcp";

function Bar({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number | null;
  color: string;
}) {
  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between small">
        <span>{label}</span>
        <span className="fw-semibold">{pct == null ? "—" : `${pct}%`}</span>
      </div>
      <div className="progress" style={{ height: "10px" }}>
        <div
          className={`progress-bar bg-${color}`}
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
    </div>
  );
}

export default function Stakeholders({ h }: { h: MajorHolders }) {
  const ins =
    h.insidersPercentHeld != null
      ? Number((h.insidersPercentHeld * 100).toFixed(2))
      : null;
  const inst =
    h.institutionsPercentHeld != null
      ? Number((h.institutionsPercentHeld * 100).toFixed(2))
      : null;
  const floatPct =
    h.institutionsFloatPercentHeld != null
      ? Number((h.institutionsFloatPercentHeld * 100).toFixed(2))
      : null;

  return (
    <div>
      <div className="section-title">
        <i className="bi bi-people" /> Stakeholders
      </div>
      <Bar label="Promoters / Insiders" pct={ins} color="success" />
      <Bar label="Institutional Holdings" pct={inst} color="primary" />
      <Bar label="Institutions (of free float)" pct={floatPct} color="info" />
      <div className="mt-2 small text-muted">
        Institutional shareholders:{" "}
        <b className="text-light">{h.institutionsCount ?? "—"}</b>
      </div>
    </div>
  );
}
