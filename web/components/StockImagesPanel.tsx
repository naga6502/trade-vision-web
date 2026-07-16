"use client";

import { useState } from "react";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import type { StockImagesResult } from "@/lib/mcp";

const TYPE_ICON: Record<string, string> = {
  candlestick: "bi-candle-stick",
  iv_surface: "bi-radar",
  options_flow: "bi-diagram-3",
};

export default function StockImagesPanel({
  symbol,
  data,
}: {
  symbol: string;
  data?: StockImagesResult | null;
}) {
  const [d, setD] = useState<StockImagesResult | null>(data ?? null);
  const [loading, setLoading] = useState(!data);

  useAutoRefresh(
    () => {
      if (data) return;
      fetch(`/api/stock-images?symbol=${encodeURIComponent(symbol)}`)
        .then((r) => r.json())
        .then((j) => {
          setD(j.error ? null : j);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    },
    [symbol],
    5 * 60_000,
  );

  if (data && data !== d) setD(data);

  if (loading)
    return (
      <div className="panel" style={{ padding: 16 }}>
        <div className="panel-title">
          <i className="bi bi-image" /> Charts (SVG)
        </div>
        <div className="text-center text-muted py-3">
          <span className="spinner-border spinner-border-sm" />
        </div>
      </div>
    );

  if (!d || !d.charts?.length)
    return (
      <div className="panel" style={{ padding: 16 }}>
        <div className="panel-title">
          <i className="bi bi-image" /> Charts (SVG)
        </div>
        <div className="empty-note">No charts generated.</div>
      </div>
    );

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="panel-title">
        <i className="bi bi-image" /> Charts (SVG) · {d.symbol}
      </div>
      <div className="d-flex flex-column gap-3">
        {d.charts.map((c, i) => (
          <div key={i} className="border rounded" style={{ borderColor: "var(--surface-3)", padding: 8 }}>
            <div className="muted-text small mb-1">
              <i className={`bi ${TYPE_ICON[c.type] ?? "bi-image"} me-1`} />
              {c.title}
            </div>
            <div
              className="svg-host"
              style={{ overflowX: "auto" }}
              dangerouslySetInnerHTML={{ __html: c.svg }}
            />
          </div>
        ))}
      </div>
      {d.notes?.length > 0 && (
        <div className="muted-text mt-2" style={{ fontSize: "0.7rem" }}>
          {d.notes.map((n, i) => (
            <div key={i}>• {n}</div>
          ))}
        </div>
      )}
    </div>
  );
}
