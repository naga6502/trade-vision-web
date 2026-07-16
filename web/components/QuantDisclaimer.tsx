export default function QuantDisclaimer({
  text = "Heuristic ensemble — rule-based signals, not a trained model. For research only; not investment advice.",
}: {
  text?: string;
}) {
  return (
    <div
      className="muted-text mt-2"
      style={{ fontSize: "0.7rem", fontStyle: "italic" }}
    >
      {text}
    </div>
  );
}
