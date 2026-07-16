import type { MajorHolders } from "@/lib/mcp";
import styles from "./ShareholdingPattern.module.css";

export interface ShareholderSegment {
  key: string;
  label: string;
  pct: number;
  from: string; // gradient highlight (top of segment)
  to: string; // gradient shade (bottom of segment)
  trend?: number; // % change vs previous period, if known
}

// Default ownership breakdown (used only when no live data is supplied).
const DEFAULT_DATA: ShareholderSegment[] = [
  { key: "prom", label: "Promoters", pct: 52.35, from: "#34d399", to: "#059669", trend: 0.42 },
  { key: "fii", label: "FIIs", pct: 18.2, from: "#60a5fa", to: "#2563eb", trend: 1.1 },
  { key: "dii", label: "DIIs", pct: 12.45, from: "#a78bfa", to: "#7c3aed", trend: -0.35 },
  { key: "mf", label: "Mutual Funds", pct: 8.75, from: "#fbbf24", to: "#f97316", trend: 0.62 },
  { key: "pub", label: "Public", pct: 8.25, from: "#e2e8f0", to: "#94a3b8", trend: -0.18 },
];

const R = 120; // ring radius (viewBox units)
const STROKE = 46; // ring thickness
const C = 2 * Math.PI * R; // circumference
const GAP = 5; // gap between segments along the circumference

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// Build the live 3-way ownership split from Yahoo's majorHolders breakdown.
// (The NSE/BSE-style FII / DII / Mutual Funds / Retail quarterly split is not
// available from any free API, so we surface what Yahoo actually provides.)
export function shareholdingSegmentsFromHolders(
  h?: MajorHolders | null,
): ShareholderSegment[] {
  const ins =
    h?.insidersPercentHeld != null ? round(h.insidersPercentHeld * 100) : null;
  const inst =
    h?.institutionsPercentHeld != null
      ? round(h.institutionsPercentHeld * 100)
      : null;
  const retail =
    ins != null && inst != null ? round(Math.max(0, 100 - ins - inst)) : null;
  return [
    { key: "ins", label: "Promoters / Insiders", pct: ins ?? 0, from: "#34d399", to: "#059669" },
    {
      key: "inst",
      label: "Institutions (FII + DII + MF)",
      pct: inst ?? 0,
      from: "#60a5fa",
      to: "#2563eb",
    },
    { key: "ret", label: "Retail / Public", pct: retail ?? 0, from: "#e2e8f0", to: "#94a3b8" },
  ];
}

export default function ShareholdingPattern({
  data = DEFAULT_DATA,
  title = "Shareholding Pattern",
  subtitle,
  centerLabel = "Total Shareholding",
}: {
  data?: ShareholderSegment[];
  title?: string;
  subtitle?: string;
  centerLabel?: string;
}) {
  // Compute per-segment arc length + start offset so the ring reads clockwise
  // from 12 o'clock, with a small gap between each segment.
  let cum = 0;
  const segs = data.map((s) => {
    const len = (s.pct / 100) * C;
    const draw = Math.max(len - GAP, 0.5);
    const offset = -cum;
    cum += len;
    return { ...s, draw, offset };
  });

  const hasData = segs.some((s) => (s.pct ?? 0) > 0);

  return (
    <div className={styles.frame}>
      <div className={styles.stage}>
        <div className={styles.ambient} aria-hidden>
          <span className={styles.glowA} />
          <span className={styles.glowB} />
          <span className={styles.glowC} />
        </div>

        <div className={styles.inner}>
          <div className={styles.head}>
            <h1 className={styles.title}>{title}</h1>
            {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
          </div>

          {hasData ? (
            <div className={styles.body}>
              <div className={styles.donutCol}>
                <svg
                  className={styles.donut}
                  viewBox="0 0 300 300"
                  role="img"
                  aria-label="Shareholding pattern donut chart"
                >
                  <defs>
                    {segs.map((s) => (
                      <linearGradient
                        id={`grad-${s.key}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                        key={s.key}
                      >
                        <stop offset="0%" stopColor={s.from} />
                        <stop offset="100%" stopColor={s.to} />
                      </linearGradient>
                    ))}
                    <filter id="ringGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feDropShadow
                        dx="0"
                        dy="10"
                        stdDeviation="16"
                        floodColor="#0b1220"
                        floodOpacity="0.75"
                      />
                    </filter>
                    <radialGradient id="holeShade" cx="50%" cy="40%" r="62%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.07)" />
                      <stop offset="100%" stopColor="rgba(0,0,0,0.28)" />
                    </radialGradient>
                  </defs>

                  {/* outer + inner rim lights for depth */}
                  <circle
                    cx="150"
                    cy="150"
                    r={R + STROKE / 2 + 1}
                    fill="none"
                    stroke="rgba(255,255,255,0.07)"
                    strokeWidth="1"
                  />
                  <circle
                    cx="150"
                    cy="150"
                    r={R - STROKE / 2 - 1}
                    fill="none"
                    stroke="rgba(0,0,0,0.5)"
                    strokeWidth="2"
                  />

                  {/* the coloured ring, rotated so 0% starts at 12 o'clock */}
                  <g transform="rotate(-90 150 150)" filter="url(#ringGlow)">
                    {segs.map((s) => (
                      <circle
                        key={s.key}
                        cx="150"
                        cy="150"
                        r={R}
                        fill="none"
                        stroke={`url(#grad-${s.key})`}
                        strokeWidth={STROKE}
                        strokeDasharray={`${s.draw} ${C - s.draw}`}
                        strokeDashoffset={s.offset}
                        strokeLinecap="butt"
                      />
                    ))}
                  </g>

                  {/* centre depth shade sitting inside the hole */}
                  <circle cx="150" cy="150" r={R - STROKE / 2 - 2} fill="url(#holeShade)" />
                </svg>

                <div className={styles.center}>
                  <div className={styles.centerPct}>100%</div>
                  <div className={styles.centerLabel}>{centerLabel}</div>
                </div>
              </div>

              <div className={styles.legend}>
                {segs.map((s, i) => (
                  <div
                    className={styles.row}
                    key={s.key}
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <span
                      className={styles.dot}
                      style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }}
                    />
                    <span className={styles.name}>{s.label}</span>
                    <span className={styles.pct}>{s.pct.toFixed(2)}%</span>
                    {s.trend != null ? (
                      <span
                        className={`${styles.trend} ${s.trend >= 0 ? styles.up : styles.down}`}
                      >
                        {s.trend >= 0 ? "▲" : "▼"} {Math.abs(s.trend).toFixed(2)}%
                      </span>
                    ) : (
                      <span className={`${styles.trend} ${styles.flat}`}>—</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.empty}>
              No shareholding data available for this stock.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
