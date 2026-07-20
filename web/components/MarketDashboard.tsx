"use client";

import { useState } from "react";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { fetchJson } from "@/lib/fetchJson";
import type {
  NseIndex,
  MarketStatusItem,
  FiiDiiActivity,
  NiftyMoversResult,
  GlobalIndex,
} from "@/lib/mcp";
import { setLastUpdated } from "@/lib/updatedStore";
import IndexStrip from "@/components/IndexStrip";
import GlobalMarkets from "@/components/GlobalMarkets";
import NiftyMovers from "@/components/NiftyMovers";
import SectorPerformance from "@/components/SectorPerformance";
import MarketStatusBadge from "@/components/MarketStatusBadge";
import FiiDiiChart from "@/components/FiiDiiChart";
import MarketScanners from "@/components/MarketScanners";

const EMPTY_MOVERS: NiftyMoversResult = {
  gainers: [],
  losers: [],
  asOf: "",
  fallbackWeights: false,
};

export default function MarketDashboard() {
  const [indices, setIndices] = useState<NseIndex[]>([]);
  const [movers, setMovers] = useState<NiftyMoversResult>(EMPTY_MOVERS);
  const [global, setGlobal] = useState<GlobalIndex[]>([]);
  const [status, setStatus] = useState<MarketStatusItem[]>([]);
  const [fiiDii, setFiiDii] = useState<FiiDiiActivity[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useAutoRefresh(
    () => {
      (async () => {
        try {
          const [ir, mr, gr, sr, dr] = await Promise.all([
            fetchJson<any>(`/api/nifty-indices`),
            fetchJson<any>(`/api/nifty-movers?limit=8`),
            fetchJson<any>(`/api/global-markets`),
            fetchJson<any>(`/api/market-status`),
            fetchJson<any>(`/api/fii-dii`),
          ]);
          setIndices(Array.isArray(ir) ? ir : []);
          setMovers(mr && !mr.error ? mr : EMPTY_MOVERS);
          setGlobal(Array.isArray(gr) ? gr : []);
          setStatus(Array.isArray(sr) ? sr : []);
          setFiiDii(Array.isArray(dr) ? dr : []);
          setLastUpdated(new Date());
          setLoading(false);
        } catch (e) {
          setErr(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      })();
    },
    [],
    10_000,
  );

  return (
    <div>
      <div className="d-flex align-items-center mb-3">
        <h1 className="page-title mb-0">Market Dashboard</h1>
        <span className="ms-auto">
          <MarketStatusBadge items={status} />
        </span>
      </div>

      {loading && (
        <div className="text-center text-muted py-5">
          <span className="spinner-border spinner-border-sm me-2" /> Loading markets…
        </div>
      )}

      {err && !loading && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2" />
          {err}
        </div>
      )}

      {!loading && !err && (
        <>
          <IndexStrip indices={indices} global={global} />

          <div className="grid-2 mt-3">
            <GlobalMarkets indices={global} />
            <NiftyMovers data={movers} />
          </div>

          <div className="mt-3">
            <SectorPerformance indices={indices} />
          </div>

          <div className="mt-3">
            <FiiDiiChart data={fiiDii} />
          </div>

          <div className="mt-3">
            <MarketScanners />
          </div>
        </>
      )}
    </div>
  );
}
