interface StatCardProps {
  icon?: string;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}

export default function StatCard({ icon, label, value, sub }: StatCardProps) {
  return (
    <div className="card h-100">
      <div className="card-body">
        <div className="text-muted small text-uppercase d-flex align-items-center gap-2">
          {icon && <i className={`bi ${icon}`} />}
          {label}
        </div>
        <div className="fs-4 fw-semibold mt-1">{value}</div>
        {sub && <div className="text-muted small mt-1">{sub}</div>}
      </div>
    </div>
  );
}
