"use client";

import { memo, useEffect, useRef } from "react";

function TradingViewChart({ symbol }: { symbol: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    // Create a host node React has NO fiber for. TradingView injects its
    // <iframe> into this host. Because React never reconciles it, its
    // unmount/deletion pass (commitDeletionEffectsOnFiber) never calls
    // removeChild on TradingView's nodes -> no "node is not a child" error.
    const host = document.createElement("div");
    host.id = `tv-chart-${symbol.toUpperCase()}`;
    host.style.height = "100%";
    host.style.width = "100%";
    container.appendChild(host);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      container_id: host.id,
      autosize: true,
      symbol: `NSE:${symbol.toUpperCase()}`,
      interval: "D",
      timezone: "Asia/Kolkata",
      theme: "light",
      style: "1",
      locale: "en",
      hide_side_toolbar: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
      with_dateranges: true,
      show_popup_button: true,
      popup_width: "1000",
      enable_publishing: false,
      hideideas: true,
      details: true,
      studies: [
        "BB@tv-basicstudies",
        "MACD@tv-basicstudies",
        "RSI@tv-basicstudies",
      ],
    });
    host.appendChild(script);

    return () => {
      // Tear down the host (and TradingView's iframe with it) via raw DOM.
      // React never tracked this node, so it has nothing to removeChild.
      if (host.parentNode) host.parentNode.removeChild(host);
    };
  }, [symbol]);

  return (
    <div
      ref={ref}
      className="tradingview-widget-container rounded overflow-hidden"
      style={{ height: "520px", width: "100%" }}
    />
  );
}

// Parent re-renders (signal badge fetch, etc.) must NOT re-render this
// widget, or React would reconcile the container. memo keeps it stable.
export default memo(TradingViewChart);
