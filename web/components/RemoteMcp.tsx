"use client";

import { useEffect, useMemo, useState } from "react";
import type { RemoteTool } from "@/lib/mcpClient";
import { fetchJson } from "@/lib/fetchJson";

interface PropMeta {
  key: string;
  type?: string;
  description?: string;
  enumValues?: string[];
  required: boolean;
}

function buildProps(tool?: RemoteTool): PropMeta[] {
  const props = tool?.inputSchema?.properties ?? {};
  const required = new Set(tool?.inputSchema?.required ?? []);
  return Object.entries(props).map(([key, p]) => ({
    key,
    type: p.type,
    description: p.description,
    enumValues: p.enum,
    required: required.has(key),
  }));
}

export default function RemoteMcp() {
  const [tools, setTools] = useState<RemoteTool[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RemoteTool | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [calling, setCalling] = useState(false);
  const [result, setResult] = useState<{ display: string; isError: boolean } | null>(null);
  const [callError, setCallError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<any>("/api/remote/list")
      .then((j) => {
        if (j.error) throw new Error(j.error);
        setTools(j.tools);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, []);

  const filtered = useMemo(() => {
    if (!tools) return [];
    const q = query.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q)
    );
  }, [tools, query]);

  function selectTool(t: RemoteTool) {
    setSelected(t);
    setValues({});
    setResult(null);
    setCallError(null);
  }

  function setValue(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function run() {
    if (!selected) return;
    setCalling(true);
    setCallError(null);
    setResult(null);
    const props = buildProps(selected);
    const args: Record<string, unknown> = {};
    for (const p of props) {
      const raw = values[p.key] ?? "";
      if (raw === "") continue; // omit empty optional args
      if (p.type === "number" || p.type === "integer") {
        const n = Number(raw);
        if (!Number.isNaN(n)) args[p.key] = n;
      } else if (p.type === "boolean") {
        args[p.key] = raw === "true";
      } else if (p.type === "array" || p.type === "object") {
        try {
          args[p.key] = JSON.parse(raw);
        } catch {
          args[p.key] = raw;
        }
      } else {
        args[p.key] = raw;
      }
    }
    try {
      const j = await fetchJson<any & { error?: string }>("/api/remote/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selected.name, args }),
      });
      if (j.error) throw new Error(j.error);
      setResult({ display: j.display, isError: j.isError });
    } catch (e) {
      setCallError(e instanceof Error ? e.message : String(e));
    } finally {
      setCalling(false);
    }
  }

  function copy() {
    if (result) navigator.clipboard?.writeText(result.display);
  }

  const props = buildProps(selected ?? undefined);

  return (
    <div className="row g-3">
      <div className="col-12 col-lg-4">
        <div className="card">
          <div className="card-body d-flex flex-column" style={{ height: "72vh" }}>
            <input
              className="form-control form-control-sm mb-2"
              placeholder="Search 49 tools..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="flex-grow-1 overflow-auto">
              {loadError && <div className="alert alert-danger py-2 small">{loadError}</div>}
              {!tools && !loadError && <div className="text-muted small p-2">Loading tools…</div>}
              {filtered.map((t) => (
                <button
                  key={t.name}
                  className={`list-group-item list-group-item-action text-start ${
                    selected?.name === t.name ? "active" : ""
                  }`}
                  onClick={() => selectTool(t)}
                >
                  <div className="fw-semibold small">{t.name}</div>
                  {t.description && (
                    <div className="small text-muted text-truncate">
                      {t.description.slice(0, 80)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="col-12 col-lg-8">
        {!selected && (
          <div className="card">
            <div className="card-body text-muted">
              Select a tool from the left to view its inputs and call it.
            </div>
          </div>
        )}
        {selected && (
          <div className="card">
            <div className="card-body">
              <div className="section-title">
                <i className="bi bi-plug" /> {selected.name}
              </div>
              {selected.description && (
                <p className="text-muted small">{selected.description}</p>
              )}

              {props.length === 0 && (
                <p className="text-muted small">This tool takes no arguments.</p>
              )}
              {props.map((p) => (
                <div className="mb-2" key={p.key}>
                  <label className="form-label small mb-1">
                    <code>{p.key}</code> {p.required && <span className="text-danger">*</span>}
                    {p.type && <span className="text-muted"> · {p.type}</span>}
                  </label>
                  {p.enumValues ? (
                    <select
                      className="form-select form-select-sm"
                      value={values[p.key] ?? ""}
                      onChange={(e) => setValue(p.key, e.target.value)}
                    >
                      <option value="">(none)</option>
                      {p.enumValues.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  ) : p.type === "boolean" ? (
                    <select
                      className="form-select form-select-sm"
                      value={values[p.key] ?? ""}
                      onChange={(e) => setValue(p.key, e.target.value)}
                    >
                      <option value="">(none)</option>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : p.type === "array" || p.type === "object" ? (
                    <textarea
                      className="form-control form-control-sm"
                      rows={2}
                      placeholder='JSON, e.g. {"symbol":"RELIANCE"}'
                      value={values[p.key] ?? ""}
                      onChange={(e) => setValue(p.key, e.target.value)}
                    />
                  ) : (
                    <input
                      className={`form-control form-control-sm ${
                        p.type === "number" || p.type === "integer" ? "w-25" : ""
                      }`}
                      type={p.type === "number" || p.type === "integer" ? "number" : "text"}
                      placeholder={p.description ?? ""}
                      value={values[p.key] ?? ""}
                      onChange={(e) => setValue(p.key, e.target.value)}
                    />
                  )}
                  {p.description &&
                    p.type !== "boolean" &&
                    p.type !== "array" &&
                    p.type !== "object" && (
                      <div className="form-text small">{p.description}</div>
                    )}
                </div>
              ))}

              <button className="btn btn-primary btn-sm mt-2" onClick={run} disabled={calling}>
                {calling ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : (
                  "Call tool"
                )}
              </button>

              {callError && (
                <div className="alert alert-danger mt-3 py-2 small">{callError}</div>
              )}
              {result && (
                <div className="mt-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className={`badge ${result.isError ? "bg-danger" : "bg-success"}`}>
                      {result.isError ? "Error" : "OK"}
                    </span>
                    <button className="btn btn-outline-secondary btn-sm" onClick={copy}>
                      <i className="bi bi-clipboard" /> Copy
                    </button>
                  </div>
                  <pre
                    className="bg-light border rounded p-2"
                    style={{ maxHeight: "40vh", overflow: "auto", fontSize: "0.8rem" }}
                  >
                    {result.display}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
