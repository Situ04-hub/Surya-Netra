import {
  Satellite,
  Cpu,
  Magnet,
  RadioTower,
  ShieldAlert,
  Database,
  Radar,
  Workflow,
  Info,
  CheckCircle,
  CircleDot,
} from "lucide-react";
import { motion } from "framer-motion";
import GlassPanel from "../components/common/GlassPanel";
import SectionHeader from "../components/common/SectionHeader";
import StatusIndicator from "../components/common/StatusIndicator";
import Badge from "../components/common/Badge";
import MetricValue from "../components/common/MetricValue";
import LiveIndicator from "../components/common/LiveIndicator";
import AlertEventList from "../components/common/AlertEventList";
import TelemetryChart from "../components/common/TelemetryChart";
import FlowIndicator from "../components/dashboard/FlowIndicator";
import GroundSignalIndicator from "../components/dashboard/GroundSignalIndicator";
import OperationalStateIndicator from "../components/common/OperationalStateIndicator";
import { APP, CONNECTION_TONES, ALERT_TONES, ALERT_LEVELS } from "../constants";
import { useSystemData } from "../hooks/useSystemData";
import { formatIso, formatNumber, formatPercent, formatSigned } from "../utils/format";
import { deriveValidationState } from "../utils/validation";

const SENSOR_META = [
  ["Station ID", null],
  ["Device", "ESP32"],
  ["Sensor", "QMC5883L"],
  ["Measurement", "Magnetic Field"],
  ["Unit", "µT"],
  ["Stream", "Ground Telemetry"],
];

export default function SystemPage() {
  const {
    systemStatus,
    demoMode,
    solarTelemetry,
    spacePrediction,
    groundValidation,
    magneticSeries,
    alertConsole,
    alertHistory,
  } = useSystemData();

  /* ---- Shared-state derivations (existing contract only) ---- */
  const noaaTone = CONNECTION_TONES[systemStatus.noaaConnectionStatus] || "muted";
  const adityaTone = CONNECTION_TONES[systemStatus.adityaDataStatus] || "muted";
  const mlTone = CONNECTION_TONES[systemStatus.mlEngineStatus] || "muted";
  const stationTone = CONNECTION_TONES[groundValidation.groundStationStatus] || "muted";
  const alertTone = ALERT_TONES[alertConsole.alertLevel] || "muted";
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

  const deviation = Math.abs(groundValidation.magneticDeviation);
  const deviationTone = deviation > 5 ? "red" : deviation > 2 ? "amber" : "green";
  const deviationPercent = groundValidation.magneticBaseline
    ? (deviation / groundValidation.magneticBaseline) * 100
    : 0;
  const validationState = deriveValidationState(
    groundValidation.groundValidationStatus,
    groundValidation.magneticDeviation,
  );

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

  /* ---- System health overview cards ---- */
  const healthCards = [
    {
      key: "telemetry",
      icon: Satellite,
      name: "Space Telemetry",
      state: systemStatus.noaaConnectionStatus,
      tone: noaaTone,
      info: `${solarTelemetry.fluxClass} · ${formatNumber(solarTelemetry.xrayFlux, 2)} µW/m²`,
      updated: solarTelemetry.timestamp,
    },
    {
      key: "ml",
      icon: Cpu,
      name: "ML Prediction",
      state: spacePrediction.predictionStatus,
      tone: predictionTone,
      info: `${spacePrediction.flareClass} · ${formatPercent(spacePrediction.predictionProbability)}`,
      updated: spacePrediction.predictionTimestamp,
    },
    {
      key: "ground",
      icon: Magnet,
      name: "Ground Validation",
      state: groundValidation.groundValidationStatus,
      tone: groundTone,
      info: `${formatNumber(groundValidation.magneticFieldMagnitude, 1)} µT · Δ${formatSigned(groundValidation.magneticDeviation)}`,
      updated: groundValidation.groundValidationTimestamp,
    },
    {
      key: "alert",
      icon: ShieldAlert,
      name: "GMD Alert",
      state: alertConsole.alertLevel,
      tone: alertTone,
      info: `${alertConsole.alertStatus} · ${alertConsole.alertSource}`,
      updated: alertConsole.alertTimestamp,
    },
  ];

  /* ---- Data source rows ---- */
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
            System <span className="title-accent">Status</span>
          </h1>
          <p className="page-sub">
            Operational health of the {APP.name} prediction, validation and alert pipeline
          </p>
        </div>
        <LiveIndicator label={demoMode ? "Replay" : "Live"} tone={demoMode ? "amber" : "green"} />
      </div>

      <div className="sys-page">
        <OperationalStateIndicator />
      {/* 1. System health overview */}
      <div className="sys-health-grid">
        {healthCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.key}
              className={`sys-health-card tone-${card.tone}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * healthCards.indexOf(card), duration: 0.35, ease: "easeOut" }}
            >
              <div className="sys-health-head">
                <span className="sys-health-icon" aria-hidden="true">
                  <Icon size={14} strokeWidth={1.9} />
                </span>
                <span className="sys-health-name">{card.name}</span>
                <StatusIndicator
                  tone={card.tone}
                  label={card.state}
                  pulse={card.tone === "red" || card.tone === "amber"}
                />
              </div>
              <div className="sys-health-state">{card.state}</div>
              <div className="sys-health-info">{card.info}</div>
              <div className="sys-health-updated">Updated {formatIso(card.updated)} UTC</div>
            </motion.div>
          );
        })}
      </div>

      {/* 2. Data source status */}
      <GlassPanel>
        <div className="panel-body">
          <SectionHeader
            icon={Satellite}
            title="Data Source Status"
            subtitle={`Integration matrix · last sync ${formatIso(systemStatus.lastUpdated)} UTC`}
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

      {/* 3. Pipeline health (existing FlowIndicator shared state) */}
      <GlassPanel>
        <div className="panel-body">
          <SectionHeader
            icon={Workflow}
            title="Pipeline Health"
            subtitle="Space Telemetry → ML Prediction → Ground Validation → GMD Alert"
          />
          <FlowIndicator />
        </div>
      </GlassPanel>

      {/* 4. Ground station + ML engine */}
      <div className="sys-cols">
        <GlassPanel glow="cyan">
          <div className="panel-body">
            <SectionHeader
              icon={Magnet}
              title="Ground Station Health"
              subtitle={`ESP32 · QMC5883L · ${groundValidation.groundStationId}`}
              actions={<Badge tone={stationTone}>{groundValidation.groundStationStatus}</Badge>}
            />

            <div className="ground-primary">
              <GroundSignalIndicator deviation={groundValidation.magneticDeviation} />
              <div className="ground-primary-value">
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
              </div>
            </div>

            <div className="hw-grid">
              <div className="hw-card">
                <MetricValue label="Magnetic Field" value={groundValidation.magneticFieldMagnitude} unit="µT" tone="cyan" />
                <span className="hw-card-sub">current field</span>
              </div>
              <div className="hw-card">
                <MetricValue label="Baseline" value={groundValidation.magneticBaseline} unit="µT" tone="muted" />
                <span className="hw-card-sub">quiet reference</span>
              </div>
              <div className="hw-card">
                <MetricValue label="Deviation" value={formatSigned(groundValidation.magneticDeviation)} unit="µT" tone={deviationTone} />
                <span className="hw-card-sub">{formatNumber(deviationPercent, 1)}% of baseline</span>
              </div>
              <div className="hw-card">
                <span className="metric-label">Validation State</span>
                <Badge tone={validationState.tone}>{validationState.state}</Badge>
                <span className="hw-card-sub">{groundValidation.groundValidationStatus}</span>
              </div>
              <div className="hw-card">
                <span className="metric-label">Station Status</span>
                <StatusIndicator tone={stationTone} label={groundValidation.groundStationStatus} pulse={stationTone === "green"} />
                <span className="hw-card-sub">{groundValidation.groundStationId}</span>
              </div>
            </div>

            <div className="sensor-meta">
              {SENSOR_META.map(([label, value]) => (
                <div className="sensor-meta-item" key={label}>
                  <span className="sensor-meta-label">{label}</span>
                  <span className="sensor-meta-value">
                    {value || groundValidation.groundStationId}
                  </span>
                </div>
              ))}
            </div>

            <div className="chart-block">
              <div className="chart-block-head">
                <span className="chart-block-title">Magnetic Field History</span>
                <span className="chart-block-sub">magnitude · {groundValidation.groundStationId}</span>
              </div>
              <TelemetryChart
                data={magneticSeries}
                dataKey="magneticFieldMagnitude"
                color="cyan"
                unit="µT"
                label="Magnitude"
                height={120}
                baseline={groundValidation.magneticBaseline}
                band={band}
              />
            </div>
          </div>
        </GlassPanel>

        <GlassPanel glow="violet">
          <div className="panel-body">
            <SectionHeader
              icon={Cpu}
              title="ML Engine Status"
              subtitle={spacePrediction.predictionSource}
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
              <span className="confidence-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={spacePrediction.flareScore}>
                <span className="confidence-fill" style={{ width: `${spacePrediction.flareScore}%` }} />
              </span>
              <span className="confidence-val">{spacePrediction.flareScore}</span>
            </div>

            <hr className="divider" />

            <div className="metric-grid">
              <MetricValue label="Flare Class" value={spacePrediction.flareClass} tone="amber" />
              <MetricValue label="Flare Score" value={spacePrediction.flareScore} tone="muted" />
            </div>

            <div className="metric" style={{ marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <span className="metric-label">Prediction Window</span>
              <span className="mono" style={{ fontSize: 10.5, color: "var(--color-text-muted)", letterSpacing: "0.06em" }}>
                {formatIso(spacePrediction.predictionTimestamp)} UTC
              </span>
            </div>

            <div className="metric" style={{ marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <span className="metric-label">Model</span>
              <span className="mono" style={{ fontSize: 10.5, color: "var(--color-text-secondary)", letterSpacing: "0.06em" }}>
                {spacePrediction.predictionSource}
              </span>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* 5. Alert / decision status */}
      <GlassPanel glow={alertTone === "red" ? "red" : alertTone === "amber" ? "amber" : undefined}>
        <div className="panel-body">
          <SectionHeader
            icon={ShieldAlert}
            title="Alert / Decision Status"
            subtitle="GMD severity · operational decision"
            actions={<Badge tone={alertTone}>{alertConsole.alertLevel}</Badge>}
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

          <div className="sys-cols">
            <div className={`current-alert severity-${alertTone}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Badge tone={alertTone}>
                  {alertConsole.alertAcknowledged ? <CheckCircle size={11} /> : <CircleDot size={11} />}
                  {alertConsole.alertStatus}
                </Badge>
                <span className="mono" style={{ marginLeft: "auto", fontSize: 9.5, color: "var(--color-text-muted)", letterSpacing: "0.06em" }}>
                  {formatIso(alertConsole.alertTimestamp)} UTC
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: "var(--color-text-secondary)" }}>
                {alertConsole.alertMessage}
              </p>
              <div className="gmd-context" style={{ marginTop: 12 }}>
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
                <div className="gmd-context-row">
                  <span className="gmd-label">Source</span>
                  <span className="gmd-value">{alertConsole.alertSource}</span>
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span className="metric-label">Event History</span>
                <span className="mono" style={{ fontSize: 9.5, color: "var(--color-text-muted)" }}>
                  {alertHistory.length} events
                </span>
              </div>
              <AlertEventList events={alertHistory} variant="page" limit={4} />
            </div>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel>
        <div className="panel-body">
          <div className="notice">
            <Info className="notice-icon" size={16} />
            <span>
              DATA DISCLOSURE — The frontend currently renders the DEMO / REPLAY mock-data layer.
              No claim is made that values are live NOAA, Aditya-L1, or ground-station measurements.
              Integration with the FastAPI backend and hardware stream is a later phase.
            </span>
          </div>
        </div>
      </GlassPanel>
      </div>
    </motion.div>
  );
}
