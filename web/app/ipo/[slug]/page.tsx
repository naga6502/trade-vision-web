"use client";

import { useState } from "react";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { fetchJson } from "@/lib/fetchJson";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { IpoSignalCheck, IpoWithSignal } from "@/lib/mcp";
import IpoSignalBadge from "@/components/IpoSignalBadge";
import StatCard from "@/components/StatCard";
import { fmt, fmtPct, fmtInt, clsx } from "@/lib/format";

function dateText(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function numText(n: number | null, suffix = ""): string {
  return n == null ? "—" : `${fmt(n)}${suffix}`;
}

const CHECK_CLASS: Record<IpoSignalCheck["status"], string> = {
  PASS: "success",
  WARN: "warning",
  FAIL: "danger",
};

export default function IpoDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug ?? "");

  const [ipo, setIpo] = useState<IpoWithSignal | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useAutoRefresh(() => {
    if (!slug) return;
    (async () => {
      try {
        const r = await fetchJson<any>(`/api/ipo/${encodeURIComponent(slug)}`);
        if (r.error) throw new Error(r.error);
        setIpo(r);
        setErr(null);
        setLoading(false);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="text-center text-muted py-5">
        <span className="spinner-border spinner-border-sm me-2" /> Loading IPO…
      </div>
    );
  }

  if (err || !ipo) {
    return (
      <div className="alert alert-danger">
        <i className="bi bi-exclamation-triangle me-2" />
        {err ?? "IPO not found."}
        <div className="mt-2">
          <Link href="/ipo" className="btn btn-sm btn-outline-light">
            ← Back to IPO Monitor
          </Link>
        </div>
      </div>
    );
  }

  const s = ipo.signal;
  const fin = ipo.financials;
  const sub = ipo.subscription;

  return (
    <div>
      <div className="mb-3">
        <Link href="/ipo" className="small text-muted">
          ← IPO Monitor
        </Link>
      </div>

      <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-3">
        <div>
          <h1 className="page-title mb-1">{ipo.companyName}</h1>
          <div className="muted-text">
            {ipo.symbol ?? "—"} · {ipo.exchange} · {ipo.type}
            {ipo.issueType ? ` · ${ipo.issueType}` : ""}
          </div>
        </div>
        <IpoSignalBadge signal={s} />
      </div>

      <div className="grid-4 mb-4">
        <StatCard
          icon="bi-tag"
          label="Price Band"
          value={ipo.priceBand ? (ipo.priceBand.kind === "FIXED" ? `₹${fmt(ipo.priceBand.min, 0)}` : `₹${fmt(ipo.priceBand.min, 0)}–${fmt(ipo.priceBand.max, 0)}`) : "—"}
        />
        <StatCard
          icon="bi-cash-stack"
          label="Issue Size"
          value={ipo.issueSizeCr != null ? `₹${fmt(ipo.issueSizeCr)} Cr` : "—"}
        />
        <StatCard
          icon="bi-box"
          label="Lot Size"
          value={ipo.lotSize != null ? fmtInt(ipo.lotSize) : "—"}
          sub={ipo.faceValue != null ? `FV ₹${fmt(ipo.faceValue, 0)}` : undefined}
        />
        <StatCard
          icon="bi-graph-up-arrow"
          label="GMP"
          value={
            ipo.gmpPercent != null ? (
              <span className={clsx(ipo.gmpPercent >= 0 ? "gain-text" : "loss-text")}>{fmtPct(ipo.gmpPercent)}</span>
            ) : ipo.gmp != null ? (
              `₹${fmt(ipo.gmp, 0)}`
            ) : (
              "—"
            )
          }
          sub={ipo.gmpAsOf ? `as of ${ipo.gmpAsOf}` : undefined}
        />
      </div>

      <div className="grid-2 mb-4">
        <div className="panel" style={{ padding: 16 }}>
          <div className="panel-title">
            <i className="bi bi-calendar-event" /> Key Dates
          </div>
          <table className="table table-sm mb-0">
            <tbody>
              <tr><td className="text-muted">Open</td><td className="text-end">{dateText(ipo.openDate)}</td></tr>
              <tr><td className="text-muted">Close</td><td className="text-end">{dateText(ipo.closeDate)}</td></tr>
              <tr><td className="text-muted">Allotment</td><td className="text-end">{dateText(ipo.allotmentDate)}</td></tr>
              <tr><td className="text-muted">Listing</td><td className="text-end">{dateText(ipo.listingDate)}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="panel" style={{ padding: 16 }}>
          <div className="panel-title">
            <i className="bi bi-people" /> Subscription
          </div>
          {sub ? (
            <table className="table table-sm mb-0">
              <tbody>
                <tr><td className="text-muted">QIB</td><td className="text-end">{numText(sub.qib, "x")}</td></tr>
                <tr><td className="text-muted">HNI / NII</td><td className="text-end">{numText(sub.nii, "x")}</td></tr>
                <tr><td className="text-muted">Retail</td><td className="text-end">{numText(sub.retail, "x")}</td></tr>
                <tr><td className="text-muted fw-semibold">Total</td><td className="text-end fw-semibold">{numText(sub.total, "x")}</td></tr>
              </tbody>
            </table>
          ) : (
            <div className="empty-note">Subscription data unavailable.</div>
          )}
        </div>
      </div>

      <div className="panel mb-4" style={{ padding: 16 }}>
        <div className="panel-title">
          <i className="bi bi-clipboard-data" /> Fundamentals
        </div>
        {fin ? (
          <div className="grid-4">
            <StatCard label="Revenue" value={numText(fin.revenue, " Cr")} />
            <StatCard label="PAT" value={numText(fin.pat, " Cr")} />
            <StatCard label="EPS" value={numText(fin.eps)} />
            <StatCard
              label="P/E (vs industry)"
              value={fin.peRatio != null ? fmt(fin.peRatio) : "—"}
              sub={fin.industryPe != null ? `industry ${fmt(fin.industryPe)}` : undefined}
            />
            <StatCard label="ROE" value={fin.roe != null ? fmtPct(fin.roe, false) : "—"} />
            <StatCard label="Debt/Equity" value={numText(fin.debtEquity)} />
            <StatCard label="Revenue Growth" value={fin.revenueGrowth != null ? fmtPct(fin.revenueGrowth) : "—"} />
            <StatCard label="Profit Growth" value={fin.profitGrowth != null ? fmtPct(fin.profitGrowth) : "—"} />
          </div>
        ) : (
          <div className="empty-note">Fundamentals unavailable.</div>
        )}
      </div>

      <div className="panel" style={{ padding: 16 }}>
        <div className="panel-title">
          <i className="bi bi-shield-check" /> Signal Breakdown
        </div>
        <div className="d-flex flex-column gap-2">
          {s.checks.map((c: IpoSignalCheck) => (
            <div key={c.id} className="d-flex align-items-start gap-3">
              <span className={`badge bg-${CHECK_CLASS[c.status]} mt-1`} style={{ minWidth: 56, textAlign: "center" }}>
                {c.status}
              </span>
              <div className="flex-grow-1">
                <div className="d-flex justify-content-between">
                  <span className="fw-semibold">{c.label}</span>
                  <span className={clsx("small", c.points > 0 ? "gain-text" : c.points < 0 ? "loss-text" : "text-muted")}>
                    {c.points > 0 ? `+${c.points}` : c.points} pts
                  </span>
                </div>
                <div className="small text-muted">{c.note}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <div className="small text-uppercase text-muted mb-1">Why</div>
          <ul className="mb-0 small">
            {s.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>

        <div className="mt-3 small text-muted fst-italic">{s.disclaimer}</div>
      </div>
    </div>
  );
}
