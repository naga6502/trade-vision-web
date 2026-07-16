/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disabled: StrictMode double-invokes effects in dev (mount -> unmount
  // -> remount). Third-party widgets that mutate the DOM themselves
  // (TradingView's injected <iframe>, Recharts' ResponsiveContainer)
  // then trip React's deletion pass with "removeChild ... not a child".
  reactStrictMode: false,
  experimental: {
    // Transpile the local `trade-vision` workspace package (the MCP server) so
    // Next can bundle its dist output. yahoo-finance2 (pulled in via the MCP
    // tool fns) stays external so Next doesn't try to bundle its internals.
    serverComponentsExternalPackages: ["yahoo-finance2"],
    // transpilePackages added below (Next 14.2 stable key).
  },
  transpilePackages: ["trade-vision"],
};

export default nextConfig;
