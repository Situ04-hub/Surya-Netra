export default function MetricValue({
  label,
  value,
  unit,
  tone = "muted",
  hero = false,
}) {
  const sizeClass = hero ? "metric-hero" : "";
  return (
    <div className={`metric metric-tone-${tone} ${sizeClass}`.trim()}>
      {label ? <span className="metric-label">{label}</span> : null}
      <span className="metric-value">
        {value}
        {unit ? <span className="metric-unit">{unit}</span> : null}
      </span>
    </div>
  );
}
