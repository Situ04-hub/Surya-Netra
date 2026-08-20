export default function ChartPlaceholder({ title = "Telemetry Stream", subtitle = "Awaiting data", height = 168 }) {
  return (
    <div className="chart-placeholder" style={{ height }}>
      <div className="chart-message">
        <span className="chart-title">{title}</span>
        <span className="chart-sub">{subtitle}</span>
      </div>
    </div>
  );
}
