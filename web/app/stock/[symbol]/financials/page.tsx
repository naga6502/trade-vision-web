"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Fundamentals } from "@/lib/mcp";
import FundamentalsView from "@/components/FundamentalsView";
import ConsensusPanel from "@/components/ConsensusPanel";
import SentimentPanel from "@/components/SentimentPanel";
import RatiosGrid from "@/components/RatiosGrid";
import BalanceSheet from "@/components/BalanceSheet";
import CashFlowChart from "@/components/CashFlowChart";
import IncomeStatement from "@/components/IncomeStatement";
import ShareholdingPattern, {
  shareholdingSegmentsFromHolders,
} from "@/components/ShareholdingPattern";
import { fmt, fmtPct, dir, clsx } from "@/lib/format";
import { useAutoRefresh } from "@/lib/useAutoRefresh";

export default function FinancialsPage() {
  const params = useParams();
  const symbol = String(params.symbol ?? "RELIANCE").toUpperCase();

  const [f, setF] = useState<Fundamentals | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const didInit = useRef(false);
  useAutoRefresh(
    () => {
      const first = !didInit.current;
      didInit.current = true;
      (async () => {
        try {
          if (first) setLoading(true);
          const r = await fetch(`/api/fundamentals?symbol=${encodeURIComponent(symbol)}`).then((x) => x.json());
          if (r.error) throw new Error(r.error);
          setF(r);
          setLoading(false);
        } catch (e) {
          setErr(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      })();
    },
    [symbol],
    10_000,
  );

  const tvSymbol = (f?.ticker ?? symbol).replace(/\.NS$/, "");
  const price = f?.price ?? 0;
  const prev = f?.previousClose ?? 0;
  const change = price - prev;
  const pct = prev ? (change / prev) * 100 : 0;

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h1 className="page-title mb-0">{tvSymbol}</h1>
        <span className="pill accent">Financials</span>
        {f?.name && <span className="muted-text">{f.name}</span>}
        <span className={clsx("mono ms-2", dir(change) === "gain" ? "gain-text" : "loss-text")} style={{ fontWeight: 600 }}>
          ₹{fmt(price)} ({fmtPct(pct)})
        </span>
        <div className="ms-auto d-flex gap-2">
          <Link href={`/stock/${symbol}`} className="btn btn-sm btn-terminal">
            <i className="bi bi-speedometer2 me-1" /> Market Intel
          </Link>
          <Link href={`/stock/${symbol}/technical`} className="btn btn-sm btn-terminal">
            <i className="bi bi-activity me-1" /> Technical
          </Link>
        </div>
      </div>

      {loading && (
        <div className="text-center text-muted py-5">
          <span className="spinner-border spinner-border-sm me-2" /> Loading financials…
        </div>
      )}

      {err && !loading && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2" />
          {err}
        </div>
      )}

      {f && !loading && (
        <>
          <div className="panel mb-3" style={{ padding: 16 }}>
            <FundamentalsView f={f} />
          </div>

          <div className="grid-2 mb-3">
            <ConsensusPanel f={f} />
            <SentimentPanel f={f} />
          </div>

          <div className="mb-3">
            <RatiosGrid f={f} />
          </div>

          <div className="mb-3">
            <IncomeStatement
              quarterly={f.incomeStatementQuarterly}
              annual={f.incomeStatementAnnual}
            />
          </div>

          <div className="grid-2 mb-3">
            <BalanceSheet f={f} />
            <CashFlowChart data={f.cashflow} />
          </div>

          <div className="mb-3">
            <ShareholdingPattern
              data={shareholdingSegmentsFromHolders(f.majorHolders)}
              title="Shareholding Breakdown"
              subtitle="Live · Yahoo Finance"
              centerLabel="Total Holding"
            />
          </div>
        </>
      )}
    </div>
  );
}
