"use client";

import type { NewsItem, NewsResult } from "@/lib/news";
import { formatPublished } from "@/lib/format";

export type NewsScope = "stock" | "market";

export function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a
      className="news-row"
      href={item.url || "#"}
      target={item.url ? "_blank" : undefined}
      rel="noreferrer"
    >
      <div className="d-flex justify-content-between align-items-center mb-1">
        <span className="news-source">{item.source || "News"}</span>
        <span className="news-time">{formatPublished(item.published)}</span>
      </div>
      <div className="news-title">{item.title || "(untitled)"}</div>
      {item.summary && <div className="news-summary">{item.summary}</div>}
    </a>
  );
}

export function NewsBody({ data, scope }: { data: NewsResult | null; scope: NewsScope }) {
  if (!data) return null;

  const hasError = data.isError || !!data.error;
  if (hasError) {
    return (
      <div className="panel" style={{ padding: 20 }}>
        <div
          className="alert alert-warning mb-0"
          style={{ background: "transparent", border: "1px solid var(--border)" }}
        >
          <i className="bi bi-exclamation-triangle me-2" />
          Could not load news right now.
        </div>
        {data.error && (
          <div className="news-setup mt-3">
            <p className="mb-0">{data.error}</p>
          </div>
        )}
      </div>
    );
  }

  if (!data.items.length) {
    return (
      <div className="panel" style={{ padding: 20 }}>
        <div className="empty-note">
          {scope === "stock"
            ? `No recent news found for this symbol.`
            : `No recent market news available.`}
          {data.note ? ` (${data.note})` : ""}
        </div>
      </div>
    );
  }

  return (
    <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
      {data.items.map((item, i) => (
        <NewsCard key={`${item.url || item.title}-${i}`} item={item} />
      ))}
    </div>
  );
}
