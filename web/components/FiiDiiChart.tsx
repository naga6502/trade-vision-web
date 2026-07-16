"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { FiiDiiActivity } from "@/lib/mcp";

export default function FiiDiiChart({ data }: { data: FiiDiiActivity[] }) {
  const chartData = [...data]
    .reverse()
    .map((d) => ({ date: d.date, FII: d.fiiNetValue, DII: d.diiNetValue }));
  const latest = data[0];
  const fmt = (n: number) => (n >= 0 ? "+" : "") + n.toLocaleString("en-IN");

  return (
    <div className="card h-100">
      <div className="card-body">
        <div className="section-title">
          <i className="bi bi-cash-stack" /> FII / DII Net Flow (&#8377; Cr)
        </div>
        {latest && (
          <div className="mb-2 small">
            <span className={latest.fiiNetValue >= 0 ? "gain-text" : "loss-text"}>
              FII net: {fmt(latest.fiiNetValue)} Cr
            </span>
            {"  |  "}
            <span className={latest.diiNetValue >= 0 ? "gain-text" : "loss-text"}>
              DII net: {fmt(latest.diiNetValue)} Cr
            </span>
            <span className="text-muted"> ({latest.date})</span>
          </div>
        )}
        {chartData.length === 0 ? (
          <p className="text-muted">No data.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => `${Number(v).toLocaleString("en-IN")} Cr`} />
              <Legend />
              <Bar dataKey="FII" fill="#0d6efd" radius={[3, 3, 0, 0]} />
              <Bar dataKey="DII" fill="#fd7e14" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
