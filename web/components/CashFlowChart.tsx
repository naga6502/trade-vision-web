"use client";

import { memo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CashFlowYear } from "@/lib/mcp";

const COLORS = {
  operating: "#198754",
  investing: "#0d6efd",
  financing: "#dc3545",
  free: "#6f42c1",
};

function CashFlowChart({ data }: { data: CashFlowYear[] }) {
  if (!data || data.length === 0) {
    return <div className="text-muted small">Cash-flow data unavailable.</div>;
  }
  const rows = data.map((d) => ({
    year: d.fiscalDate.slice(0, 4),
    Operating: d.operating != null ? Number((d.operating / 1e7).toFixed(1)) : 0,
    Investing: d.investing != null ? Number((d.investing / 1e7).toFixed(1)) : 0,
    Financing: d.financing != null ? Number((d.financing / 1e7).toFixed(1)) : 0,
    "Free CF": d.freeCashFlow != null ? Number((d.freeCashFlow / 1e7).toFixed(1)) : 0,
  }));

  return (
    <div>
      <div className="section-title">
        <i className="bi bi-bar-chart" /> Cash Flow (₹ Cr)
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis tickFormatter={(v) => `₹${v}`} />
          <Tooltip formatter={(v: number) => [`₹${v} Cr`, ""]} />
          <Legend />
          <Bar dataKey="Operating" fill={COLORS.operating} />
          <Bar dataKey="Investing" fill={COLORS.investing} />
          <Bar dataKey="Financing" fill={COLORS.financing} />
          <Bar dataKey="Free CF" fill={COLORS.free} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Memoized so a parent re-render (e.g. the signal badge finishing
// its fetch) never reconciles this Recharts subtree.
export default memo(CashFlowChart);
