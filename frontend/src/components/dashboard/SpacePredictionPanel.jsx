import { Orbit, Satellite, Database, Radio } from "lucide-react";
import GlassPanel from "../common/GlassPanel";
import SectionHeader from "../common/SectionHeader";
import MetricValue from "../common/MetricValue";
import Badge from "../common/Badge";
import StatusIndicator from "../common/StatusIndicator";
import TelemetryChart from "../common/TelemetryChart";
import { CONNECTION_TONES } from "../../constants";
import { useSystemData } from "../../hooks/useSystemData";
import { formatIso, formatPercent, formatNumber } from "../../utils/format";

export default function SpacePredictionPanel() {
  const { spacePrediction, solarTelemetry, solarFluxSeries, systemStatus, demoMode } = useSystemData();

  const noaaTone = CONNECTION_TONES[systemStatus.noaaConnectionStatus] || "muted";
  const adityaTone = CONNECTION_TONES[systemStatus.adityaDataStatus] || "muted";
  const statusTone =
    spacePrediction.predictionStatus === "CRITICAL"
      ? "red"
      : spacePrediction.predictionStatus === "WARNING"
        ? "amber"
        : "violet";

  return (
    <GlassPanel glow="violet">
      <div className="panel-body">
        <SectionHeader
          icon={Orbit}
          title="Space Prediction"
          subtitle="Prediction in Space · NOAA + Aditya-L1 · ML"
          actions={
            <Badge tone="muted" icon={Radio}>
              {demoMode ? "Replay" : "Live"}
            </Badge>
          }
        />

        {/* Data sources */}
        <div className="source-row">
          <div className="source-icon">
            <Satellite size={15} />
          </div>
          <div>
            <div className="source-name">NOAA GOES-18</div>
            <div className="source-sub">X-ray flux · space telemetry</div>
          </div>
          <div className="source-status">
            <StatusIndicator
              tone={noaaTone}
              label={systemStatus.noaaConnectionStatus}
              pulse={systemStatus.noaaConnectionStatus === "REPLAY"}
            />
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
            <StatusIndicator tone={adityaTone} label={systemStatus.adityaDataStatus} />
          </div>
        </div>

        {/* Primary probability */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <MetricValue
            hero
            label="Flare Probability"
            value={formatPercent(spacePrediction.predictionProbability)}
            tone="violet"
          />
          <div style={{ textAlign: "right" }}>
            <Badge tone={statusTone}>{spacePrediction.predictionStatus}</Badge>
          </div>
        </div>

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
          <MetricValue
            label="X-Ray Flux"
            value={formatNumber(solarTelemetry.xrayFlux, 2)}
            unit="µW/m²"
            tone="cyan"
          />
          <MetricValue
            label="Flux Class"
            value={solarTelemetry.fluxClass}
            tone="muted"
          />
        </div>

        <div className="metric" style={{ marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
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

        <div className="metric" style={{ marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <span className="metric-label">Model</span>
          <span className="mono" style={{ fontSize: 10.5, color: "var(--color-text-secondary)", letterSpacing: "0.06em" }}>
            {spacePrediction.predictionSource}
          </span>
        </div>

        <hr className="divider" />

        <div className="chart-block">
          <div className="chart-block-head">
            <span className="chart-block-title">Solar X-ray Flux</span>
            <span className="chart-block-sub">NOAA GOES-18 · {solarTelemetry.fluxClass}</span>
          </div>
          <TelemetryChart
            data={solarFluxSeries}
            dataKey="xrayFlux"
            color="amber"
            unit="µW/m²"
            label="X-Ray Flux"
            height={150}
          />
        </div>
      </div>
    </GlassPanel>
  );
}
