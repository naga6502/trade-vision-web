import Link from "next/link";
import { useMemo, useState } from "react";

export interface Col {
  header: string;
  align?: "end";
  cell: (row: any) => React.ReactNode;
  // When present the column becomes sortable. Numbers sort numerically,
  // strings alphabetically. Return null to sort a row to the bottom.
  sortValue?: (row: any) => number | string | null;
}

export interface SortState {
  col: number;
  dir: 1 | -1;
}

export default function ScreenerTable({
  title,
  icon,
  cols,
  rows,
  emptyText = "No data.",
  full = false,
  defaultSort,
}: {
  title: string;
  icon: string;
  cols: Col[];
  rows: any[];
  emptyText?: string;
  full?: boolean;
  defaultSort?: SortState;
}) {
  const [sort, setSort] = useState<SortState | null>(defaultSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const getV = cols[sort.col]?.sortValue;
    if (!getV) return rows;
    const dir = sort.dir;
    return [...rows].sort((a, b) => {
      const va = getV(a);
      const vb = getV(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      let cmp = 0;
      if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb));
      return cmp * dir;
    });
  }, [rows, sort, cols]);

  function toggle(col: number) {
    setSort((s) => {
      if (!s || s.col !== col) return { col, dir: -1 }; // first click: largest first
      if (s.dir === -1) return { col, dir: 1 };
      return null; // third click clears sort
    });
  }

  return (
    <div
      className="panel"
      style={{ padding: 16, ...(full ? { gridColumn: "1 / -1" } : {}) }}
    >
      <div className="panel-title">
        <i className={`bi ${icon}`} /> {title}
        <span className="sub">{rows.length}</span>
        {sort && (
          <span className="sort-chip">
            sorted: {cols[sort.col].header} {sort.dir === -1 ? "▼" : "▲"}
          </span>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="empty-note">{emptyText}</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm mono mb-0">
            <thead>
              <tr>
                {cols.map((c, i) => {
                  const sortable = !!c.sortValue;
                  const active = sort?.col === i;
                  return (
                    <th
                      key={i}
                      className={[
                        c.align === "end" ? "text-end" : "",
                        sortable ? "th-sort" : "",
                        active ? "th-sorted" : "",
                      ].join(" ")}
                      onClick={sortable ? () => toggle(i) : undefined}
                      title={sortable ? `Sort by ${c.header}` : undefined}
                    >
                      {c.header}
                      {sortable && (
                        <span className="th-caret">
                          {active ? (sort!.dir === -1 ? "▼" : "▲") : "⇅"}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={i}>
                  {cols.map((c, j) => (
                    <td key={j} className={c.align === "end" ? "text-end" : ""}>
                      {c.cell(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function SymCell({
  symbol,
  href,
  className,
}: {
  symbol: string;
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href ?? `/stock/${symbol}`}
      className={`fw-semibold${className ? ` ${className}` : ""}`}
      style={{ color: "var(--ink)" }}
    >
      {symbol}
    </Link>
  );
}
