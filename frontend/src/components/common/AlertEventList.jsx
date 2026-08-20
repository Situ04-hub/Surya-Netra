import { motion } from "framer-motion";
import { ALERT_TONES } from "../../constants";
import { formatIso } from "../../utils/format";

const levelColor = (tone) =>
  `var(--color-${
    tone === "green" ? "green" : tone === "red" ? "critical" : "warning"
  })`;

/* Shared event-history list. Pure presentation over the existing
   alertHistory contract (newest first). variant "rail" is the compact
   mission-dashboard list; variant "page" is the full-width Alerts view. */
export default function AlertEventList({ events, limit, variant = "rail" }) {
  const list = limit ? events.slice(0, limit) : events;

  return (
    <div className={`alert-list alert-list-${variant}`}>
      {list.map((event, index) => {
        const tone = ALERT_TONES[event.alertLevel] || "amber";
        const pendingAck = !event.alertAcknowledged;
        const time = formatIso(event.alertTimestamp);
        return (
          <motion.div
            key={`${event.alertTimestamp}-${index}`}
            className={`alert-item alert-item-${variant}`}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * index, duration: 0.3 }}
          >
            <span className={`alert-severity-chip chip-${tone}`} title={event.alertLevel} />
            <div className="alert-item-body">
              <div className="alert-item-meta">
                <span className="alert-item-level" style={{ color: levelColor(tone) }}>
                  {event.alertLevel}
                </span>
                <span className="alert-item-source">{event.alertSource}</span>
                {pendingAck ? <span className="alert-item-ack">ACK PENDING</span> : null}
              </div>
              <div className="alert-msg" title={event.alertMessage}>
                {event.alertMessage}
              </div>
            </div>
            <span className="alert-time">
              {variant === "page" ? `${time.slice(0, 19)} UTC` : time.slice(11)}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
