"use client";

import { useState } from "react";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import Link from "next/link";
import type { IpoSignal, IpoWithSignal } from "@/lib/mcp";
import ScreenerTable, { Col } from "@/components/ScreenerTable";
import { fmt, fmtPct, clsx } from "@/lib/format";

type Status = "current" | "upcoming" | "latest" | "closed" | "all";

const STATUSES: { key: Status; label: string }[] = [
  { key: "current", label: "Open" },
  { key: "upcoming", label: "Upcoming" },
  { key: "latest", label: "Latest" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "All" },
];

function verdictClass(s: IpoSignal["signal"]): string {
  if (s === "APPLY") return "success";
  if (s === "SKIP") return "danger";
  return "warning";
}

function VerdictPill({ s }: { s: IpoSignal }) {
  return (
    <span className={`badge bg-${verdictClass(s.signal)}`}>
      {s.signal}
      <span className="ms-1 opacity-75 small">{s.confidence[0]}</span>
    </span>
  );
}

function bandText(ipo: IpoWithSignal): string {
  if (!ipo.priceBand) return "—";
  const { min, max, kind } = ipo.priceBand;
  return kind === "FIXED" ? `₹${fmt(min, 0)}` : `₹${fmt(min, 0)}–${fmt(max, 0)}`;
}

function dateText(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function slug(ipo: IpoWithSignal): string {
  return encodeURIComponent(ipo.companyName);
}

export default function IpoPage() {
  const [status, setStatus] = useState<Status>("all");
  const [ipos, setIpos] = useState<IpoWithSignal[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useAutoRefresh(() => {
    (async () => {
      try {
        const r = await fetch(`/api/ipo?status=${status}`).then((x) => x.json());
        if (r.error) throw new Error(r.error);
        setIpos(r.ipos ?? []);
        setErr(null);
        setLoading(false);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
        setLoading(false);
      }
    })();
  }, [status]);

  const cols: Col[] = [
    {
      header: "COMPANY",
      cell: (r: IpoWithSignal) => (
        <Link href={`/ipo/${slug(r)}`} className="fw-semibold" style={{ color: "var(--ink)" }}>
          {r.companyName}
          <div className="small text-muted">
            {r.symbol ?? "—"} · {r.exchange} · {r.type}
          </div>
        </Link>
      ),
      sortValue: (r: IpoWithSignal) => r.companyName,
    },
    {
      header: "PRICE BAND",
      align: "end",
      cell: (r: IpoWithSignal) => bandText(r),
      sortValue: (r: IpoWithSignal) => r.priceBand?.min ?? null,
    },
    {
      header: "GMP",
      align: "end",
      cell: (r: IpoWithSignal) =>
        r.gmpPercent != null ? (
          <span className={clsx(r.gmpPercent >= 0 ? "gain-text" : "loss-text")}>
            {fmtPct(r.gmpPercent)}
          </span>
        ) : r.gmp != null ? (
          <span>₹{fmt(r.gmp, 0)}</span>
        ) : (
          "—"
        ),
      sortValue: (r: IpoWithSignal) => r.gmpPercent ?? r.gmp ?? null,
    },
    {
      header: "SUB x",
      align: "end",
      cell: (r: IpoWithSignal) => (r.subscription?.total != null ? `${fmt(r.subscription.total, 1)}x` : "—"),
      sortValue: (r: IpoWithSignal) => r.subscription?.total ?? null,
    },
    {
      header: "OPEN → CLOSE",
      cell: (r: IpoWithSignal) => `${dateText(r.openDate)} → ${dateText(r.closeDate)}`,
      sortValue: (r: IpoWithSignal) => r.openDate,
    },
    {
      header: "LISTING",
      cell: (r: IpoWithSignal) => dateText(r.listingDate),
      sortValue: (r: IpoWithSignal) => r.listingDate,
    },
    {
      header: "SIGNAL",
      cell: (r: IpoWithSignal) => <VerdictPill s={r.signal} />,
      sortValue: (r: IpoWithSignal) =>
        ({ APPLY: 3, WATCH: 2, SKIP: 1 } as Record<string, number>)[r.signal?.signal] ?? 0,
    },
  ];

  return (
    <div>
      <div className="d-flex align-items-center mb-3 flex-wrap gap-2">
        <h1 className="page-title mb-0">IPO Monitor</h1>
        <span className="pill accent ms-1">Apply / Skip / Watch</span>
      </div>
      <p className="muted-text" style={{ fontSize: "0.85rem", marginTop: -4 }}>
        Live NSE/BSE IPOs enriched with grey-market premium, subscription and fundamentals, scored by an
        explainable signal engine.
      </p>

      <div className="d-flex gap-2 mb-3 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s.key}
            className={clsx("pill", status === s.key ? "accent" : "")}
            style={{ cursor: "pointer", border: "1px solid var(--border)" }}
            onClick={() => setStatus(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center text-muted py-5">
          <span className="spinner-border spinner-border-sm me-2" /> Loading IPOs…
        </div>
      )}
      {err && !loading && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2" />
          {err}
        </div>
      )}

      {!loading && !err && (
        <ScreenerTable
          title="IPOs"
          icon="bi-box-seam"
          cols={cols}
          rows={ipos}
          emptyText="No IPOs in this window."
          defaultSort={{ col: 2, dir: -1 }}
        />
      )}
    </div>
  );
}
