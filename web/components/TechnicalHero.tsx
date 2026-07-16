"use client";

import type { Fundamentals, Technical } from "@/lib/mcp";
import { fmt, fmtPct, fmtCompact, dir, clsx } from "@/lib/format";

// Map the 5-tier machine verdict to a trader-friendly label + colour tier.
function verdictInfo(label: string): { friendly: string; cls: string } {
  switch (label) {
    case "STRONG BUY":
      return { friendly: "Very Bullish", cls: "vb" };
    case "BUY":
      return { friendly: "Bullish", cls: "bull" };
    case "SELL":
      return { friendly: "Bearish", cls: "bear" };
    case "STRONG SELL":
      return { friendly: "Very Bearish", cls: "vbr" };
    default:
      return { friendly: "Neutral", cls: "neut" };
  }
}

export default function TechnicalHero({
  f,
  tech,
}: {
  f: Fundamentals | null;
  tech: Technical | null;
}) {
  if (!f) return null;

  const price = f.price ?? 0;
  const prev = f.previousClose ?? 0;
  const change = price - prev;
  const pct = prev ? (change / prev) * 100 : 0;
  const d = dir(change);

  const low52 = f.fiftyTwoWeekLow ?? 0;
  const high52 = f.fiftyTwoWeekHigh ?? 0;
  const has52 = low52 > 0 && high52 > 0;
  const pos52 = has52 ? ((price - low52) / (high52 - low52)) * 100 : 50;

  const dayL = f.dayLow ?? 0;
  const dayH = f.dayHigh ?? 0;
  const hasDay = dayL > 0 && dayH > 0;
  const posDay = hasDay ? ((price - dayL) / (dayH - dayL)) * 100 : 50;

  const distHigh = high52 > 0 ? ((price - high52) / high52) * 100 : 0; // <0 = below high
  const distLow = low52 > 0 ? ((price - low52) / low52) * 100 : 0; // >0 = above low

  const sym = (f.ticker ?? "").replace(/\.NS$/, "");
  const name = f.name ?? sym;

  const volRatio =
    f.averageVolume && f.averageVolume > 0 ? (f.volume ?? 0) / f.averageVolume : null;

  const v = tech ? verdictInfo(tech.summary.label) : null;
  const total = tech ? tech.summary.buy + tech.summary.neutral + tech.summary.sell : 0;
  const buyPct = total ? (tech!.summary.buy / total) * 100 : 0;
  const neuPct = total ? (tech!.summary.neutral / total) * 100 : 0;
  const sellPct = total ? (tech!.summary.sell / total) * 100 : 0;

  return (
    <div className="panel mb-3" style={{ padding: 18 }}>
      {/* identity + last price */}
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h2 className="page-title mb-0">{sym}</h2>
            <span className="pill accent">NSE</span>
            <a
              className="pill"
              href={`https://www.bseindia.com/markets/equity/EQReports/MultipleEqSearch.aspx?column=N&text=${encodeURIComponent(
                name,
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              BSE <i className="bi bi-box-arrow-up-right" />
            </a>
          </div>
          <div className="muted-text mt-1" style={{ fontSize: "0.9rem" }}>
            {name} · National Stock Exchange
          </div>
        </div>
        <div className="text-end">
          <div
            className="mono"
            style={{ fontSize: "1.9rem", fontWeight: 700, lineHeight: 1 }}
          >
            ₹{fmt(price)}
          </div>
          <div
            className={clsx(
              "mono mt-1",
              d === "gain" ? "gain-text" : d === "loss" ? "loss-text" : "",
            )}
            style={{ fontWeight: 600 }}
          >
            {change >= 0 ? "+" : ""}
            {fmt(change)} ({fmtPct(pct)})
            <i
              className={`bi ms-1 ${change >= 0 ? "bi-arrow-up-right" : "bi-arrow-down-right"}`}
            />
          </div>
        </div>
      </div>

      {/* verdict + consensus meter */}
      {v && tech && (
        <div className="mt-3 d-flex flex-wrap align-items-center gap-3">
          <span className={clsx("verdict-badge", v.cls)}>
            {v.friendly}
            <span className="vsub">{tech.summary.label}</span>
          </span>
          <div style={{ minWidth: 200, flex: "1 1 220px" }}>
            <div className="gauge">
              <div className="buy" style={{ width: `${buyPct}%` }} />
              <div style={{ width: `${neuPct}%`, background: "#5a6072" }} />
              <div className="sell" style={{ width: `${sellPct}%` }} />
            </div>
            <div
              className="d-flex justify-content-between muted-text mt-1"
              style={{ fontSize: "0.7rem" }}
            >
              <span className="gain-text">{tech.summary.buy} Buy</span>
              <span>{tech.summary.neutral} Neutral</span>
              <span className="loss-text">{tech.summary.sell} Sell</span>
            </div>
          </div>
        </div>
      )}

      {/* today + 52-week ranges */}
      <div className="mt-3 grid-2" style={{ gap: "18px 28px" }}>
        <div>
          <div
            className="d-flex justify-content-between muted-text"
            style={{ fontSize: "0.72rem" }}
          >
            <span>TODAY LOW {dayL > 0 ? `₹${fmt(dayL)}` : "—"}</span>
            <span className="mono" style={{ color: "var(--ink)" }}>
              ₹{fmt(price)}
            </span>
            <span>TODAY HIGH {dayH > 0 ? `₹${fmt(dayH)}` : "—"}</span>
          </div>
          <div className="range-track">
            {hasDay && (
              <>
                <div className="range-fill" style={{ left: 0, right: `${100 - posDay}%` }} />
                <div className="range-marker" style={{ left: `${posDay}%` }} />
              </>
            )}
          </div>
        </div>
        <div>
          <div
            className="d-flex justify-content-between muted-text"
            style={{ fontSize: "0.72rem" }}
          >
            <span>52W LOW {low52 > 0 ? `₹${fmt(low52)}` : "—"}</span>
            <span className="mono" style={{ color: "var(--ink)" }}>
              {has52 ? `${pos52.toFixed(0)}% of range` : "—"}
            </span>
            <span>52W HIGH {high52 > 0 ? `₹${fmt(high52)}` : "—"}</span>
          </div>
          <div className="range-track">
            {has52 && (
              <>
                <div className="range-fill" style={{ left: 0, right: `${100 - pos52}%` }} />
                <div className="range-marker" style={{ left: `${pos52}%` }} />
              </>
            )}
          </div>
        </div>
      </div>

      {has52 && (
        <div className="d-flex gap-4 muted-text mt-2" style={{ fontSize: "0.74rem" }}>
          <span>
            vs 52W High:{" "}
            <span className={clsx(distHigh >= 0 ? "gain-text" : "loss-text")}>
              {fmtPct(distHigh)}
            </span>
          </span>
          <span>
            vs 52W Low:{" "}
            <span className={clsx(distLow >= 0 ? "gain-text" : "loss-text")}>
              {fmtPct(distLow)}
            </span>
          </span>
        </div>
      )}

      {/* key stats */}
      <div
        className="d-flex flex-wrap gap-4 mt-3"
        style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}
      >
        <div className="hero-stat">
          <div className="k">VOLUME</div>
          <div className="v">{fmtCompact(f.volume)}</div>
        </div>
        <div className="hero-stat">
          <div className="k">AVG VOL</div>
          <div className="v">{fmtCompact(f.averageVolume)}</div>
        </div>
        {volRatio != null && (
          <div className="hero-stat">
            <div className="k">VOL × AVG</div>
            <div className={clsx("v", volRatio >= 1.5 ? "gain-text" : "")}>
              {volRatio.toFixed(2)}×
            </div>
          </div>
        )}
        <div className="hero-stat">
          <div className="k">MKT CAP</div>
          <div className="v">{fmtCompact(f.marketCap)}</div>
        </div>
        <div className="hero-stat">
          <div className="k">P/E</div>
          <div className="v">{f.trailingPE != null ? fmt(f.trailingPE) : "—"}</div>
        </div>
        <div className="hero-stat">
          <div className="k">P/B</div>
          <div className="v">{f.priceToBook != null ? fmt(f.priceToBook) : "—"}</div>
        </div>
        <div className="hero-stat">
          <div className="k">EPS</div>
          <div className="v">{f.eps != null ? fmt(f.eps) : "—"}</div>
        </div>
        <div className="hero-stat">
          <div className="k">BETA</div>
          <div className="v">{f.beta != null ? fmt(f.beta) : "—"}</div>
        </div>
        <div className="hero-stat">
          <div className="k">DIV YLD</div>
          <div className="v">{f.dividendYield != null ? `${fmt(f.dividendYield)}%` : "—"}</div>
        </div>
      </div>
    </div>
  );
}
