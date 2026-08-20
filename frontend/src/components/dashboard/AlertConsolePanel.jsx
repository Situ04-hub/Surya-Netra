import { ShieldAlert, CheckCircle, CircleDot, Settings } from "lucide-react";
import { useState } from "react";
import GlassPanel from "../common/GlassPanel";
import SectionHeader from "../common/SectionHeader";
import Badge from "../common/Badge";
import AlertEventList from "../common/AlertEventList";
import { ALERT_TONES, ALERT_LEVELS } from "../../constants";
import { useSystemData } from "../../hooks/useSystemData";
import { formatIso, formatSigned } from "../../utils/format";
import apiClient from "../../services/api";

export default function AlertConsolePanel() {
  const { alertConsole, alertHistory, spacePrediction, groundValidation } = useSystemData();
  const [thresholdValue, setThresholdValue] = useState(7.0);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSetThreshold = async () => {
    try {
      setIsUpdating(true);
      await apiClient.post("/api/set-threshold", { threshold: parseFloat(thresholdValue) });
      // Trigger the solar flare alert automatically so hardware goes to Alert mode
      await apiClient.post("/api/simulation/noaa-alert", { 
        active: true, 
        flare_class: "M-CLASS", 
        probability: 85 
      });
    } catch (err) {
      console.error("Failed to set threshold", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const tone = ALERT_TONES[alertConsole.alertLevel] || "muted";
  const severityClass = `severity-${tone}`;
  const levelIndex = ALERT_LEVELS.indexOf(alertConsole.alertLevel);

  const predictionTone =
    spacePrediction.predictionStatus === "CRITICAL"
      ? "red"
      : spacePrediction.predictionStatus === "WARNING"
        ? "amber"
        : "violet";

  const groundTone =
    Math.abs(groundValidation.magneticDeviation) > 5
      ? "red"
      : Math.abs(groundValidation.magneticDeviation) > 2
        ? "amber"
        : "cyan";

  return (
    <GlassPanel glow={tone === "red" ? "red" : tone === "amber" ? "amber" : undefined}>
      <div className="panel-body">
        <SectionHeader
          icon={ShieldAlert}
          title="Alert Console"
          subtitle="Operational Decision · GMD severity"
          actions={<Badge tone={tone}>{alertConsole.alertLevel}</Badge>}
        />

        {/* GMD severity scale (existing ALERT_LEVELS hierarchy) */}
        <div
          className="severity-scale"
          role="img"
          aria-label={`GMD severity scale · current level ${alertConsole.alertLevel}`}
        >
          {ALERT_LEVELS.map((level) => {
            const levelTone = ALERT_TONES[level] || "muted";
            const active = level === alertConsole.alertLevel;
            const reached = levelIndex >= 0 && ALERT_LEVELS.indexOf(level) <= levelIndex;
            return (
              <div
                key={level}
                className={`severity-seg ${active ? "active" : ""} ${reached ? "reached" : ""}`}
                style={{ color: `var(--color-${levelTone})` }}
              >
                <span className="severity-seg-bar" />
                <span className="severity-seg-label">{level}</span>
              </div>
            );
          })}
        </div>

        <div className={`current-alert ${severityClass}`}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Badge tone={tone}>
              {alertConsole.alertAcknowledged ? (
                <CheckCircle size={11} />
              ) : (
                <CircleDot size={11} />
              )}
              {alertConsole.alertStatus}
            </Badge>
            <span className="mono" style={{ marginLeft: "auto", fontSize: 9.5, color: "var(--color-text-muted)", letterSpacing: "0.06em" }}>
              {formatIso(alertConsole.alertTimestamp)}
            </span>
          </div>

          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: "var(--color-text-secondary)" }}>
            {alertConsole.alertMessage}
          </p>

          <div className="metric" style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <span className="metric-label">Source</span>
            <span className="mono" style={{ fontSize: 10.5, color: "var(--color-text-secondary)", letterSpacing: "0.06em" }}>
              {alertConsole.alertSource}
            </span>
          </div>

          <div className="metric" style={{ marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <span className="metric-label">Acknowledged</span>
            <span className="mono" style={{ fontSize: 10.5, color: alertConsole.alertAcknowledged ? "var(--color-green)" : "var(--color-amber)", letterSpacing: "0.06em" }}>
              {alertConsole.alertAcknowledged ? "YES" : "PENDING"}
            </span>
          </div>
        </div>

        <div className="gmd-context">
          <div className="gmd-context-row">
            <span className="gmd-label">
              <CircleDot size={10} style={{ color: `var(--color-${tone === "muted" ? "cyan" : tone})` }} />
              GMD Alert State
            </span>
            <span className="gmd-value" style={{ color: `var(--color-${tone === "muted" ? "cyan" : tone})` }}>
              {alertConsole.alertLevel} · {alertConsole.alertStatus}
            </span>
          </div>
          <div className="gmd-context-row">
            <span className="gmd-label">Prediction Event</span>
            <span className="gmd-value" style={{ color: `var(--color-${predictionTone})` }}>
              {spacePrediction.flareClass} · {spacePrediction.predictionStatus}
            </span>
          </div>
          <div className="gmd-context-row">
            <span className="gmd-label">Ground Validation</span>
            <span className="gmd-value" style={{ color: `var(--color-${groundTone})` }}>
              {groundValidation.groundValidationStatus} · {formatSigned(groundValidation.magneticDeviation)} µT
            </span>
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: "8px", alignItems: "center" }}>
           <input 
             type="number" 
             value={thresholdValue} 
             onChange={(e) => setThresholdValue(e.target.value)}
             step="0.1"
             style={{
               background: "rgba(0, 0, 0, 0.2)",
               border: "1px solid var(--color-border)",
               color: "var(--color-text)",
               padding: "4px 8px",
               borderRadius: "4px",
               width: "70px",
               fontFamily: "var(--font-mono)",
               fontSize: "11px"
             }}
           />
           <button 
             onClick={handleSetThreshold}
             disabled={isUpdating}
             style={{
               background: "var(--color-amber)",
               color: "#000",
               border: "none",
               padding: "4px 12px",
               borderRadius: "4px",
               fontSize: "11px",
               fontWeight: "600",
               cursor: "pointer",
               display: "flex",
               alignItems: "center",
               gap: "4px"
             }}
           >
             <Settings size={12} />
             {isUpdating ? "Setting..." : "Set Threshold & Trigger Flare"}
           </button>

           <button 
             onClick={async () => {
               try {
                 await fetch("http://127.0.0.1:8000/api/simulation/noaa-alert", {
                   method: "POST",
                   headers: { "Content-Type": "application/json" },
                   body: JSON.stringify({ active: false })
                 });
               } catch (err) {
                 console.error("Failed to clear flare", err);
               }
             }}
             style={{
               background: "rgba(255, 255, 255, 0.1)",
               color: "var(--color-text)",
               border: "1px solid var(--color-border)",
               padding: "4px 12px",
               borderRadius: "4px",
               fontSize: "11px",
               fontWeight: "500",
               cursor: "pointer"
             }}
           >
             Clear Flare (Reset to Green)
           </button>
        </div>

        <hr className="divider" style={{ marginTop: 16 }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span className="metric-label">Event History</span>
          <span className="mono" style={{ fontSize: 9.5, color: "var(--color-text-muted)" }}>
            {alertHistory.length} events
          </span>
        </div>

        <AlertEventList events={alertHistory} variant="rail" limit={4} />
      </div>
    </GlassPanel>
  );
}
