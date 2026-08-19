import { TONE_TO_STATUS } from "../../constants";

export default function StatusIndicator({ tone = "muted", label, pulse = false }) {
  return (
    <span className={`status-indicator ${TONE_TO_STATUS[tone] || ""}`}>
      <span className={`status-dot ${pulse ? "pulse" : ""}`} aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </span>
  );
}
