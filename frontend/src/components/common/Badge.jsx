import { TONE_TO_BADGE } from "../../constants";

export default function Badge({ tone = "muted", icon: Icon, children }) {
  return (
    <span className={`badge ${TONE_TO_BADGE[tone] || TONE_TO_BADGE.muted}`}>
      {Icon ? <Icon className="badge-icon" /> : null}
      {children}
    </span>
  );
}
