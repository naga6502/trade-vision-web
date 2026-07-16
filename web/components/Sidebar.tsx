"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  getSelectedSymbol,
  subscribeSelected,
} from "@/lib/selectedStore";

interface NavLink {
  label: string;
  icon: string;
  href: (sym: string) => string;
  match: (path: string, sym: string) => boolean;
  badge?: string;
  placeholder?: boolean;
  needsSymbol?: boolean;
}

const PRIMARY: NavLink[] = [
  {
    label: "Dashboard",
    icon: "bi-speedometer2",
    href: (s) => (s ? `/stock/${s}` : "/"),
    match: (p, s) => (s ? p === `/stock/${s}` : p === "/"),
  },
  {
    label: "Screeners",
    icon: "bi-filter-square",
    href: () => "/screener",
    match: (p) => p.startsWith("/screener"),
  },
  {
    label: "Sector Fundamentals",
    icon: "bi-diagram-3",
    href: () => "/sector-fundamentals",
    match: (p) => p.startsWith("/sector-fundamentals"),
  },
  {
    label: "Technical",
    icon: "bi-activity",
    href: (s) => `/stock/${s}/technical`,
    match: (p, s) => p === `/stock/${s}/technical`,
    needsSymbol: true,
  },
  {
    label: "Analytics",
    icon: "bi-cpu",
    href: () => "/analytics",
    match: (p) => p.startsWith("/analytics"),
  },
  {
    label: "IPO Monitor",
    icon: "bi-box-seam",
    href: () => "/ipo",
    match: (p) => p.startsWith("/ipo"),
  },
  {
    label: "Remote MCP",
    icon: "bi-plug",
    href: () => "/remote",
    match: (p) => p.startsWith("/remote"),
  },
  {
    label: "Market News",
    icon: "bi-globe2",
    href: () => "/news",
    match: (p) => p === "/news",
  },
  {
    label: "Alerts",
    icon: "bi-bell",
    href: () => "#",
    match: () => false,
    badge: "3",
    placeholder: true,
  },
  {
    label: "Watchlists",
    icon: "bi-star",
    href: () => "#",
    match: () => false,
    placeholder: true,
  },
];

const SECONDARY: NavLink[] = [
  { label: "Financials", icon: "bi-clipboard-data", href: (s) => `/stock/${s}/financials`, match: (p, s) => p === `/stock/${s}/financials`, needsSymbol: true },
  { label: "Filings", icon: "bi-file-earmark-text", href: () => "#", match: () => false, placeholder: true },
  { label: "Support", icon: "bi-life-preserver", href: () => "#", match: () => false, placeholder: true },
];

const DEFAULT_SYMBOL = "RELIANCE";

export default function Sidebar() {
  const pathname = usePathname() || "/";
  const sym = useSyncExternalStore(
    subscribeSelected,
    getSelectedSymbol,
    getSelectedSymbol,
  );
  // Stock-tab links need a symbol; fall back to a default so they're always
  // reachable instead of being greyed out ("Select a stock first").
  const tabSym = sym || DEFAULT_SYMBOL;

  function renderItem(item: NavLink) {
    const active = item.match(pathname, sym ?? "");
    const content = (
      <>
        <i className={`bi ${item.icon}`} />
        <span>{item.label}</span>
        {item.badge && <span className="badge-soft">{item.badge}</span>}
      </>
    );
    if (item.placeholder) {
      return (
        <div key={item.label} className="nav-item" title="Coming soon">
          {content}
        </div>
      );
    }
    const target = item.needsSymbol ? tabSym : sym ?? "";
    return (
      <Link
        key={item.label}
        href={item.href(target)}
        className={`nav-item ${active ? "active" : ""}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-section">Terminal</div>
      {PRIMARY.map(renderItem)}

      <div className="sidebar-section">Research</div>
      {SECONDARY.map(renderItem)}

      <div className="sidebar-footer">
        <div className="nav-item">
          <i className="bi bi-box-arrow-right" />
          <span>Sign Out</span>
        </div>
        <div className="muted-text" style={{ fontSize: "0.66rem", padding: "8px 12px 0" }}>
          NSE India · live data
        </div>
      </div>
    </aside>
  );
}
