// Shared display formatters (client + server safe, no server-only imports).

export function fmt(n: number | null | undefined, d = 2): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

export function fmtInt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return Math.round(n).toLocaleString("en-IN");
}

export function fmtPct(n: number | null | undefined, withSign = true): string {
  if (n == null || Number.isNaN(n)) return "—";
  const s = withSign && n > 0 ? "+" : "";
  return `${s}${n.toFixed(2)}%`;
}

export function fmtCompact(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-IN", {
    notation: "compact",
    maximumFractionDigits: 2,
  });
}

/** Direction class for gain/loss coloring. */
export function dir(n: number | null | undefined): "gain" | "loss" | "" {
  if (n == null || Number.isNaN(n) || n === 0) return "";
  return n > 0 ? "gain" : "loss";
}

// Indian equity market session (IST): Monday–Friday, 09:15–15:30.
// NSE's marketStatus feed is frequently stale (it can stay "Open" well after
// the close), so the dashboard derives open/closed from the current India time
// instead of trusting that field. `now` is injectable for tests.
export function marketOpenIST(now: Date = new Date()): boolean {
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day = ist.getDay(); // 0 = Sun … 6 = Sat
  if (day === 0 || day === 6) return false;
  const mins = ist.getHours() * 60 + ist.getMinutes();
  return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
}

export function clsx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Human-friendly relative/absolute time for news published timestamps. */
export function formatPublished(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
