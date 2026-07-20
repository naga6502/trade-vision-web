"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/fetchJson";

interface ToolInfo {
  name: string;
  description?: string;
}
interface CallResult {
  isError: boolean;
  display: string;
  error?: string;
}

// Curated set auto-run for the symbol.
const AUT0 = [
  "get_company_profile",
  "get_quant_signal",
  "get_forecasts",
  "get_stock_quote",
  "get_stock_events",
];

function CallCard({
  name,
  result,
}: {
  name: string;
  result: CallResult | "loading" | null | undefined;
}) {
  if (result === "loading") {
    return (
      <div className="card mb-2">
        <div className="card-body small text-muted">
          <span className="spinner-border spinner-border-sm me-2" />
          {name}…
        </div>
      </div>
    );
  }
  if (!result) return null;
  if (result.isError) {
    return (
      <div className="card mb-2 border-danger">
        <div className="card-body small text-danger">
          {name} failed: {result.error}
        </div>
      </div>
    );
  }
  return (
    <div className="card mb-2">
      <div className="card-body small">
        <div className="fw-semibold mb-1">{name}</div>
        <pre
          style={{ whiteSpace: "pre-wrap", fontSize: "0.78rem", margin: 0 }}
        >
          {result.display}
        </pre>
      </div>
    </div>
  );
}

export default function RemoteInsights({ symbol }: { symbol: string }) {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [results, setResults] = useState<
    Record<string, CallResult | "loading">
  >({});
  const [selected, setSelected] = useState("");
  const [args, setArgs] = useState(() =>
    JSON.stringify({ symbol }, null, 2)
  );
  const [custom, setCustom] = useState<CallResult | "loading" | null>(null);

  useEffect(() => {
    fetchJson<any>("/api/remote/list")
      .then((j) => setTools(j.tools || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    const s = symbol.toUpperCase();
    setResults({});
    AUT0.forEach(async (name) => {
      setResults((prev) => ({ ...prev, [name]: "loading" }));
      try {
        const r = await fetchJson<any>("/api/remote/call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, args: { symbol: s } }),
        });
        if (alive) setResults((prev) => ({ ...prev, [name]: r }));
      } catch (e) {
        if (alive)
          setResults((prev) => ({
            ...prev,
            [name]: { isError: true, display: "", error: String(e) },
          }));
      }
    });
    return () => {
      alive = false;
    };
  }, [symbol]);

  async function runCustom() {
    if (!selected) return;
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(args);
    } catch {
      setCustom({ isError: true, display: "", error: "args is not valid JSON" });
      return;
    }
    setCustom("loading");
    try {
      const r = await fetchJson<any>("/api/remote/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selected, args: parsed }),
      });
      setCustom(r);
    } catch (e) {
      setCustom({ isError: true, display: "", error: String(e) });
    }
  }

  return (
    <div>
      <div className="section-title">
        <i className="bi bi-plug" /> Remote MCP (Tapetide) — {symbol}
      </div>
      <div className="text-muted small mb-2">
        Fundamentals, analyst forecasts, and Tapetide&apos;s quant BUY/SELL
        signal for this symbol, pulled live from the connected remote MCP
        server.
      </div>

      {AUT0.map((name) => (
        <CallCard key={name} name={name} result={results[name]} />
      ))}

      <details className="mt-2">
        <summary className="small" style={{ cursor: "pointer" }}>
          Run any remote tool for this symbol
        </summary>
        <div className="row g-2 mt-1 align-items-end">
          <div className="col-12 col-md-5">
            <label className="small text-muted">Tool</label>
            <select
              className="form-select form-select-sm"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">— select —</option>
              {tools.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-5">
            <label className="small text-muted">Args (JSON)</label>
            <textarea
              className="form-control form-control-sm"
              rows={2}
              value={args}
              onChange={(e) => setArgs(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-2">
            <button
              className="btn btn-sm btn-primary w-100"
              onClick={runCustom}
              disabled={!selected}
            >
              Run
            </button>
          </div>
        </div>
        {custom && custom !== "loading" && (
          <pre
            className="bg-light border rounded p-2 mt-2 small"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {custom.isError ? custom.error : custom.display}
          </pre>
        )}
        {custom === "loading" && (
          <div className="small text-muted mt-2">
            <span className="spinner-border spinner-border-sm me-2" />
            Running…
          </div>
        )}
      </details>
    </div>
  );
}
