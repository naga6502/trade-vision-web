// SSR-safe global store for the currently selected stock symbol. The Topbar
// sets it when a stock is chosen (and /stock/[symbol] syncs it from the URL);
// the dashboard reads it to show that stock's data. Initialised to null so the
// server and client first render agree (no hydration mismatch).

let selected: string | null = null;
const listeners = new Set<() => void>();

export function setSelectedSymbol(s: string | null): void {
  const sym = s ? s.replace(/\.NS$/, "").toUpperCase() : null;
  if (sym === selected) return;
  selected = sym;
  listeners.forEach((l) => l());
}

export function getSelectedSymbol(): string | null {
  return selected;
}

export function subscribeSelected(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
