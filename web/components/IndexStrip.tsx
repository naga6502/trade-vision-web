import type { NseIndex, GlobalIndex } from "@/lib/mcp";
import { fmt, fmtPct, dir, clsx } from "@/lib/format";

interface Tile {
  label: string;
  value: number;
  chg: number;
  pct: number;
}

function findIndex(indices: NseIndex[], name: string): NseIndex | undefined {
  return indices.find((i) => i.name.toUpperCase() === name.toUpperCase());
}

// Absolute change with an explicit sign (+/−), e.g. "+123.45" / "−67.89".
function signedChange(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${fmt(Math.abs(n))}`;
}

function Tile({ t }: { t: Tile }) {
  const d = dir(t.chg || t.pct);
  return (
    <div className="strip-tile">
      <div className="muted-text strip-label">{t.label}</div>
      <div className="mono strip-value">{fmt(t.value)}</div>
      <div className={clsx("mono strip-pct", d === "gain" ? "gain-text" : d === "loss" ? "loss-text" : "")}>
        {signedChange(t.chg)} ({fmtPct(t.pct)})
      </div>
    </div>
  );
}

export default function IndexStrip({
  indices,
  global,
}: {
  indices: NseIndex[];
  global: GlobalIndex[];
}) {
  const nifty = findIndex(indices, "NIFTY 50");
  const bank = findIndex(indices, "NIFTY BANK");
  const vix = findIndex(indices, "INDIA VIX");
  const sensex = global.find((g) => g.symbol === "^BSESN");

  const tiles: Tile[] = [];
  if (nifty) tiles.push({ label: "NIFTY 50", value: nifty.lastPrice, chg: nifty.variation, pct: nifty.percentChange });
  if (bank) tiles.push({ label: "BANKNIFTY", value: bank.lastPrice, chg: bank.variation, pct: bank.percentChange });
  if (sensex) tiles.push({ label: "SENSEX", value: sensex.price, chg: sensex.change, pct: sensex.changePercent });
  if (vix) tiles.push({ label: "INDIA VIX", value: vix.lastPrice, chg: vix.variation, pct: vix.percentChange });

  return (
    <div className="panel" style={{ padding: 14 }}>
      <div className="index-strip">
        {tiles.map((t) => (
          <Tile key={t.label} t={t} />
        ))}
      </div>
    </div>
  );
}
