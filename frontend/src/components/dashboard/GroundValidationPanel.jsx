import {
  Magnet,
  RadioTower,
  Cpu,
  Activity,
  ChevronDown,
  CheckCircle,
  ShieldAlert,
} from "lucide-react";
import GlassPanel from "../common/GlassPanel";
import SectionHeader from "../common/SectionHeader";
import MetricValue from "../common/MetricValue";
import Badge from "../common/Badge";
import StatusIndicator from "../common/StatusIndicator";
import TelemetryChart from "../common/TelemetryChart";
import GroundSignalIndicator from "./GroundSignalIndicator";
import { CONNECTION_TONES, VALIDATION_STATES, ALERT_TONES } from "../../constants";
import { useSystemData } from "../../hooks/useSystemData";
import { formatIso, formatNumber, formatSigned } from "../../utils/format";
import { deriveValidationState } from "../../utils/validation";

export default function GroundValidationPanel() {
  const { groundValidation, magneticSeries, spacePrediction, alertConsole, demoMode } =
    useSystemData();

  const stationTone = CONNECTION_TONES[groundValidation.groundStationStatus] || "muted";

  const deviation = Math.abs(groundValidation.magneticDeviation);
  const deviationTone = deviation > 5 ? "red" : deviation > 2 ? "amber" : "green";

  const isBaseline = groundValidation.groundValidationStatus === VALIDATION_STATES[0];
  const validationState = deriveValidationState(
    groundValidation.groundValidationStatus,
    groundValidation.magneticDeviation,
  );

  /* Connection presentation: replay mode reports REPLAY; a future
     backend may set ONLINE / CONNECTING / OFFLINE on the same field. */
  const connLabel = demoMode ? "REPLAY" : groundValidation.groundStationStatus;
  const connTone = demoMode ? "amber" : stationTone;

  /* Validation mode — normal monitoring vs disturbance validation,
     derived purely from the existing validation status. */
  const modeTone = isBaseline
    ? "cyan"
    : groundValidation.groundValidationStatus === "CONFIRMED"
      ? "red"
      : "amber";
  const modeLabel = isBaseline
    ? "NORMAL MONITORING"
    : groundValidation.groundValidationStatus === "CONFIRMED"
      ? "DISTURBANCE VALIDATED"
      : "DISTURBANCE VALIDATION";

  /* Predict → Ground → Decision workflow tones (existing shared state). */
  const predictionTone =
    spacePrediction.predictionStatus === "CRITICAL"
      ? "red"
      : spacePrediction.predictionStatus === "WARNING"
        ? "amber"
        : "violet";
  const disturbanceDetected = deviation > 2;
  const disturbanceTone = disturbanceDetected ? (deviation > 5 ? "red" : "amber") : "cyan";
  const disturbanceLabel = disturbanceDetected
    ? `${formatSigned(groundValidation.magneticDeviation)} µT`
    : "Nominal";
  const confirmTone = CONNECTION_TONES[groundValidation.groundValidationStatus] || "cyan";
  const decisionTone = ALERT_TONES[alertConsole.alertLevel] || "green";

  const deviationPercent = groundValidation.magneticBaseline
    ? (deviation / groundValidation.magneticBaseline) * 100
    : 0;

  /* Abnormal-deviation band for the chart (existing series + baseline). */
  const seriesMax = magneticSeries.length
    ? Math.max(...magneticSeries.map((point) => point.magneticFieldMagnitude))
    : groundValidation.magneticFieldMagnitude;
  const band =
    deviation > 2
      ? {
          from: groundValidation.magneticBaseline + 2,
          to: Math.max(seriesMax, groundValidation.magneticBaseline + 2),
          tone: deviation > 5 ? "red" : "amber",
        }
      : null;

  const disturbanceActive = !isBaseline;
  const eventTone = groundValidation.groundValidationStatus === "CONFIRMED" ? "red" : "amber";
  const eventTitle =
    groundValidation.groundValidationStatus === "CONFIRMED"
      ? "Magnetic disturbance confirmed"
      : "Ground signal deviation detected";

  return (
    <GlassPanel glow="cyan">
      <div className="panel-body">
        <SectionHeader
          icon={Magnet}
          title="Ground Validation"
          subtitle="Confirmation on Earth · ESP32 · QMC5883L"
          actions={
            <Badge tone={stationTone}>
              {groundValidation.groundStationStatus}
            </Badge>
          }
        />

        {/* Ground station identity + connection */}
        <div className="source-row">
          <div className="source-icon">
            <Cpu size={15} />
          </div>
          <div>
            <div className="source-name">ESP32 Station</div>
            <div className="source-sub">
              {groundValidation.groundStationId} · ground link
            </div>
          </div>
          <div className="source-status">
            <StatusIndicator tone={connTone} label={connLabel} pulse={connTone !== "green"} />
          </div>
        </div>

        <div className="source-row">
          <div className="source-icon">
            <RadioTower size={15} />
          </div>
          <div>
            <div className="source-name">QMC5883L</div>
            <div className="source-sub">3-axis magnetic field sensor</div>
          </div>
          <div className="source-status">
            <StatusIndicator tone={stationTone} label="Online" />
          </div>
        </div>

        {/* Primary: physical signal + current field / validation state */}
        <div className="ground-primary">
          <GroundSignalIndicator deviation={groundValidation.magneticDeviation} />
          <div className={`ground-primary-value ${isBaseline ? "" : `mode-${modeTone}`}`}>
            <MetricValue
              hero
              label="Field Magnitude"
              value={groundValidation.magneticFieldMagnitude}
              unit="µT"
              tone="cyan"
            />
            <div className="ground-validation-state">
              <span className="metric-label">Validation State</span>
              <span className="ground-validation-state-badge">
                <Badge tone={validationState.tone}>{validationState.state}</Badge>
                <span className="ground-validation-raw">{groundValidation.groundValidationStatus}</span>
              </span>
            </div>
            <div className="ground-mode">
              <span className="metric-label">Mode</span>
              <span className={`ground-mode-value tone-${modeTone}`}>{modeLabel}</span>
            </div>
            <div className="ground-last-telemetry">
              <span className="metric-label">Last Telemetry</span>
              <span className="mono" style={{ fontSize: 10.5, color: "var(--color-text-muted)", letterSpacing: "0.06em" }}>
                {formatIso(groundValidation.groundValidationTimestamp)} UTC
              </span>
            </div>
          </div>
        </div>

        <hr className="divider" />

        {/* Hardware telemetry cards */}
        <div className="hw-grid">
          <div className="hw-card">
            <MetricValue
              label="Magnetic Field"
              value={groundValidation.magneticFieldMagnitude}
              unit="µT"
              tone="cyan"
            />
            <span className="hw-card-sub">current field</span>
          </div>
          <div className="hw-card">
            <MetricValue
              label="Baseline"
              value={groundValidation.magneticBaseline}
              unit="µT"
              tone="muted"
            />
            <span className="hw-card-sub">quiet reference</span>
          </div>
          <div className="hw-card">
            <MetricValue
              label="Deviation"
              value={formatSigned(groundValidation.magneticDeviation)}
              unit="µT"
              tone={deviationTone}
            />
            <span className="hw-card-sub">{formatNumber(deviationPercent, 1)}% of baseline</span>
          </div>
          <div className="hw-card">
            <span className="metric-label">Sensor Status</span>
            <StatusIndicator tone={stationTone} label="Online" pulse={stationTone === "green"} />
            <span className="hw-card-sub">QMC5883L · 3-axis</span>
          </div>
          <div className="hw-card">
            <span className="metric-label">Station Status</span>
            <StatusIndicator tone={connTone} label={connLabel} pulse={connTone !== "green"} />
            <span className="hw-card-sub">{groundValidation.groundStationId}</span>
          </div>
        </div>

        {/* Magnetic components */}
        <div className="block-label">Magnetic Components</div>
        <div className="metric-grid">
          <MetricValue
            label="Bx"
            value={formatSigned(groundValidation.magneticFieldX)}
            unit="µT"
            tone="muted"
          />
          <MetricValue
            label="By"
            value={formatSigned(groundValidation.magneticFieldY)}
            unit="µT"
            tone="muted"
          />
          <MetricValue
            label="Bz"
            value={formatSigned(groundValidation.magneticFieldZ)}
            unit="µT"
            tone="muted"
          />
        </div>

        <hr className="divider" />

        {/* Magnetic field telemetry */}
        <div className="chart-block">
          <div className="chart-block-head">
            <span className="chart-block-title">Magnetic Field Magnitude</span>
            <span className="chart-block-sub">
              {isBaseline ? "Baseline nominal · awaiting disturbance" : `Disturbance · ${validationState.state}`}
            </span>
          </div>
          <TelemetryChart
            data={magneticSeries}
            dataKey="magneticFieldMagnitude"
            color="cyan"
            unit="µT"
            label="Magnitude"
            height={150}
            baseline={groundValidation.magneticBaseline}
            band={band}
          />
        </div>

        {/* Validation event */}
        {disturbanceActive ? (
          <div className={`ground-event tone-${eventTone}`} role="status">
            <div className="ground-event-head">
              <Activity size={13} strokeWidth={2} />
              <span className="ground-event-title">{eventTitle}</span>
              <span className="ground-event-time">
                {formatIso(groundValidation.groundValidationTimestamp).slice(11)} UTC
              </span>
            </div>
            <div className="ground-event-meta">
              <span>STN {groundValidation.groundStationId}</span>
              <span>Δ {formatSigned(groundValidation.magneticDeviation)} µT</span>
              <span>{validationState.state}</span>
            </div>
          </div>
        ) : null}

        {/* Predict in Space → Confirm on Earth workflow */}
        <div className="ground-flow">
          <div className="ground-flow-row">
            <span className="ground-flow-icon">
              <Cpu size={12} strokeWidth={2} />
            </span>
            <span className="ground-flow-label">ML Prediction</span>
            <span className={`ground-flow-value tone-${predictionTone}`}>
              {spacePrediction.predictionStatus}
            </span>
          </div>
          <ChevronDown className="ground-flow-arrow" size={14} strokeWidth={2} />
          <div className="ground-flow-row">
            <span className="ground-flow-icon">
              <RadioTower size={12} strokeWidth={2} />
            </span>
            <span className="ground-flow-label">Ground Monitoring</span>
            <span className="ground-flow-value tone-cyan">{groundValidation.groundStationStatus}</span>
          </div>
          <ChevronDown className="ground-flow-arrow" size={14} strokeWidth={2} />
          <div className="ground-flow-row">
            <span className="ground-flow-icon">
              <Activity size={12} strokeWidth={2} />
            </span>
            <span className="ground-flow-label">Disturbance Detected</span>
            <span className={`ground-flow-value tone-${disturbanceTone}`}>{disturbanceLabel}</span>
          </div>
          <ChevronDown className="ground-flow-arrow" size={14} strokeWidth={2} />
          <div className="ground-flow-row">
            <span className="ground-flow-icon">
              <CheckCircle size={12} strokeWidth={2} />
            </span>
            <span className="ground-flow-label">Ground Confirmation</span>
            <span className={`ground-flow-value tone-${confirmTone}`}>
              {groundValidation.groundValidationStatus}
            </span>
          </div>
          <ChevronDown className="ground-flow-arrow" size={14} strokeWidth={2} />
          <div className="ground-flow-row">
            <span className="ground-flow-icon">
              <ShieldAlert size={12} strokeWidth={2} />
            </span>
            <span className="ground-flow-label">GMD Decision</span>
            <span className={`ground-flow-value tone-${decisionTone}`}>
              {alertConsole.alertLevel}
            </span>
          </div>
        </div>

        {/* Sensor metadata */}
        <div className="sensor-meta">
          {[
            ["Station ID", groundValidation.groundStationId],
            ["Device", "ESP32"],
            ["Sensor", "QMC5883L"],
            ["Measurement", "Magnetic Field"],
            ["Unit", "µT"],
            ["Stream", "Ground Telemetry"],
          ].map(([label, value]) => (
            <div className="sensor-meta-item" key={label}>
              <span className="sensor-meta-label">{label}</span>
              <span className="sensor-meta-value">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </GlassPanel>
  );
}
