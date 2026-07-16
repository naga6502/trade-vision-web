"use client";

import { useState } from "react";
import Link from "next/link";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { useSyncExternalStore } from "react";
import { NewsBody } from "@/components/NewsFeed";
import { formatPublished } from "@/lib/format";
import type { NewsResult } from "@/lib/news";
import {
  getSelectedSymbol,
  subscribeSelected,
} from "@/lib/selectedStore";

interface Announcement {
  symbol: string;
  company: string;
  description: string;
  broadcastDateTime: string;
  pdfLink: string;
}

const DEFAULT_SYMBOL = "RELIANCE";

export default function MarketNewsPage() {
  const selected = useSyncExternalStore(
    subscribeSelected,
    getSelectedSymbol,
    getSelectedSymbol,
  );

  const [inputSym, setInputSym] = useState(selected || DEFAULT_SYMBOL);
  const [stockSym, setStockSym] = useState(selected || DEFAULT_SYMBOL);
  const [market, setMarket] = useState<NewsResult | null>(null);
  const [stock, setStock] = useState<NewsResult | null>(null);
  const [ann, setAnn] = useState<Announcement[] | null>(null);
  const [loading, setLoading] = useState(true);

  useAutoRefresh(
    () => {
      (async () => {
        try {
          const [mr, sr, ar] = await Promise.all([
            fetch(`/api/news?category=stocks&limit=25`).then((r) => r.json()),
            fetch(
              `/api/news?symbol=${encodeURIComponent(stockSym)}&category=stocks&limit=15`,
            ).then((r) => r.json()),
            fetch(`/api/announcements?limit=12`).then((r) => r.json()),
          ]);
          setMarket(mr);
          setStock(sr);
          setAnn(Array.isArray(ar) ? ar : []);
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
          setMarket(err);
          setStock({ ...err });
          setAnn([]);
          setLoading(false);
        }
      })();
    },
    [stockSym],
    60_000,
  );

  function applySym() {
    const s = inputSym.trim().toUpperCase().replace(/\.(NS|BO)$/, "");
    if (s) setStockSym(s);
  }

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h1 className="page-title mb-0">Market News</h1>
        <span className="pill accent">
          <i className="bi bi-globe2 me-1" /> Live
        </span>
        <span className="muted-text">
          Market, stock &amp; corporate-actions feed · via RSS + NSE
        </span>
        <Link href="/screener" className="btn btn-sm btn-terminal ms-auto">
          <i className="bi bi-filter-square me-1" /> Screeners
        </Link>
      </div>

      {/* Stock news selector */}
      <div className="panel mb-3" style={{ padding: 14 }}>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <i className="bi bi-newspaper text-accent" />
          <span className="fw-semibold" style={{ fontSize: "0.85rem" }}>
            Stock News
          </span>
          <input
            className="form-control form-control-sm"
            style={{ maxWidth: 180 }}
            placeholder="Symbol (e.g. RELIANCE)"
            value={inputSym}
            onChange={(e) => setInputSym(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySym()}
          />
          <button className="btn btn-sm btn-terminal" onClick={applySym}>
            <i className="bi bi-search me-1" /> Get
          </button>
          {selected && (
            <button
              className="btn btn-sm btn-terminal"
              onClick={() => {
                setInputSym(selected);
                setStockSym(selected);
              }}
            >
              <i className="bi bi-star-fill me-1" /> {selected}
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="text-center text-muted py-5">
          <span className="spinner-border spinner-border-sm me-2" /> Loading news…
        </div>
      )}

      {!loading && (
        <div className="grid-2" style={{ alignItems: "start" }}>
          {/* Market news */}
          <div>
            <div className="panel-title mb-2">
              <i className="bi bi-globe2" /> Market News
            </div>
            <NewsBody data={market} scope="market" />
          </div>

          {/* Stock news + announcements */}
          <div>
            <div className="panel-title mb-2">
              <i className="bi bi-newspaper" /> {stockSym} News
            </div>
            <NewsBody data={stock} scope="stock" />

            <div className="panel-title mb-2 mt-4">
              <i className="bi bi-megaphone" /> Corporate Announcements
            </div>
            {ann && ann.length === 0 ? (
              <div className="panel" style={{ padding: 20 }}>
                <div className="empty-note">No recent announcements.</div>
              </div>
            ) : (
              <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
                {(ann ?? []).map((a, i) => (
                  <a
                    key={`${a.symbol}-${i}`}
                    className="news-row"
                    href={a.pdfLink || "#"}
                    target={a.pdfLink ? "_blank" : undefined}
                    rel="noreferrer"
                  >
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="news-source">{a.symbol}</span>
                      <span className="news-time">
                        {a.broadcastDateTime
                          ? formatPublished(a.broadcastDateTime)
                          : ""}
                      </span>
                    </div>
                    <div className="news-title">{a.description || a.company}</div>
                    <div className="news-summary">{a.company}</div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
