import { Fragment } from "react";
import {
  ShieldAlert,
  CheckCircle,
  CircleDot,
  Cpu,
  Magnet,
  Layers,
  Clock,
  Workflow,
  Info,
  ChevronRight,
  Satellite,
  Database,
  RadioTower,
  Radar,
} from "lucide-react";
import { motion } from "framer-motion";
import GlassPanel from "../components/common/GlassPanel";
import SectionHeader from "../components/common/SectionHeader";
import Badge from "../components/common/Badge";
import MetricValue from "../components/common/MetricValue";
import LiveIndicator from "../components/common/LiveIndicator";
import StatusIndicator from "../components/common/StatusIndicator";
import AlertEventList from "../components/common/AlertEventList";
import FlowIndicator from "../components/dashboard/FlowIndicator";
import OperationalStateIndicator from "../components/common/OperationalStateIndicator";
import { ALERT_TONES, ALERT_LEVELS, CONNECTION_TONES } from "../constants";
import { useSystemData } from "../hooks/useSystemData";
import { formatIso, formatNumber, formatPercent, formatSigned } from "../utils/format";
import { deriveValidationState } from "../utils/validation";

function MetaRow({ label, children, valueStyle }) {
  return (
    <div
      className="metric"
      style={{
        marginTop: 6,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <span className="metric-label">{label}</span>
      <span
        className="mono"
        style={{
          fontSize: 10.5,
          letterSpacing: "0.05em",
          color: "var(--color-text-secondary)",
          textAlign: "right",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          ...valueStyle,
        }}
      >
        {children}
      </span>
    </div>
  );
}

export default function AlertsPage() {
  const {
    systemStatus,
    demoMode,
    alertConsole,
    alertHistory,
    spacePrediction,
    solarTelemetry,
    groundValidation,
  } = useSystemData();

  /* ---- Severity derives from the existing alert state (no new variable) ---- */
  const alertTone = ALERT_TONES[alertConsole.alertLevel] || "muted";
  const severityClass = `severity-${alertTone}`;
  const isCritical = alertConsole.alertLevel === "CRITICAL";
  const levelIndex = ALERT_LEVELS.indexOf(alertConsole.alertLevel);

  const predictionTone =
    spacePrediction.predictionStatus === "CRITICAL"
      ? "red"
      : spacePrediction.predictionStatus === "WARNING"
        ? "amber"
        : "violet";

  const deviation = Math.abs(groundValidation.magneticDeviation);
  const groundTone = deviation > 5 ? "red" : deviation > 2 ? "amber" : "cyan";
  const deviationPercent = groundValidation.magneticBaseline
    ? (deviation / groundValidation.magneticBaseline) * 100
    : 0;
  const validationState = deriveValidationState(
    groundValidation.groundValidationStatus,
    groundValidation.magneticDeviation,
  );

  const noaaTone = CONNECTION_TONES[systemStatus.noaaConnectionStatus] || "muted";
  const adityaTone = CONNECTION_TONES[systemStatus.adityaDataStatus] || "muted";
  const mlTone = CONNECTION_TONES[systemStatus.mlEngineStatus] || "muted";
  const stationTone = CONNECTION_TONES[groundValidation.groundStationStatus] || "muted";

  /* ---- Evidence chain: prediction → confidence → ground → validation → decision ---- */
  const evidenceSteps = [
    {
      label: "Space Prediction",
      value: spacePrediction.flareClass,
      sub: `ML · ${spacePrediction.predictionStatus}`,
      tone: predictionTone,
    },
    {
      label: "ML Confidence",
      value: `${spacePrediction.flareScore} / 100`,
      sub: "flare score",
      tone: "violet",
    },
    {
      label: "Ground Response",
      value: `${formatSigned(groundValidation.magneticDeviation)} µT`,
      sub: groundValidation.groundStationId,
      tone: groundTone,
    },
    {
      label: "Validation",
      value: validationState.state,
      sub: groundValidation.groundValidationStatus,
      tone: validationState.tone,
    },
    {
      label: "GMD Decision",
      value: alertConsole.alertLevel,
      sub: alertConsole.alertStatus,
      tone: alertTone === "muted" ? "cyan" : alertTone,
    },
  ];

  /* ---- Source / decision provenance (existing contract statuses only) ---- */
  const dataSources = [
    {
      icon: Satellite,
      name: systemStatus.noaaSatellite ? `NOAA GOES-${systemStatus.noaaSatellite}` : "NOAA GOES-18",
      type: "Space telemetry · X-ray flux",
      status: systemStatus.noaaConnectionStatus,
      tone: noaaTone,
      latest: systemStatus.noaaTimeTag ? `${systemStatus.noaaTimeTag} · ${solarTelemetry.fluxClass}` : `${solarTelemetry.fluxClass} · ${formatNumber(solarTelemetry.xrayFlux, 2)} µW/m²`,
    },
    {
      icon: Database,
      name: "Aditya-L1",
      type: "Historical · context window",
      status: systemStatus.adityaDataStatus,
      tone: adityaTone,
      latest: "Context window available",
    },
    {
      icon: Magnet,
      name: `Ground Station ${groundValidation.groundStationId}`,
      type: "Magnetometer · ground validation",
      status: groundValidation.groundStationStatus,
      tone: stationTone,
      latest: `${formatNumber(groundValidation.magneticFieldMagnitude, 1)} µT field`,
    },
    {
      icon: RadioTower,
      name: "ESP32",
      type: "Station controller",
      status: groundValidation.groundStationStatus,
      tone: stationTone,
      latest: "3-axis magnetometer link",
    },
    {
      icon: Radar,
      name: "QMC5883L",
      type: "3-axis magnetic field sensor",
      status: groundValidation.groundStationStatus,
      tone: stationTone,
      latest: `Bx ${formatSigned(groundValidation.magneticFieldX)} · By ${formatSigned(groundValidation.magneticFieldY)} · Bz ${formatSigned(groundValidation.magneticFieldZ)}`,
    },
    {
      icon: Cpu,
      name: "ML Engine",
      type: "Prediction core",
      status: systemStatus.mlEngineStatus,
      tone: mlTone,
      latest: spacePrediction.predictionSource,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="page-head">
        <div>
          <h1>
            GMD <span className="title-accent">Alert Console</span>
          </h1>
          <p className="page-sub">
            Operational decision layer for solar prediction and ground-level geomagnetic validation
          </p>
        </div>
        <LiveIndicator label={demoMode ? "Replay" : "Live"} tone={demoMode ? "amber" : "green"} />
      </div>

      <div className="sys-page">
        <OperationalStateIndicator />
        {/* ============ SECTION 1 · CURRENT ALERT COMMAND ============ */}
        <GlassPanel glow={alertTone === "red" ? "red" : alertTone === "amber" ? "amber" : undefined}>
          <div className="panel-body">
            <SectionHeader
              icon={ShieldAlert}
              title="Alert Command"
              subtitle="GMD severity · operational decision"
              actions={
                <Badge tone={alertConsole.alertAcknowledged ? "green" : "amber"}>
                  {alertConsole.alertAcknowledged ? <CheckCircle size={11} /> : <CircleDot size={11} />}
                  {alertConsole.alertAcknowledged ? "ACKNOWLEDGED" : "ACK PENDING"}
                </Badge>
              }
            />

            <div className={`command-card ${severityClass} ${isCritical ? "command-card-critical" : ""}`}>
              <div className="command-card-head">
                <span className="command-card-icon" aria-hidden="true">
                  <ShieldAlert size={22} strokeWidth={1.9} />
                </span>
                <div>
                  <div className="command-card-eyebrow">Current GMD Severity</div>
                  <div className="command-card-level">{alertConsole.alertLevel}</div>
                </div>
                <div className="command-card-meta">
                  <span className="mono command-card-time">{formatIso(alertConsole.alertTimestamp)} UTC</span>
                  <span className="mono command-card-src">SRC · {alertConsole.alertSource}</span>
                </div>
              </div>

              <div className="command-card-message">{alertConsole.alertMessage}</div>

              <div className="command-card-footer">
                <div className="cc-foot-item">
                  <span className="cc-foot-label">Prediction Status</span>
                  <span className="cc-foot-value" style={{ color: `var(--color-${predictionTone})` }}>
                    {spacePrediction.predictionStatus}
                  </span>
                </div>
                <div className="cc-foot-item">
                  <span className="cc-foot-label">Ground Validation</span>
                  <span className="cc-foot-value" style={{ color: `var(--color-${groundTone})` }}>
                    {groundValidation.groundValidationStatus} · {formatSigned(groundValidation.magneticDeviation)} µT
                  </span>
                </div>
                <div className="cc-foot-item">
                  <span className="cc-foot-label">Flare Event</span>
                  <span className="cc-foot-value" style={{ color: "var(--color-amber)" }}>
                    {spacePrediction.flareClass}
                  </span>
                </div>
                <div className="cc-foot-item">
                  <span className="cc-foot-label">Acknowledged</span>
                  <span
                    className="cc-foot-value"
                    style={{ color: alertConsole.alertAcknowledged ? "var(--color-green)" : "var(--color-amber)" }}
                  >
                    {alertConsole.alertAcknowledged ? "YES" : "PENDING"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* ============ SECTION 2 · DECISION SUMMARY ============ */}
        <div className="decision-grid">
          <GlassPanel glow="violet">
            <div className="panel-body">
              <SectionHeader
                icon={Cpu}
                title="Prediction"
                subtitle="Space · ML Engine"
                actions={<Badge tone={predictionTone}>{spacePrediction.predictionStatus}</Badge>}
              />
              <MetricValue
                hero
                label="Flare Probability"
                value={formatPercent(spacePrediction.predictionProbability)}
                tone="violet"
              />
              <div className="confidence-row">
                <span className="metric-label">Model Confidence</span>
                <span
                  className="confidence-bar"
                  role="progressbar"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow={spacePrediction.flareScore}
                >
                  <span className="confidence-fill" style={{ width: `${spacePrediction.flareScore}%` }} />
                </span>
                <span className="confidence-val">{spacePrediction.flareScore}</span>
              </div>
              <hr className="divider" />
              <MetaRow label="Flare Class">
                <span style={{ color: "var(--color-amber)" }}>{spacePrediction.flareClass}</span>
              </MetaRow>
              <MetaRow label="Flare Score">{spacePrediction.flareScore} / 100</MetaRow>
              <MetaRow label="Prediction State">{spacePrediction.predictionStatus}</MetaRow>
              <MetaRow label="Model">{spacePrediction.predictionSource}</MetaRow>
            </div>
          </GlassPanel>

          <GlassPanel glow="cyan">
            <div className="panel-body">
              <SectionHeader
                icon={Magnet}
                title="Ground Validation"
                subtitle="Confirm on Earth"
                actions={<Badge tone={validationState.tone}>{validationState.state}</Badge>}
              />
              <MetricValue
                hero
                label="Field Magnitude"
                value={formatNumber(groundValidation.magneticFieldMagnitude, 1)}
                unit="µT"
                tone="cyan"
              />
              <hr className="divider" />
              <MetaRow label="Baseline">{formatNumber(groundValidation.magneticBaseline, 1)} µT</MetaRow>
              <MetaRow label="Deviation" valueStyle={{ color: `var(--color-${groundTone})` }}>
                {formatSigned(groundValidation.magneticDeviation)} µT
              </MetaRow>
              <MetaRow label="Deviation %">
                {formatNumber(deviationPercent, 1)}% of baseline
              </MetaRow>
              <MetaRow label="Validation State">{groundValidation.groundValidationStatus}</MetaRow>
              <MetaRow label="Station ID">{groundValidation.groundStationId}</MetaRow>
            </div>
          </GlassPanel>

          <GlassPanel glow={alertTone === "red" ? "red" : alertTone === "amber" ? "amber" : undefined}>
            <div className="panel-body">
              <SectionHeader
                icon={ShieldAlert}
                title="Operational Decision"
                subtitle="GMD Alert · output"
                actions={<Badge tone={alertTone}>{alertConsole.alertLevel}</Badge>}
              />
              <MetricValue
                hero
                label="GMD Severity"
                value={alertConsole.alertLevel}
                tone={alertTone === "muted" ? "cyan" : alertTone}
              />
              <hr className="divider" />
              <MetaRow label="Alert State">{alertConsole.alertStatus}</MetaRow>
              <MetaRow label="Source">{alertConsole.alertSource}</MetaRow>
              <MetaRow
                label="Acknowledgment"
                valueStyle={{
                  color: alertConsole.alertAcknowledged ? "var(--color-green)" : "var(--color-amber)",
                }}
              >
                {alertConsole.alertAcknowledged ? "YES" : "PENDING"}
              </MetaRow>
              <MetaRow label="Alert Timestamp">{formatIso(alertConsole.alertTimestamp).slice(0, 19)} UTC</MetaRow>
            </div>
          </GlassPanel>
        </div>

        {/* ============ SECTION 3 · VALIDATION EVIDENCE ============ */}
        <GlassPanel>
          <div className="panel-body">
            <SectionHeader
              icon={Workflow}
              title="Validation Evidence"
              subtitle="Predict in Space · Confirm on Earth — the GMD alert requires ground confirmation, not solar telemetry alone"
            />
            <FlowIndicator />
            <div className="block-label">Evidence Chain · Current Values</div>
            <div className="evidence-chain">
              {evidenceSteps.map((step, index) => (
                <Fragment key={step.label}>
                  {index > 0 ? (
                    <div className="evidence-arrow" aria-hidden="true">
                      <ChevronRight size={15} />
                    </div>
                  ) : null}
                  <div className={`evidence-step tone-${step.tone}`}>
                    <span className="evidence-step-label">{step.label}</span>
                    <span className="evidence-step-value">{step.value}</span>
                    <span className="evidence-step-sub">{step.sub}</span>
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        </GlassPanel>

        {/* ============ SECTION 4 · CURRENT ALERT DETAILS + SECTION 6 · SEVERITY LADDER ============ */}
        <div className="sys-cols">
          <GlassPanel>
            <div className="panel-body">
              <SectionHeader icon={Info} title="Current Alert Details" subtitle="Technical readout · shared alert contract" />
              <div className="gmd-context">
                <div className="gmd-context-row">
                  <span className="gmd-label">
                    <CircleDot size={10} style={{ color: `var(--color-${alertTone === "muted" ? "cyan" : alertTone})` }} />
                    GMD Alert State
                  </span>
                  <span className="gmd-value" style={{ color: `var(--color-${alertTone === "muted" ? "cyan" : alertTone})` }}>
                    {alertConsole.alertLevel} · {alertConsole.alertStatus}
                  </span>
                </div>
                <div className="gmd-context-row">
                  <span className="gmd-label">Severity</span>
                  <span className="gmd-value" style={{ color: `var(--color-${alertTone === "muted" ? "cyan" : alertTone})` }}>
                    {alertConsole.alertLevel}
                  </span>
                </div>
                <div className="gmd-context-row">
                  <span className="gmd-label">Timestamp</span>
                  <span className="gmd-value" style={{ color: "var(--color-text-muted)" }}>
                    {formatIso(alertConsole.alertTimestamp)} UTC
                  </span>
                </div>
                <div className="gmd-context-row">
                  <span className="gmd-label">Source</span>
                  <span className="gmd-value">{alertConsole.alertSource}</span>
                </div>
                <div className="gmd-context-row">
                  <span className="gmd-label">Acknowledgment</span>
                  <span
                    className="gmd-value"
                    style={{ color: alertConsole.alertAcknowledged ? "var(--color-green)" : "var(--color-amber)" }}
                  >
                    {alertConsole.alertAcknowledged ? "ACKNOWLEDGED" : "ACK PENDING"}
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

              <div className="alert-context-message">
                <span className="block-label">Operational Message</span>
                <p>{alertConsole.alertMessage}</p>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel>
            <div className="panel-body">
              <SectionHeader
                icon={Layers}
                title="GMD Severity Ladder"
                subtitle="Active level · derived from alert state"
              />
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
              <div className="ladder-legend">
                <span className="metric-label">Current Level</span>
                <Badge tone={alertTone}>
                  {alertConsole.alertLevel} · {alertConsole.alertStatus}
                </Badge>
              </div>
              <p className="ladder-note">
                The active level is derived from the existing alert state. As the replay escalates
                ADVISORY → WARNING → CRITICAL, this ladder highlights automatically.
              </p>
            </div>
          </GlassPanel>
        </div>

        {/* ============ SECTION 5 · ALERT EVENT HISTORY ============ */}
        <GlassPanel>
          <div className="panel-body">
            <SectionHeader
              icon={Clock}
              title="Alert Event History"
              subtitle={`${alertHistory.length} recorded events · newest first`}
            />
            <AlertEventList events={alertHistory} variant="page" />
          </div>
        </GlassPanel>

        {/* ============ SECTION 7 · DATA SOURCES / PROVENANCE ============ */}
        <GlassPanel>
          <div className="panel-body">
            <SectionHeader
              icon={Satellite}
              title="Decision Provenance"
              subtitle="Sources contributing to the current alert · existing statuses only"
            />
            <div className="sys-source-grid">
              {dataSources.map((source) => {
                const Icon = source.icon;
                return (
                  <div className="source-row" key={source.name}>
                    <div className="source-icon">
                      <Icon size={15} />
                    </div>
                    <div>
                      <div className="source-name">{source.name}</div>
                      <div className="source-sub">{source.type}</div>
                      <div className="sys-source-latest">{source.latest}</div>
                    </div>
                    <div className="source-status">
                      <StatusIndicator tone={source.tone} label={source.status} pulse={source.tone === "amber"} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </GlassPanel>

        <GlassPanel>
          <div className="panel-body">
            <div className="notice">
              <Info className="notice-icon" size={16} />
              <span>
                ALERT CONSOLE · DEMO REPLAY — Severity, validation and event history are driven by the
                shared mock-data / replay layer. REST and WebSocket transports are prepared in /services
                but not yet connected. All values shown originate from the shared data layer and are
                labelled DEMO / REPLAY.
              </span>
            </div>
          </div>
        </GlassPanel>
      </div>
    </motion.div>
  );
}
