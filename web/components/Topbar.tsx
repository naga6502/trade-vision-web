"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getLastUpdated,
  subscribeUpdated,
} from "@/lib/updatedStore";
import { setSelectedSymbol } from "@/lib/selectedStore";

interface Suggestion {
  symbol: string;
  name: string;
  exchDisp: string;
  typeDisp: string;
}

export default function Topbar() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [q, setQ] = useState("");
  const [sugs, setSugs] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const updated = useSyncExternalStore(subscribeUpdated, getLastUpdated, getLastUpdated);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!q.trim()) {
      setSugs([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const j = await r.json();
        setSugs(j.suggestions || []);
        setOpen(true);
      } catch {
        /* ignore */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Map the current path to a stock tab, so searching from a tab (e.g.
  // Financials) keeps you on that tab for the new symbol. Defaults to
  // Technical when not already on a stock tab.
  function tabFromPath(path: string): string {
    const m = path.match(/^\/stock\/[^/]+\/(technical|financials|news)$/);
    return m ? m[1] : "technical";
  }

  function go(symbol: string) {
    const s = symbol.replace(/\.NS$/, "").toUpperCase();
    setSelectedSymbol(s);
    setOpen(false);
    setQ("");
    router.push(`/stock/${s}/${tabFromPath(pathname)}`);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, sugs.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && sugs[active]) go(sugs[active].symbol);
      else if (q.trim()) go(q.trim().toUpperCase());
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="logo-dot">TV</span>
        <span>Trade Vision</span>
      </div>

      <div className="topbar-search" ref={boxRef}>
        <i className="bi bi-search" />
        <input
          ref={inputRef}
          placeholder="Search stock (e.g. RELIANCE)"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(-1);
          }}
          onKeyDown={onKey}
          onFocus={() => sugs.length && setOpen(true)}
          aria-label="Search stock"
        />
        <span className="kbd">⌘K</span>

        {open && sugs.length > 0 && (
          <ul
            className="list-group position-absolute shadow rounded mt-1"
            style={{ top: "100%", left: 0, right: 0, zIndex: 1040, background: "var(--surface)" }}
          >
            {sugs.map((s, i) => (
              <li
                key={s.symbol}
                className={`list-group-item ${i === active ? "active" : ""}`}
                style={{
                  background: i === active ? "var(--surface-2)" : "var(--surface)",
                  color: "var(--ink)",
                  cursor: "pointer",
                }}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(s.symbol);
                }}
              >
                <div className="fw-semibold">{s.symbol.replace(/\.NS$/, "")}</div>
                {s.name && <small className="muted-text">{s.name}</small>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="d-flex align-items-center gap-2 ms-auto">
        <span className="topbar-updated muted-text" title="Last data refresh">
          Updated{" "}
          {mounted
            ? updated
                .toLocaleTimeString("en-IN", {
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })
                .toLowerCase()
            : ""}
        </span>
        <div className="topbar-icon" title="Notifications">
          <i className="bi bi-bell" />
        </div>
        <div className="topbar-icon" title="Settings">
          <i className="bi bi-gear" />
        </div>
        <div className="profile-chip">
          <span className="avatar">NM</span>
          <span className="who">
            <div className="name">Naga Mohan</div>
            <div className="role">Pro Trader</div>
          </span>
        </div>
      </div>
    </header>
  );
}
