"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { NewsResult } from "@/lib/news";
import { NewsBody } from "@/components/NewsFeed";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { fetchJson } from "@/lib/fetchJson";

type Tab = "stock" | "market";

export default function NewsPage() {
  const params = useParams();
  const raw = String(params.symbol ?? "RELIANCE").toUpperCase();
  const symbol = raw.replace(/\.(NS|BO)$/, "");

  const [tab, setTab] = useState<Tab>("stock");
  const [stock, setStock] = useState<NewsResult | null>(null);
  const [market, setMarket] = useState<NewsResult | null>(null);
  const [loading, setLoading] = useState(true);

  const didInit = useRef(false);
  useAutoRefresh(
    () => {
      const first = !didInit.current;
      didInit.current = true;
      (async () => {
        try {
          if (first) setLoading(true);
          const [sr, mr] = await Promise.all([
            fetchJson<any>(`/api/news?symbol=${encodeURIComponent(symbol)}&category=stocks&limit=15`),
            fetchJson<any>(`/api/news?category=stocks&limit=20`),
          ]);
          setStock(sr);
          setMarket(mr);
          setLoading(false);
        } catch (e) {
          const err: NewsResult = {
            items: [],
            count: 0,
            provider: "",
            symbol: null,
            category: "stocks",
            isError: true,
            error: String(e),
          };
          setStock({ ...err, symbol });
          setMarket(err);
          setLoading(false);
        }
      })();
    },
    [symbol],
    10_000,
  );

  const data = tab === "stock" ? stock : market;

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h1 className="page-title mb-0">{symbol}</h1>
        <span className="pill accent">News</span>
        <div className="ms-auto d-flex gap-2">
          <Link href={`/stock/${symbol}`} className="btn btn-sm btn-terminal">
            <i className="bi bi-speedometer2 me-1" /> Market Intel
          </Link>
          <Link href={`/stock/${symbol}/technical`} className="btn btn-sm btn-terminal">
            <i className="bi bi-activity me-1" /> Technical
          </Link>
          <Link href={`/stock/${symbol}/financials`} className="btn btn-sm btn-terminal">
            <i className="bi bi-clipboard-data me-1" /> Financials
          </Link>
        </div>
      </div>

      <div className="news-tabs">
        <button
          className={`news-tab ${tab === "stock" ? "active" : ""}`}
          onClick={() => setTab("stock")}
        >
          <i className="bi bi-newspaper me-1" /> Stock News
        </button>
        <button
          className={`news-tab ${tab === "market" ? "active" : ""}`}
          onClick={() => setTab("market")}
        >
          <i className="bi bi-globe2 me-1" /> Market News
        </button>
      </div>

      {loading && (
        <div className="text-center text-muted py-5">
          <span className="spinner-border spinner-border-sm me-2" /> Loading news…
        </div>
      )}

      {!loading && data && <NewsBody data={data} scope={tab} />}
    </div>
  );
}
