"use client";

import { useMemo, useState } from "react";
import type { BulkDeal } from "@/lib/mcp";
import { clsx } from "@/lib/format";

type SortKey = "symbol" | "quantity" | "price" | "date";
const COLS: { key: string; label: string; align?: "end"; sortable?: boolean }[] = [
  { key: "symbol", label: "Symbol", sortable: true },
  { key: "clientName", label: "Client" },
  { key: "dealType", label: "Type" },
  { key: "quantity", label: "Qty", align: "end", sortable: true },
  { key: "price", label: "Price", align: "end", sortable: true },
];

export default function BulkDealsTable({ deals }: { deals: BulkDeal[] }) {
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "quantity",
    dir: -1,
  });

  const filtered = deals.filter((d) =>
    d.symbol.toLowerCase().includes(filter.toLowerCase()),
  );

  const sorted = useMemo(() => {
    const getV = (d: BulkDeal): number | string =>
      sort.key === "quantity" || sort.key === "price"
        ? (d[sort.key] as number)
        : d[sort.key] ?? "";
    return [...filtered].sort((a, b) => {
      const va = getV(a);
      const vb = getV(b);
      let cmp = 0;
      if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb));
      return cmp * sort.dir;
    });
  }, [filtered, sort]);

  function toggle(key: SortKey) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === -1 ? 1 : -1 } : { key, dir: -1 },
    );
  }

  return (
    <div className="card h-100">
      <div className="card-body">
        <div className="section-title d-flex justify-content-between align-items-center">
          <span>
            <i className="bi bi-table" /> Bulk Deals
          </span>
          <span className="text-muted small">
            {sorted.length} of {deals.length}
          </span>
        </div>
        <div className="mb-2">
          <input
            className="form-control form-control-sm"
            placeholder="Filter by symbol..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="table-responsive" style={{ maxHeight: 380, overflowY: "auto" }}>
          <table className="table table-striped table-hover align-middle mb-0">
            <thead className="table-light sticky-top">
              <tr>
                {COLS.map((c) => {
                  const active = !!c.sortable && sort.key === c.key;
                  return (
                    <th
                      key={c.key}
                      className={clsx(
                        c.align === "end" ? "text-end" : "",
                        c.sortable && "th-sort",
                        active && "th-sorted",
                      )}
                      onClick={c.sortable ? () => toggle(c.key as SortKey) : undefined}
                      title={c.sortable ? `Sort by ${c.label}` : undefined}
                    >
                      {c.label}
                      {c.sortable && (
                        <span className="th-caret">
                          {active ? (sort.dir === -1 ? "▼" : "▲") : "⇅"}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.map((d, i) => (
                <tr key={i}>
                  <td>
                    <strong>{d.symbol}</strong>
                    <div className="text-muted small">{d.name}</div>
                  </td>
                  <td>{d.clientName}</td>
                  <td>
                    <span className={`badge ${d.dealType === "BUY" ? "bg-success" : "bg-danger"}`}>
                      {d.dealType}
                    </span>
                  </td>
                  <td className="text-end">{d.quantity.toLocaleString("en-IN")}</td>
                  <td className="text-end">
                    {d.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted">
                    No deals match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
