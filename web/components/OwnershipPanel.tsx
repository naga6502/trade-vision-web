import type { Fundamentals } from "@/lib/mcp";
import { fmt } from "@/lib/format";

export default function OwnershipPanel({ f }: { f: Fundamentals }) {
  const h = f.majorHolders;
  const insiders = h?.insidersPercentHeld ?? null;
  const inst = h?.institutionsPercentHeld ?? null;
  const retail =
    inst != null && insiders != null
      ? Math.max(0, Number((100 - inst - insiders).toFixed(1)))
      : null;
  const count = h?.institutionsCount ?? null;

  const segs: { label: string; value: number | null; color: string }[] = [
    { label: "Promoters / Insiders", value: insiders, color: "var(--accent)" },
    { label: "Institutions (FII + DII + MF)", value: inst, color: "var(--accent-2)" },
    { label: "Retail / Others", value: retail, color: "var(--surface-3)" },
  ];

  const has = segs.some((s) => s.value != null);

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="panel-title">
        <i className="bi bi-people" /> Shareholding Breakdown
        <span className="sub">Yahoo</span>
      </div>

      {!has ? (
        <div className="empty-note">No ownership data.</div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              height: 16,
              borderRadius: 8,
              overflow: "hidden",
              background: "var(--surface-2)",
            }}
          >
            {segs.map((s, i) =>
              s.value != null && s.value > 0 ? (
                <div
                  key={i}
                  title={`${s.label}: ${s.value.toFixed(1)}%`}
                  style={{ width: `${s.value}%`, background: s.color }}
                />
              ) : null,
            )}
          </div>

          <table className="table table-sm mono mb-0 mt-2">
            <tbody>
              {segs.map((s) => (
                <tr key={s.label}>
                  <td className="muted-text">
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: s.color,
                        marginRight: 8,
                      }}
                    />
                    {s.label}
                  </td>
                  <td className="text-end">{s.value != null ? `${s.value.toFixed(1)}%` : "—"}</td>
                </tr>
              ))}
              {count != null && (
                <tr>
                  <td className="muted-text">Institutional holders</td>
                  <td className="text-end">{fmt(count)}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="muted-text mt-2" style={{ fontSize: "0.7rem" }}>
            Insider vs institutional holding from Yahoo. The NSE/BSE-style FII / DII / Mutual Funds /
            Retail quarterly split is not available from any accessible free API.
          </div>
        </>
      )}
    </div>
  );
}
