import { TONE_TO_STATUS } from "../../constants";

export default function LiveIndicator({ label = "LIVE", tone = "green" }) {
  return (
    <span className={`live-indicator ${TONE_TO_STATUS[tone] || ""}`} role="status" aria-label={label}>
      <span className="status-dot pulse" aria-hidden="true" />
      <span className="live-label">{label}</span>
    </span>
  );
}
