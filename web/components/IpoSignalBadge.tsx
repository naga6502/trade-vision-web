import type { IpoSignal } from "@/lib/mcp";

const VERDICT_CLASS: Record<IpoSignal["signal"], string> = {
  APPLY: "success",
  SKIP: "danger",
  WATCH: "warning",
};

const CONF_CLASS: Record<IpoSignal["confidence"], string> = {
  HIGH: "success",
  MEDIUM: "warning",
  LOW: "secondary",
};

export default function IpoSignalBadge({ signal }: { signal: IpoSignal }) {
  return (
    <div className="d-flex align-items-center gap-2 flex-wrap">
      <span className={`badge bg-${VERDICT_CLASS[signal.signal]} fs-6 px-3 py-2`}>
        {signal.signal}
      </span>
      <span className={`badge bg-${CONF_CLASS[signal.confidence]}-subtle text-${CONF_CLASS[signal.confidence]} border`}>
        {signal.confidence} confidence
      </span>
      <span className="small text-muted">
        score {signal.score}/{signal.maxScore}
      </span>
    </div>
  );
}
