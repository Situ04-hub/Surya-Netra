import { Sun, Cpu, Magnet, Bell } from "lucide-react";
import { motion } from "framer-motion";
import StatusIndicator from "../common/StatusIndicator";
import { ALERT_TONES, CONNECTION_TONES } from "../../constants";
import { useSystemData } from "../../hooks/useSystemData";
import { formatNumber, formatPercent } from "../../utils/format";

export default function SystemOverviewStrip() {
  const { solarTelemetry, spacePrediction, groundValidation, alertConsole } = useSystemData();

  const stationTone = CONNECTION_TONES[groundValidation.groundStationStatus] || "muted";
  const alertTone = ALERT_TONES[alertConsole.alertLevel] || "muted";
  const predictionTone =
    spacePrediction.predictionStatus === "CRITICAL"
      ? "red"
      : spacePrediction.predictionStatus === "WARNING"
        ? "amber"
        : "violet";

  const tiles = [
    {
      key: "solar",
      icon: Sun,
      tone: "amber",
      status: solarTelemetry.fluxClass,
      value: formatNumber(solarTelemetry.xrayFlux, 2),
      unit: "µW/m²",
      sub: "Solar X-ray activity",
    },
    {
      key: "ml",
      icon: Cpu,
      tone: predictionTone,
      status: spacePrediction.predictionStatus,
      value: formatPercent(spacePrediction.predictionProbability),
      sub: "ML prediction probability",
      pulse: predictionTone !== "violet",
    },
    {
      key: "ground",
      icon: Magnet,
      tone: stationTone,
      status: groundValidation.groundStationStatus,
      value: formatNumber(groundValidation.magneticFieldMagnitude, 1),
      unit: "µT",
      sub: `Ground station · ${groundValidation.groundStationId}`,
    },
    {
      key: "alert",
      icon: Bell,
      tone: alertTone,
      status: alertConsole.alertStatus,
      value: alertConsole.alertLevel,
      sub: "GMD alert state",
      pulse: alertTone !== "green",
    },
  ];

  return (
    <div className="overview-strip">
      {tiles.map((tile, index) => {
        const Icon = tile.icon;
        return (
          <motion.div
            key={tile.key}
            className={`overview-tile tone-${tile.tone}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index, duration: 0.35, ease: "easeOut" }}
          >
            <div className="overview-tile-head">
              <span className="overview-tile-icon" aria-hidden="true">
                <Icon size={14} strokeWidth={1.9} />
              </span>
              <StatusIndicator tone={tile.tone} label={tile.status} pulse={tile.pulse} />
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
  );
}
