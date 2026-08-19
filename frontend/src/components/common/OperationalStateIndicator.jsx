import { ShieldCheck, TriangleAlert, OctagonAlert, RotateCcw } from "lucide-react";
import { useSystemData } from "../../hooks/useSystemData";
import { OPERATIONAL_STATES } from "../../utils/operationalState";

const STATE_CONFIG = {
  [OPERATIONAL_STATES.SAFE]: {
    icon: ShieldCheck,
    tone: "green",
    label: "SAFE",
    description: "Normal background monitoring.",
  },
  [OPERATIONAL_STATES.ARMED]: {
    icon: TriangleAlert,
    tone: "amber",
    label: "ARMED",
    description: "NOAA flare confirmed — monitoring window active.",
  },
  [OPERATIONAL_STATES.DANGER]: {
    icon: OctagonAlert,
    tone: "red",
    label: "DANGER",
    description: "Geomagnetic disturbance exceeds safe threshold.",
  },
  [OPERATIONAL_STATES.RECOVERY]: {
    icon: RotateCcw,
    tone: "amber",
    label: "RECOVERY",
    description: "Post-danger recovery in progress.",
  },
};

/**
 * Reusable operational-state indicator.
 *
 * Consumes operationalState + operationalStateMeta from the shared
 * SystemContext via useSystemData(). Renders inline or full-width.
 *
 * @param {{ className?: string }} props
 */
export default function OperationalStateIndicator({ className = "" }) {
  const { operationalState, operationalStateMeta } = useSystemData();

  const config = STATE_CONFIG[operationalState] || STATE_CONFIG[OPERATIONAL_STATES.SAFE];
  const Icon = config.icon;
  const meta = operationalStateMeta || {};
  const countdown = meta.recoveryRemainingSeconds;

  return (
    <div
      className={`operational-indicator tone-${config.tone} ${className}`}
      role="status"
      aria-live={operationalState === OPERATIONAL_STATES.DANGER ? "assertive" : "polite"}
      aria-label={`Operational state: ${config.label}`}
    >
      <div className="op-indicator-head">
        <div className={`op-indicator-icon tone-${config.tone}`}>
          <Icon size={16} strokeWidth={2} />
        </div>
        <span className="op-indicator-label">{config.label}</span>
        {countdown !== null && countdown !== undefined && (
          <span className="op-indicator-countdown">
            {Math.ceil(countdown)}s
          </span>
        )}
      </div>
      <div className="op-indicator-message">{config.description}</div>
    </div>
  );
}
