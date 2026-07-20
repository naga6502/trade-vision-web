"use client";

import { useState } from "react";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { fetchJson } from "@/lib/fetchJson";
import type { SectorTag } from "@/lib/sectors";
import ScreenerTable, { Col, SymCell } from "@/components/ScreenerTable";
import { fmt, fmtCompact, fmtPct, clsx } from "@/lib/format";

interface SectorRow {
  symbol: string;
  price: number;
  pe: number | null;
  marketCap: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  pos52: number | null;
  dividendYield: number | null;
  strength: number;
  tag: SectorTag;
}
interface SectorGroup {
  name: string;
  stocks: SectorRow[];
}
interface SectorData {
  sectors: SectorGroup[];
}

const sectorIcon = (name: string): string => {
  const map: Record<string, string> = {
    IT: "bi-cpu",
    Banks: "bi-bank",
    NBFC: "bi-cash-coin",
    Pharma: "bi-bandaid",
    Auto: "bi-car-front",
    FMCG: "bi-basket",
    "Energy & Oil/Gas": "bi-fuel-pump",
    "Metals & Mining": "bi-gem",
    Realty: "bi-building",
    Telecom: "bi-broadcast",
    "Consumer Durables": "bi-tv",
    "Infra & Cement": "bi-cone-striped",
    Chemicals: "bi-droplet",
  };
  return map[name] ?? "bi-collection";
};

function StrengthBadge({ strength, tag }: { strength: number; tag: SectorTag }) {
  const cls = tag === "Strong" ? "gain" : tag === "Moderate" ? "accent" : "loss";
  return (
    <span className={clsx("pill", cls)} style={{ fontWeight: 700 }}>
      {tag} {strength}
    </span>
  );
}

export default function SectorFundamentalsPage() {
  const [data, setData] = useState<SectorData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useAutoRefresh(() => {
    (async () => {
      try {
        const r = await fetchJson<any>("/api/sector-fundamentals");
        if (r.error) throw new Error(r.error);
        setData(r);
        setErr(null);
        setLoading(false);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
        setLoading(false);
      }
    })();
  }, []);

  const cols: Col[] = [
    {
      header: "SYM",
      cell: (r: SectorRow) => <SymCell symbol={r.symbol} />,
      sortValue: (r: SectorRow) => r.symbol,
    },
    {
      header: "PRICE",
      align: "end",
      cell: (r: SectorRow) => `₹${fmt(r.price)}`,
      sortValue: (r: SectorRow) => r.price,
    },
    {
      header: "PE",
      align: "end",
      cell: (r: SectorRow) => (r.pe != null ? fmt(r.pe) : "—"),
      sortValue: (r: SectorRow) => r.pe,
    },
    {
      header: "52W %",
      align: "end",
      cell: (r: SectorRow) => (
        <span className={clsx(r.pos52 != null && r.pos52 >= 50 ? "gain-text" : "muted-text")}>
          {r.pos52 != null ? `${r.pos52}%` : "—"}
        </span>
      ),
      sortValue: (r: SectorRow) => r.pos52,
    },
    {
      header: "MKT CAP",
      align: "end",
      cell: (r: SectorRow) => (r.marketCap != null ? `₹${fmtCompact(r.marketCap)}` : "—"),
      sortValue: (r: SectorRow) => r.marketCap,
    },
    {
      header: "DIV %",
      align: "end",
      cell: (r: SectorRow) => (r.dividendYield != null ? fmtPct(r.dividendYield, false) : "—"),
      sortValue: (r: SectorRow) => r.dividendYield,
    },
    {
      header: "STRENGTH",
      align: "end",
      cell: (r: SectorRow) => <StrengthBadge strength={r.strength} tag={r.tag} />,
      sortValue: (r: SectorRow) => r.strength,
    },
  ];

  return (
    <div>
      <div className="d-flex align-items-center mb-3">
        <h1 className="page-title mb-0">Sector Fundamentals</h1>
        <span className="pill accent ms-3">Strength scan</span>
      </div>
      <p className="muted-text" style={{ fontSize: "0.85rem", marginTop: -4 }}>
        Fundamentally strong stocks per sector, scored on valuation (PE), 52-week performance,
        size and dividend yield. Universe is a curated list of major NSE names — a scanner,
        not investment advice.
      </p>

      {loading && (
        <div className="text-center text-muted py-5">
          <span className="spinner-border spinner-border-sm me-2" /> Scanning sectors…
        </div>
      )}
      {err && !loading && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2" />
          {err}
        </div>
      )}

      {data && !loading && (
        <div>
          {data.sectors.map((sec) => (
            <div key={sec.name} className="mb-3">
              <ScreenerTable
                title={sec.name}
                icon={sectorIcon(sec.name)}
                cols={cols}
                rows={sec.stocks}
                emptyText="No data for this sector."
                defaultSort={{ col: 4, dir: -1 }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
