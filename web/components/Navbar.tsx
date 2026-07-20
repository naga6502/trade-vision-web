"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchJson } from "@/lib/fetchJson";

interface Suggestion {
  symbol: string;
  name: string;
  exchDisp: string;
  typeDisp: string;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [q, setQ] = useState("");
  const [sugs, setSugs] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) {
      setSugs([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const j = await fetchJson<{ suggestions?: Suggestion[] }>(
          `/api/suggest?q=${encodeURIComponent(q)}`,
          { signal: ctrl.signal },
        );
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
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function go(symbol: string) {
    const s = symbol.replace(/\.NS$/, "").toUpperCase();
    setOpen(false);
    setQ("");
    const m = pathname.match(/^\/stock\/[^/]+\/(technical|financials|news)$/);
    const tab = m ? m[1] : "technical";
    router.push(`/stock/${s}/${tab}`);
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
    <nav
      className="navbar navbar-dark bg-dark px-3 px-lg-4 sticky-top"
      style={{ zIndex: 1030 }}
    >
      <span className="navbar-brand mb-0 h1 d-flex align-items-center gap-2">
        <i className="bi bi-graph-up-arrow fs-4 text-success" />
        Trade Vision
      </span>

      <div className="d-flex align-items-center gap-3 flex-wrap">
        <Link href="/" className="nav-link text-light">
          <i className="bi bi-speedometer2 me-1" />
          Dashboard
        </Link>
        <Link href="/remote" className="nav-link text-light">
          <i className="bi bi-plug me-1" />
          Remote MCP
        </Link>

        <div className="position-relative" ref={boxRef}>
          <div className="d-flex align-items-center bg-secondary bg-opacity-25 rounded px-2">
            <i className="bi bi-search text-light" />
            <input
              className="form-control bg-transparent border-0 text-light shadow-none"
              style={{ width: "230px", maxWidth: "50vw" }}
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
          </div>

          {open && sugs.length > 0 && (
            <ul
              className="list-group position-absolute shadow rounded mt-1"
              style={{ top: "100%", left: 0, right: 0, zIndex: 1040 }}
            >
              {sugs.map((s, i) => (
                <li
                  key={s.symbol}
                  className={`list-group-item list-group-item-action ${
                    i === active ? "active" : ""
                  }`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    go(s.symbol);
                  }}
                >
                  <div className="fw-semibold">
                    {s.symbol.replace(/\.NS$/, "")}
                  </div>
                  {s.name && <small className="text-muted">{s.name}</small>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </nav>
  );
}
