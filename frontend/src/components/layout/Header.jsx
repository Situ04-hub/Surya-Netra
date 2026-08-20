import { Sun, Clock, Bell } from "lucide-react";
import { useSystemData } from "../../hooks/useSystemData";
import { useUtcClock } from "../../hooks/useUtcClock";
import { APP, SYSTEM_MODES, CONNECTION_TONES, ALERT_TONES } from "../../constants";
import Badge from "../common/Badge";
import StatusIndicator from "../common/StatusIndicator";

export default function Header() {
  const utcClock = useUtcClock();
  const { systemStatus, demoMode, alertConsole, groundValidation } = useSystemData();

  const noaaTone = CONNECTION_TONES[systemStatus.noaaConnectionStatus] || "muted";
  const adityaTone = CONNECTION_TONES[systemStatus.adityaDataStatus] || "muted";
  const mlTone = CONNECTION_TONES[systemStatus.mlEngineStatus] || "muted";
  const stationTone = CONNECTION_TONES[groundValidation.groundStationStatus] || "muted";
  const backendTone = CONNECTION_TONES[systemStatus.backendConnectionStatus] || "muted";
  const wsTone = CONNECTION_TONES[systemStatus.websocketConnectionStatus] || "muted";
  const alertTone = ALERT_TONES[alertConsole.alertLevel] || "muted";

  /* Overall status reflects the operational pipeline (replay sources +
     alert state), not the not-yet-connected backend/WS integration links. */
  const sysTone = [noaaTone, mlTone, stationTone, alertTone].includes("red")
    ? "red"
    : [noaaTone, adityaTone, mlTone, stationTone, alertTone].includes("amber")
      ? "amber"
      : "green";
  const alertCritical = alertTone === "red";

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-mark">
          <Sun size={19} strokeWidth={2} />
        </div>
        <div>
          <div className="brand-name">
            Surya-<span className="accent">Netra</span>
          </div>
          <div className="brand-tagline">{APP.mission}</div>
        </div>
      </div>

      <div className="header-right">
        <Badge tone={demoMode ? "amber" : "green"}>{demoMode ? SYSTEM_MODES.demo : SYSTEM_MODES.live}</Badge>

        <div className="header-chip" title="Overall system status">
          <StatusIndicator tone={sysTone} />
          <span className="chip-label">SYS</span>
        </div>

        <div className="header-chip" title="NOAA GOES telemetry source">
          <StatusIndicator tone={noaaTone} pulse={systemStatus.noaaConnectionStatus === "REPLAY"} />
          <span className="chip-label">NOAA</span>
        </div>

        <div className="header-chip" title="Backend API link">
          <StatusIndicator tone={backendTone} />
          <span className="chip-label">API</span>
        </div>

        <div className="header-chip" title="Real-time WebSocket link">
          <StatusIndicator tone={wsTone} />
          <span className="chip-label">WS</span>
        </div>

        <div className={`header-chip header-chip-alert tone-${alertTone} ${alertCritical ? "alert-critical" : ""}`} title="Current GMD alert state">
          <StatusIndicator tone={alertTone} pulse={alertCritical} />
          <Bell size={12} strokeWidth={1.9} />
          <span className="chip-label">{alertConsole.alertLevel}</span>
        </div>

        <div className="header-clock" title="Mission UTC clock">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Clock size={13} />
            {utcClock}
          </span>
        </div>
      </div>
    </header>
  );
}
