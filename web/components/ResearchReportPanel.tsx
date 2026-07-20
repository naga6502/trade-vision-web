"use client";

import { Fragment, useState, type ReactNode } from "react";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { fetchJson } from "@/lib/fetchJson";
import type { ResearchReport } from "@/lib/mcp";
import QuantDisclaimer from "@/components/QuantDisclaimer";

// Minimal, safe inline markdown renderer (no dangerouslySetInnerHTML).
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

function verdictClass(sig: string): string {
  const s = sig.toUpperCase();
  if (s.includes("STRONG BUY")) return "vb";
  if (s === "BUY") return "bull";
  if (s === "SELL") return "bear";
  if (s.includes("STRONG SELL")) return "vbr";
  return "neut";
}

// Structured renderer: title + ticker pill, section dividers, key/value
// bullets grouped into a stat grid, and the verdict line as a badge callout.
function renderMarkdown(md: string): ReactNode {
  const lines = md.split("\n");
  const out: ReactNode[] = [];
  let key = 0;
  let kv: { label: string; value: string }[] = [];
  let lis: string[] = [];

  const flushKv = () => {
    if (kv.length) {
      out.push(
        <div key={`kv-${key++}`} className="rr-kvgrid">
          {kv.map((r, i) => (
            <div key={i} className="rr-stat">
              <div className="rr-stat-k">{inline(r.label)}</div>
              <div className="rr-stat-v">{inline(r.value)}</div>
            </div>
          ))}
        </div>,
      );
      kv = [];
    }
  };
  const flushLis = () => {
    if (lis.length) {
      out.push(
        <ul key={`ul-${key++}`} className="rr-ul">
          {lis.map((b, i) => (
            <li key={i} className="rr-li">
              {inline(b)}
            </li>
          ))}
        </ul>,
      );
      lis = [];
    }
  };
  const flush = () => {
    flushKv();
    flushLis();
  };

  const kvMatch = (line: string) => {
    const m = line.match(/^-\s+\*\*(.+?)\*\*\s*:?\s*(.*)$/);
    return m ? { label: m[1], value: m[2] } : null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("### ")) {
      flush();
      out.push(
        <div key={`sub-${key++}`} className="rr-subsection">
          {inline(line.slice(4))}
        </div>,
      );
    } else if (line.startsWith("## ")) {
      flush();
      out.push(
        <div key={`sec-${key++}`} className="rr-section">
          <span>{inline(line.slice(3))}</span>
        </div>,
      );
    } else if (line.startsWith("# ")) {
      flush();
      const t = line.slice(2);
      const m = t.match(/^(.+?)\s*\(([^)]+)\)$/);
      out.push(
        <div key={`t-${key++}`} className="rr-title">
          <span>{inline(m ? m[1] : t)}</span>
          {m && <span className="rr-ticker">{m[2]}</span>}
        </div>,
      );
    } else if (line.startsWith("- ")) {
      const row = kvMatch(line);
      if (row) {
        flushLis();
        kv.push(row);
      } else {
        flushKv();
        lis.push(line.slice(2));
      }
    } else if (line === "") {
      flush();
    } else if (line.startsWith("**")) {
      flush();
      const m = line.match(/^\*\*(.+?)\*\*\s*(.*)$/);
      if (m) {
        out.push(
          <div key={`v-${key++}`} className="rr-verdict">
            <span className={`verdict-badge ${verdictClass(m[1])}`}>
              {m[1]}
            </span>
            <span className="rr-verdict-text">{inline(m[2])}</span>
          </div>,
        );
      } else {
        out.push(
          <p key={`p-${key++}`} className="rr-p">
            {inline(line)}
          </p>,
        );
      }
    } else {
      flush();
      out.push(
        <p key={`p-${key++}`} className="rr-p">
          {inline(line)}
        </p>,
      );
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
      fetchJson<any>(`/api/research?symbol=${encodeURIComponent(symbol)}`)
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
        <i className="bi bi-file-earmark-text" /> Research Report
        <span className="sub">AI-synthesised · not advice</span>
      </div>
      <div className="rr-body">{renderMarkdown(d.report)}</div>
      <QuantDisclaimer />
    </div>
  );
}
