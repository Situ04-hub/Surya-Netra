import {
  Sun,
  Satellite,
  Cpu,
  Magnet,
  RadioTower,
  Database,
  Radar,
  Gauge,
  Activity,
  Workflow,
  Clock,
  Info,
} from "lucide-react";
import { motion } from "framer-motion";
import GlassPanel from "../components/common/GlassPanel";
import SectionHeader from "../components/common/SectionHeader";
import StatusIndicator from "../components/common/StatusIndicator";
import Badge from "../components/common/Badge";
import MetricValue from "../components/common/MetricValue";
import LiveIndicator from "../components/common/LiveIndicator";
import TelemetryChart from "../components/common/TelemetryChart";
import FlowIndicator from "../components/dashboard/FlowIndicator";
import GroundSignalIndicator from "../components/dashboard/GroundSignalIndicator";
import OperationalStateIndicator from "../components/common/OperationalStateIndicator";
import { CONNECTION_TONES } from "../constants";
import { useSystemData } from "../hooks/useSystemData";
import { formatIso, formatNumber, formatPercent, formatSigned } from "../utils/format";
import { deriveValidationState } from "../utils/validation";

export default function TelemetryPage() {
  const {
    systemStatus,
    demoMode,
    solarTelemetry,
    solarFluxSeries,
    spacePrediction,
    groundValidation,
    magneticSeries,
  } = useSystemData();

  /* ---- Existing-contract tones ---- */
  const noaaTone = CONNECTION_TONES[systemStatus.noaaConnectionStatus] || "muted";
  const adityaTone = CONNECTION_TONES[systemStatus.adityaDataStatus] || "muted";
  const mlTone = CONNECTION_TONES[systemStatus.mlEngineStatus] || "muted";
  const stationTone = CONNECTION_TONES[groundValidation.groundStationStatus] || "muted";

  const predictionTone =
    spacePrediction.predictionStatus === "CRITICAL"
      ? "red"
      : spacePrediction.predictionStatus === "WARNING"
        ? "amber"
        : "violet";

  const deviation = Math.abs(groundValidation.magneticDeviation);
  const deviationTone = deviation > 5 ? "red" : deviation > 2 ? "amber" : "green";
  const deviationPercent = groundValidation.magneticBaseline
    ? (deviation / groundValidation.magneticBaseline) * 100
    : 0;
  const validationState = deriveValidationState(
    groundValidation.groundValidationStatus,
    groundValidation.magneticDeviation,
  );

  /* Chart deviation band from the existing series + baseline */
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

  /* ---- Overview tiles: solar (amber) vs ground (cyan) vs ML (violet) ---- */
  const overviewTiles = [
    {
      key: "solar",
      icon: Sun,
      tone: "amber",
      status: solarTelemetry.fluxClass,
      value: formatNumber(solarTelemetry.xrayFlux, 2),
      unit: "µW/m²",
      sub: "Solar X-ray flux",
    },
    {
      key: "ground",
      icon: Magnet,
      tone: "cyan",
      status: groundValidation.groundValidationStatus,
      value: formatNumber(groundValidation.magneticFieldMagnitude, 1),
      unit: "µT",
      sub: `Ground station ${groundValidation.groundStationId}`,
    },
    {
      key: "baseline",
      icon: Gauge,
      tone: "cyan",
      status: groundValidation.groundStationStatus,
      value: formatNumber(groundValidation.magneticBaseline, 1),
      unit: "µT",
      sub: "Baseline reference",
    },
    {
      key: "deviation",
      icon: Activity,
      tone: deviationTone,
      status: validationState.state,
      value: formatSigned(groundValidation.magneticDeviation),
      unit: "µT",
      sub: "Deviation from baseline",
    },
    {
      key: "ml",
      icon: Cpu,
      tone: predictionTone,
      status: spacePrediction.predictionStatus,
      value: formatPercent(spacePrediction.predictionProbability),
      sub: "ML prediction probability",
    },
    {
      key: "latest",
      icon: Clock,
      tone: demoMode ? "amber" : "green",
      status: demoMode ? "REPLAY" : "LIVE",
      value: formatIso(solarTelemetry.timestamp).slice(11),
      sub: "Latest telemetry",
    },
  ];

  /* ---- Source health rows (existing contract statuses only) ---- */
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
            Live <span className="title-accent">Telemetry</span>
          </h1>
          <p className="page-sub">
            Incoming solar and ground telemetry consumed by the prediction / validation pipeline
          </p>
        </div>
        <LiveIndicator label={demoMode ? "Replay" : "Live"} tone={demoMode ? "amber" : "green"} />
      </div>

      <div className="sys-page">
        {/* 1. Telemetry overview */}
        <div className="telemetry-overview">
          <OperationalStateIndicator />
          {overviewTiles.map((tile, index) => {
            const Icon = tile.icon;
            return (
              <motion.div
                key={tile.key}
                className={`overview-tile tone-${tile.tone}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * index, duration: 0.35, ease: "easeOut" }}
              >
                <div className="overview-tile-head">
                  <span className="overview-tile-icon" aria-hidden="true">
                    <Icon size={14} strokeWidth={1.9} />
                  </span>
                  <StatusIndicator
                    tone={tile.tone}
                    label={tile.status}
                    pulse={tile.tone === "amber" || tile.tone === "red"}
                  />
                </div>
                <div className="overview-tile-value">
                  {tile.value}
                  {tile.unit ? <span className="overview-tile-unit">{tile.unit}</span> : null}
                </div>
                <div className="overview-tile-sub">{tile.sub}</div>
              </motion.div>
            );
          })}
        </div>

        {/* 2. Solar / space telemetry */}
        <div className="sys-cols">
          <GlassPanel glow="amber">
            <div className="panel-body">
              <SectionHeader
                icon={Satellite}
                title="Solar X-Ray Telemetry"
                subtitle="NOAA GOES-18 · X-ray flux"
                actions={<Badge tone="amber">{solarTelemetry.fluxClass}</Badge>}
              />
              <TelemetryChart
                data={solarFluxSeries}
                dataKey="xrayFlux"
                color="amber"
                unit="µW/m²"
                label="X-Ray Flux"
                height={240}
              />
              <hr className="divider" />
              <div className="metric-grid">
                <MetricValue label="X-Ray Flux" value={formatNumber(solarTelemetry.xrayFlux, 2)} unit="µW/m²" tone="amber" />
                <MetricValue label="Flux Class" value={solarTelemetry.fluxClass} tone="amber" />
                <MetricValue label="Latest Telemetry" value={formatIso(solarTelemetry.timestamp).slice(11)} tone="muted" />
              </div>
            </div>
          </GlassPanel>

          <GlassPanel>
            <div className="panel-body">
              <SectionHeader icon={Sun} title="Solar Activity Context" subtitle="Sources · replay status" />
              <div className="source-row">
                <div className="source-icon">
                  <Satellite size={15} />
                </div>
                <div>
                  <div className="source-name">NOAA GOES-18</div>
                  <div className="source-sub">Space telemetry · X-ray flux</div>
                </div>
                <div className="source-status">
                  <StatusIndicator tone={noaaTone} label={systemStatus.noaaConnectionStatus} pulse={noaaTone === "amber"} />
                </div>
              </div>
              <div className="source-row">
                <div className="source-icon">
                  <Database size={15} />
                </div>
                <div>
                  <div className="source-name">Aditya-L1</div>
                  <div className="source-sub">Historical · context window</div>
                </div>
                <div className="source-status">
                  <StatusIndicator tone={adityaTone} label={systemStatus.adityaDataStatus} pulse={adityaTone === "green"} />
                </div>
              </div>
              <hr className="divider" />
              <div className="metric" style={{ marginTop: 2, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <span className="metric-label">X-Ray Flux</span>
                <span className="mono" style={{ fontSize: 10.5, color: "var(--color-amber)", letterSpacing: "0.06em" }}>
                  {formatNumber(solarTelemetry.xrayFlux, 2)} µW/m²
                </span>
              </div>
              <div className="metric" style={{ marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <span className="metric-label">Flux Class</span>
                <span className="mono" style={{ fontSize: 10.5, color: "var(--color-amber)", letterSpacing: "0.06em" }}>
                  {solarTelemetry.fluxClass}
                </span>
              </div>
              <div className="metric" style={{ marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <span className="metric-label">Flare Class</span>
                <span className="mono" style={{ fontSize: 10.5, color: `var(--color-${predictionTone})`, letterSpacing: "0.06em" }}>
                  {spacePrediction.flareClass}
                </span>
              </div>
              <div className="metric" style={{ marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <span className="metric-label">Last Telemetry</span>
                <span className="mono" style={{ fontSize: 10.5, color: "var(--color-text-muted)", letterSpacing: "0.06em" }}>
                  {formatIso(solarTelemetry.timestamp)} UTC
                </span>
              </div>
              <div className="metric" style={{ marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <span className="metric-label">Prediction Window</span>
                <span className="mono" style={{ fontSize: 10.5, color: "var(--color-text-muted)", letterSpacing: "0.06em" }}>
                  {formatIso(spacePrediction.predictionTimestamp)} UTC
                </span>
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* 3. Magnetic / ground telemetry */}
        <div className="sys-cols">
          <GlassPanel glow="cyan">
            <div className="panel-body">
              <SectionHeader
                icon={Magnet}
                title="Ground Sensor Telemetry"
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

              <div className="block-label">Three-Axis Sensor · QMC5883L</div>
              <div className="axis-grid">
                <div className="axis-cell">
                  <span className="axis-label">BX</span>
                  <span className="axis-value">
                    {formatSigned(groundValidation.magneticFieldX)}
                    <span className="axis-unit">µT</span>
                  </span>
                </div>
                <div className="axis-cell">
                  <span className="axis-label">BY</span>
                  <span className="axis-value">
                    {formatSigned(groundValidation.magneticFieldY)}
                    <span className="axis-unit">µT</span>
                  </span>
                </div>
                <div className="axis-cell">
                  <span className="axis-label">BZ</span>
                  <span className="axis-value">
                    {formatSigned(groundValidation.magneticFieldZ)}
                    <span className="axis-unit">µT</span>
                  </span>
                </div>
              </div>

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

          <GlassPanel glow="cyan">
            <div className="panel-body">
              <SectionHeader
                icon={Activity}
                title="Magnetic Field History"
                subtitle="magnitude · baseline reference"
                actions={<Badge tone="muted">{groundValidation.groundStationId}</Badge>}
              />
              <TelemetryChart
                data={magneticSeries}
                dataKey="magneticFieldMagnitude"
                color="cyan"
                unit="µT"
                label="Magnitude"
                height={240}
                baseline={groundValidation.magneticBaseline}
                band={band}
              />
              <hr className="divider" />
              <div className="metric-grid">
                <MetricValue label="Baseline" value={groundValidation.magneticBaseline} unit="µT" tone="muted" />
                <MetricValue label="Current" value={groundValidation.magneticFieldMagnitude} unit="µT" tone="cyan" />
                <MetricValue label="Deviation" value={formatSigned(groundValidation.magneticDeviation)} unit="µT" tone={deviationTone} />
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* 4. Telemetry pipeline context */}
        <GlassPanel>
          <div className="panel-body">
            <SectionHeader
              icon={Workflow}
              title="Telemetry Pipeline"
              subtitle="Telemetry is the input to prediction, ground validation and the GMD decision"
            />
            <FlowIndicator />
          </div>
        </GlassPanel>

        {/* 5. Source health */}
        <GlassPanel>
          <div className="panel-body">
            <SectionHeader
              icon={Satellite}
              title="Source Health"
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

        <GlassPanel>
          <div className="panel-body">
            <div className="notice">
              <Info className="notice-icon" size={16} />
              <span>
                TELEMETRY VIEW · DEMO REPLAY — Charts render the shared mock-data / replay series.
                REST and WebSocket transports are prepared in /services but not yet connected.
                All values shown originate from the shared data layer and are labelled DEMO / REPLAY.
              </span>
            </div>
          </div>
        </GlassPanel>
      </div>
    </motion.div>
  );
}
