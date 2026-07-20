"use client";

import { useState } from "react";
import Link from "next/link";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { fetchJson } from "@/lib/fetchJson";
import type { OptionChain, OptionPressure, IvRadar } from "@/lib/mcp";
import ScreenerTable, { Col } from "@/components/ScreenerTable";
import StatCard from "@/components/StatCard";
import OptionPressurePanel from "@/components/OptionPressurePanel";
import IvRadarPanel from "@/components/IvRadarPanel";
import { fmt, fmtPct, clsx } from "@/lib/format";

export default function OptionsPage() {
  const [symbol, setSymbol] = useState("RELIANCE");
  const [expiry, setExpiry] = useState<string>("");
  const [chain, setChain] = useState<OptionChain | null>(null);
  const [expiries, setExpiries] = useState<string[]>([]);
  const [lots, setLots] = useState<number | null>(null);
  const [pressure, setPressure] = useState<OptionPressure | null>(null);
  const [iv, setIv] = useState<IvRadar | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = (sym: string, exp: string) => {
    const q = `/api/options?symbol=${encodeURIComponent(sym)}${exp ? `&expiry=${encodeURIComponent(exp)}` : ""}`;
    Promise.all([
      fetchJson<any>(q),
      fetchJson<any>(`/api/options?symbol=${encodeURIComponent(sym)}`),
      fetchJson<any>(`/api/options/pressure?symbol=${encodeURIComponent(sym)}${exp ? `&expiry=${encodeURIComponent(exp)}` : ""}`),
      fetchJson<any>(`/api/options/iv?symbol=${encodeURIComponent(sym)}${exp ? `&expiry=${encodeURIComponent(exp)}` : ""}`),
    ])
      .then(([main, all, pres, ivr]) => {
        if (main.error) throw new Error(main.error);
        setChain(main.chain);
        setExpiries(all.expiries ?? []);
        setLots(all.lots ?? null);
        setPressure(pres.error ? null : pres);
        setIv(ivr.error ? null : ivr);
        setErr(null);
        setLoading(false);
      })
      .catch((e) => {
        setErr(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  };

  useAutoRefresh(() => load(symbol, expiry), [symbol, expiry], 30_000);

  const s = chain?.summary;
  const underlying = chain?.underlying ?? 0;
  const atm =
    underlying > 0 && chain
      ? chain.strikes.reduce((p, c) =>
          Math.abs(c.strikePrice - underlying) < Math.abs(p.strikePrice - underlying) ? c : p,
        ).strikePrice
      : 0;

  const cols: Col[] = [
    {
      header: "STRIKE",
      cell: (r: any) => (
        <span
          className={clsx("fw-semibold", r.strikePrice === atm ? "accent-text" : "")}
          style={{ color: r.strikePrice === atm ? "var(--accent)" : "var(--ink)" }}
        >
          {fmt(r.strikePrice, 0)}
          {r.strikePrice === atm && <span className="ms-1 small text-muted">ATM</span>}
        </span>
      ),
      sortValue: (r: any) => r.strikePrice,
    },
    {
      header: "CE OI",
      align: "end",
      cell: (r: any) => fmt(r.ce?.openInterest ?? 0, 0),
      sortValue: (r: any) => r.ce?.openInterest ?? 0,
    },
    {
      header: "CE LTP",
      align: "end",
      cell: (r: any) => (r.ce ? fmt(r.ce.lastPrice) : "—"),
      sortValue: (r: any) => r.ce?.lastPrice ?? 0,
    },
    {
      header: "PE OI",
      align: "end",
      cell: (r: any) => fmt(r.pe?.openInterest ?? 0, 0),
      sortValue: (r: any) => r.pe?.openInterest ?? 0,
    },
    {
      header: "PE LTP",
      align: "end",
      cell: (r: any) => (r.pe ? fmt(r.pe.lastPrice) : "—"),
      sortValue: (r: any) => r.pe?.lastPrice ?? 0,
    },
  ];

  return (
    <div>
      <div className="d-flex align-items-center mb-3 flex-wrap gap-2">
        <h1 className="page-title mb-0">Options &amp; F&amp;O</h1>
        <span className="pill accent ms-1">Max Pain · PCR · OI</span>
      </div>

      <div className="panel mb-3" style={{ padding: 14 }}>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <input
            className="form-control"
            style={{ maxWidth: 200 }}
            placeholder="NSE symbol (e.g. RELIANCE)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && load(symbol, expiry)}
          />
          <select
            className="form-select"
            style={{ maxWidth: 200 }}
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          >
            <option value="">Nearest expiry</option>
            {expiries.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <button className="btn btn-sm btn-accent" onClick={() => load(symbol, expiry)}>
            Load
          </button>
          {lots != null && (
            <span className="muted-text small">Lot size: {fmt(lots, 0)}</span>
          )}
        </div>
      </div>

      {loading && (
        <div className="text-center text-muted py-5">
          <span className="spinner-border spinner-border-sm me-2" /> Loading chain…
        </div>
      )}
      {err && !loading && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2" />
          {err}
        </div>
      )}

      {!loading && !err && chain && (
        <>
          <div className="grid-4 mb-3">
            <StatCard icon="bi-activity" label="Underlying" value={underlying ? `₹${fmt(underlying)}` : "—"} />
            <StatCard
              icon="bi-crosshair"
              label="Max Pain"
              value={s?.maxPain != null ? `₹${fmt(s.maxPain, 0)}` : "—"}
              sub={atm ? `ATM ₹${fmt(atm, 0)}` : undefined}
            />
            <StatCard
              icon="bi-pie-chart"
              label="PCR (PE/CE OI)"
              value={s?.pcr != null ? fmt(s.pcr, 2) : "—"}
              sub={s?.pcr != null ? (s.pcr > 1 ? "put-heavy" : "call-heavy") : undefined}
            />
            <StatCard
              icon="bi-bar-chart"
              label="Total OI"
              value={s?.totalOI != null ? fmt(s.totalOI, 0) : "—"}
              sub={`CE ${fmt(s?.totalCE ?? 0, 0)} / PE ${fmt(s?.totalPE ?? 0, 0)}`}
            />
          </div>

          <div className="grid-2 mb-3">
            <OptionPressurePanel symbol={symbol} expiry={expiry} data={pressure} />
            <IvRadarPanel symbol={symbol} expiry={expiry} data={iv} />
          </div>

          {chain.strikes.length === 0 ? (
            <div className="empty-note">
              No option-chain data. NSE can return an empty body for programmatic
              option-chain access (it needs browser-like headers + cookie priming).
              Verify the fetch in <code>src/options/optionChain.ts</code> on your machine.
            </div>
          ) : (
            <ScreenerTable
              title={`Option Chain ${chain.symbol}`}
              icon="bi-diagram-3"
              cols={cols}
              rows={chain.strikes as any[]}
              emptyText="No strikes."
              defaultSort={{ col: 0, dir: 1 }}
            />
          )}
        </>
      )}
    </div>
  );
}
