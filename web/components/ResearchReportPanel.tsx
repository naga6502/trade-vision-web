"use client";

import { Fragment, useState, type ReactNode } from "react";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import type { ResearchReport } from "@/lib/mcp";
import QuantDisclaimer from "@/components/QuantDisclaimer";

// Minimal, safe line-based markdown renderer (no dangerouslySetInnerHTML).
function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    ),
  );
}

function renderMarkdown(md: string): ReactNode {
  const lines = md.split("\n");
  const out: ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;

  const flush = () => {
    if (bullets.length) {
      out.push(
        <ul key={`ul-${key++}`} className="ps-3 mb-2">
          {bullets.map((b, i) => (
            <li key={i}>{inline(b)}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("### ")) {
      flush();
      out.push(<h5 key={`h-${key++}`} style={{ marginTop: 12 }}>{inline(line.slice(4))}</h5>);
    } else if (line.startsWith("## ")) {
      flush();
      out.push(<h4 key={`h-${key++}`} style={{ marginTop: 14 }}>{inline(line.slice(3))}</h4>);
    } else if (line.startsWith("# ")) {
      flush();
      out.push(<h3 key={`h-${key++}`} style={{ marginTop: 14 }}>{inline(line.slice(2))}</h3>);
    } else if (line.startsWith("- ")) {
      bullets.push(line.slice(2));
    } else if (line === "") {
      flush();
    } else {
      flush();
      out.push(<p key={`p-${key++}`} style={{ marginBottom: 8 }}>{inline(line)}</p>);
    }
  }
  flush();
  return out;
}

export default function ResearchReportPanel({
  symbol,
  data,
}: {
  symbol: string;
  data?: ResearchReport | null;
}) {
  const [d, setD] = useState<ResearchReport | null>(data ?? null);
  const [loading, setLoading] = useState(!data);

  useAutoRefresh(
    () => {
      if (data) return;
      fetch(`/api/research?symbol=${encodeURIComponent(symbol)}`)
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
          <i className="bi bi-file-earmark-text" /> Research Report
        </div>
        <div className="text-center text-muted py-3">
          <span className="spinner-border spinner-border-sm" />
        </div>
      </div>
    );

  if (!d)
    return (
      <div className="panel" style={{ padding: 16 }}>
        <div className="panel-title">
          <i className="bi bi-file-earmark-text" /> Research Report
        </div>
        <div className="empty-note">No report available.</div>
      </div>
    );

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="panel-title">
        <i className="bi bi-file-earmark-text" /> Research Report · {d.symbol}
      </div>
      <div style={{ fontSize: "0.9rem", lineHeight: 1.55 }}>{renderMarkdown(d.report)}</div>
      <QuantDisclaimer />
    </div>
  );
}
