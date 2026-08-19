import { Activity } from "lucide-react";
import { formatSigned } from "../../utils/format";

const BARS = Array.from({ length: 16 }, (_, i) => i);

/* Physical ground-signal presentation. Pure derivation from the
   existing magnetic deviation — no local state, no local timers. */
function signalFromDeviation(deviation) {
  const magnitude = Math.abs(deviation);
  if (magnitude >= 5) {
    return { tone: "red", label: "Critical", note: "Disturbance confirmed" };
  }
  if (magnitude >= 2) {
    return { tone: "amber", label: "Elevated", note: "Deviation rising" };
  }
  return { tone: "cyan", label: "Stable", note: "Field nominal" };
}

export default function GroundSignalIndicator({ deviation }) {
  const signal = signalFromDeviation(deviation);

  return (
    <div
      className={`ground-signal tone-${signal.tone}`}
      role="status"
      aria-label={`Ground signal ${signal.label}`}
    >
      <div className="ground-signal-head">
        <span className="ground-signal-title">
          <Activity size={12} strokeWidth={2} />
          Ground Signal
        </span>
        <span className="ground-signal-state">{signal.label}</span>
      </div>
      <div className="ground-signal-bars" aria-hidden="true">
        {BARS.map((i) => (
          <span key={i} className="gs-bar" style={{ animationDelay: `${i * 0.09}s` }} />
        ))}
      </div>
      <div className="ground-signal-note">
        {signal.note} · Δ {formatSigned(deviation)} µT
      </div>
    </div>
  );
}
