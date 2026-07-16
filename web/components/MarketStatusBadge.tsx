import type { MarketStatusItem } from "@/lib/mcp";
import { fmtPct, dir, clsx, marketOpenIST } from "@/lib/format";

export default function MarketStatusBadge({
  items,
}: {
  items: MarketStatusItem[];
}) {
  const item = items?.[0];
  if (!item) {
    return <span className="pill" style={{ borderColor: "var(--border)" }}>Market —</span>;
  }

  // Derive open/closed from the current IST time. NSE's own status field is
  // stale (often stuck on "Open" after close), so we only trust it when it
  // reports closed (e.g. a trading holiday) — otherwise the time check wins.
  const timeOpen = marketOpenIST();
  const nseClosed = /close/i.test(item.marketStatus);
  const open = timeOpen && !nseClosed;

  const color = open ? "var(--gain)" : "var(--muted)";
  const d = dir(item.percentChange);

  return (
    <span
      className="pill"
      style={{ color, borderColor: color, display: "inline-flex", alignItems: "center", gap: 6 }}
      title={`${item.market} · ${item.marketStatusMessage || item.marketStatus} · ${item.tradeDate || ""}`}
    >
      <span
        className="status-dot"
        style={{ background: color, width: 8, height: 8, borderRadius: "50%", display: "inline-block" }}
      />
      {open ? "Open" : "Closed"}
      {item.percentChange !== 0 && (
        <span className={clsx("mono", d === "gain" ? "gain-text" : d === "loss" ? "loss-text" : "")}>
          {fmtPct(item.percentChange)}
        </span>
      )}
    </span>
  );
}
