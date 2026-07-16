"use client";

import type { IpoWithSignal } from "@/lib/mcp";
import IpoSignalBadge from "@/components/IpoSignalBadge";
import StatCard from "@/components/StatCard";
import { fmt, fmtPct, fmtInt, clsx } from "@/lib/format";

function dateText(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00Z" : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Renders the IPO lookup for the selected stock on the Analytics page.
// Returns null when there's no active IPO so listed stocks stay clean.
export default function IpoPanel({ data }: { data: IpoWithSignal | null }) {
  if (!data) return null;

  const s = data.signal;
  const sub = data.subscription;

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <div className="panel-title">
            <i className="bi bi-box-seam" /> IPO · {data.companyName}
          </div>
          <div className="muted-text small">
            {data.symbol ?? "—"} · {data.exchange} · {data.type}
            {data.issueType ? ` · ${data.issueType}` : ""}
          </div>
        </div>
        <IpoSignalBadge signal={s} />
      </div>

      <div className="grid-4 mb-3">
        <StatCard
          icon="bi-tag"
          label="Price Band"
          value={
            data.priceBand
              ? data.priceBand.kind === "FIXED"
                ? `₹${fmt(data.priceBand.min, 0)}`
                : `₹${fmt(data.priceBand.min, 0)}–${fmt(data.priceBand.max, 0)}`
              : "—"
          }
        />
        <StatCard
          icon="bi-cash-stack"
          label="Issue Size"
          value={data.issueSizeCr != null ? `₹${fmt(data.issueSizeCr)} Cr` : "—"}
        />
        <StatCard
          icon="bi-box"
          label="Lot Size"
          value={data.lotSize != null ? fmtInt(data.lotSize) : "—"}
          sub={data.faceValue != null ? `FV ₹${fmt(data.faceValue, 0)}` : undefined}
        />
        <StatCard
          icon="bi-graph-up-arrow"
          label="GMP"
          value={
            data.gmpPercent != null ? (
              <span className={clsx(data.gmpPercent >= 0 ? "gain-text" : "loss-text")}>
                {fmtPct(data.gmpPercent)}
              </span>
            ) : data.gmp != null ? (
              `₹${fmt(data.gmp, 0)}`
            ) : (
              "—"
            )
          }
          sub={data.gmpAsOf ? `as of ${data.gmpAsOf}` : undefined}
        />
      </div>

      <div className="grid-2">
        <div>
          <div className="small text-uppercase text-muted mb-1">Key Dates</div>
          <table className="table table-sm mb-0">
            <tbody>
              <tr>
                <td className="text-muted">Open</td>
                <td className="text-end">{dateText(data.openDate)}</td>
              </tr>
              <tr>
                <td className="text-muted">Close</td>
                <td className="text-end">{dateText(data.closeDate)}</td>
              </tr>
              <tr>
                <td className="text-muted">Listing</td>
                <td className="text-end">{dateText(data.listingDate)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <div className="small text-uppercase text-muted mb-1">Subscription</div>
          {sub ? (
            <table className="table table-sm mb-0">
              <tbody>
                <tr>
                  <td className="text-muted">QIB</td>
                  <td className="text-end">{sub.qib != null ? `${fmt(sub.qib, 1)}x` : "—"}</td>
                </tr>
                <tr>
                  <td className="text-muted">HNI / NII</td>
                  <td className="text-end">{sub.nii != null ? `${fmt(sub.nii, 1)}x` : "—"}</td>
                </tr>
                <tr>
                  <td className="text-muted">Retail</td>
                  <td className="text-end">{sub.retail != null ? `${fmt(sub.retail, 1)}x` : "—"}</td>
                </tr>
                <tr>
                  <td className="text-muted fw-semibold">Total</td>
                  <td className="text-end fw-semibold">
                    {sub.total != null ? `${fmt(sub.total, 1)}x` : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="empty-note">Subscription data unavailable.</div>
          )}
        </div>
      </div>

      {s.reasons?.length > 0 && (
        <div className="mt-3">
          <div className="small text-uppercase text-muted mb-1">Signal rationale</div>
          <ul className="mb-0 small">
            {s.reasons.slice(0, 4).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
