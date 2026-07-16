import RemoteMcp from "@/components/RemoteMcp";

export default function RemotePage() {
  return (
    <div>
      <div className="mb-3">
        <h5 className="mb-0">Trade Vision · MCP</h5>
        <small className="text-muted">
          Live Indian market data via this app's self-hosted <code>/api/mcp</code> endpoint —
          pick a tool, fill its arguments, and call it (quotes, bulk/block deals, FII/DII
          flows, screeners, news, heatmaps, and more).
        </small>
      </div>
      <RemoteMcp />
    </div>
  );
}
