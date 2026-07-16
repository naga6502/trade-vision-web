"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { NseStock } from "@/lib/mcp";

function ChartCard({
  title,
  data,
  color,
  icon,
}: {
  title: string;
  data: NseStock[];
  color: string;
  icon: string;
}) {
  const chartData = data.map((d) => ({
    name: d.symbol,
    pct: Number(d.pChange.toFixed(2)),
  }));
  return (
    <div className="col-12 col-lg-6">
      <div className="card h-100">
        <div className="card-body">
          <div className="section-title">
            <i className={`bi ${icon}`} /> {title}
          </div>
          {chartData.length === 0 ? (
            <p className="text-muted">No data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 28 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  height={48}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [`${v}%`, "Change"]} />
                <Bar dataKey="pct" fill={color} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GainersLosersChart({
  gainers,
  losers,
}: {
  gainers: NseStock[];
  losers: NseStock[];
}) {
  return (
    <div className="row g-3">
      <ChartCard title="Top Gainers" data={gainers} color="#198754" icon="bi-graph-up" />
      <ChartCard title="Top Losers" data={losers} color="#dc3545" icon="bi-graph-down" />
    </div>
  );
}
