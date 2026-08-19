/* ============================================================
   SURYA-NETRA REPLAY SIMULATION (mock data layer)
   ------------------------------------------------------------
   PURPOSE
   Drives the judging/demo story through the shared state so every
   panel reacts consistently without per-component hard-coding:

     1. Satellite/replay telemetry rises          → prediction probability climbs
     2. Ground station telemetry changes          → magnetic deviation grows
     3. Ground validation status reacts           → BASELINE → VALIDATING → CONFIRMED
     4. Alert Console escalates                   → ADVISORY → WARNING → CRITICAL

   CONTRACT
   Every snapshot returned has the EXACT same shapes and field names
   as /data/mockData — the stable backend contract. When the FastAPI
   backend + WebSocket stream arrive, this module is swapped out for
   the services layer; components never change.
   ============================================================ */

import { mockData } from "./mockData";

export const REPLAY_TICK_MS = 2000;
export const REPLAY_CYCLE_MS = 72000; // one full story cycle
export const REPLAY_START_T = 0.3; // start near the seeded mock state
export const REPLAY_START_OFFSET_MS = Math.round(REPLAY_CYCLE_MS * REPLAY_START_T);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;

/* Story curve — returns the target X-ray flux (µW/m²) and magnetic
   deviation (µT) for a point t inside the replay cycle [0, 1). */
function storyAt(t) {
  if (t < 0.35) {
    const p = t / 0.35;
    return { flux: lerp(1.8, 5.2, p), dev: lerp(1.0, 1.4, p) };
  }
  if (t < 0.7) {
    const p = (t - 0.35) / 0.35;
    return { flux: lerp(5.2, 8.8, p), dev: lerp(1.4, 4.8, p) };
  }
  if (t < 0.9) {
    const p = (t - 0.7) / 0.2;
    return { flux: lerp(8.8, 12.0, p), dev: lerp(4.8, 9.2, p) };
  }
  return { flux: 12.0, dev: 9.2 };
}

function probabilityAt(t) {
  if (t < 0.35) return lerp(0.3, 0.72, t / 0.35);
  if (t < 0.7) return lerp(0.72, 0.86, (t - 0.35) / 0.35);
  if (t < 0.9) return lerp(0.86, 0.93, (t - 0.7) / 0.2);
  return 0.93;
}

const statusFromProb = (p) =>
  p < 0.5 ? "MONITORING" : p < 0.75 ? "ELEVATED" : p < 0.9 ? "WARNING" : "CRITICAL";

const alertAt = (t) => (t < 0.35 ? "ADVISORY" : t < 0.7 ? "WARNING" : "CRITICAL");

const fluxClassAt = (flux) => (flux >= 10 ? "X-class" : flux >= 6 ? "M-class" : "C-class");

const flareClassAt = (flux) => {
  if (flux >= 10) return `X${(flux - 9.7).toFixed(1)}`;
  if (flux >= 6) return `M${(flux - 5.6).toFixed(1)}`;
  return `C${(1.1 + flux * 0.4).toFixed(1)}`;
};

const flareScoreAt = (p) => Math.round(clamp(58 + p * 42, 0, 99));

const validationAt = (dev) => (dev < 1.6 ? "BASELINE" : dev < 5.0 ? "VALIDATING" : "CONFIRMED");

const ALERT_COPY = {
  ADVISORY: {
    message:
      "Elevated solar activity detected. GOES X-ray flux rising above M1 threshold; ground validation monitoring.",
    source: "ML ENGINE",
  },
  WARNING: {
    message:
      "GMD WARNING — rising geomagnetic disturbance being validated at SN-GND-01. Deviation above 4 µT.",
    source: "GROUND VALIDATION",
  },
  CRITICAL: {
    message: "CRITICAL — Geomagnetic disturbance confirmed at SN-GND-01. GMD alert is active.",
    source: "GROUND VALIDATION",
  },
};

export function buildReplaySnapshot(elapsedMs) {
  const now = Date.now();
  const t = ((elapsedMs % REPLAY_CYCLE_MS) / REPLAY_CYCLE_MS + 1) % 1;
  const { flux, dev } = storyAt(t);
  const prob = probabilityAt(t);
  const alertLevel = alertAt(t);
  const copy = ALERT_COPY[alertLevel];
  const nowIso = new Date(now).toISOString();

  const baseline = mockData.groundValidation.magneticBaseline;
  const magnitude = baseline + dev;
  const magneticFieldX = mockData.groundValidation.magneticFieldX + dev * 0.15;
  const magneticFieldY = mockData.groundValidation.magneticFieldY - dev * 0.3;
  const magneticFieldZ = mockData.groundValidation.magneticFieldZ + dev * 0.6;

  const solarFluxSeries = [];
  const magneticSeries = [];
  const span = 13;
  for (let i = span - 1; i >= 0; i -= 1) {
    const k = span - 1 - i;
    const ti = Math.max(t - k / span, 0);
    const s = storyAt(ti);
    const ts = new Date(now - k * 2 * 60000).toISOString();
    solarFluxSeries.push({
      timestamp: ts,
      xrayFlux: Number((s.flux + (Math.random() - 0.5) * 0.16).toFixed(3)),
    });
    magneticSeries.push({
      timestamp: ts,
      magneticFieldMagnitude: Number((baseline + s.dev + (Math.random() - 0.5) * 0.12).toFixed(2)),
    });
  }

  const historyNow = (m) => new Date(now - m * 60000).toISOString();

  return {
    spacePrediction: {
      predictionProbability: Number(prob.toFixed(3)),
      predictionStatus: statusFromProb(prob),
      flareClass: flareClassAt(flux),
      flareScore: flareScoreAt(prob),
      predictionTimestamp: nowIso,
      predictionSource: mockData.spacePrediction.predictionSource,
    },
    solarTelemetry: {
      timestamp: nowIso,
      xrayFlux: Number(flux.toFixed(2)),
      fluxClass: fluxClassAt(flux),
      source: mockData.solarTelemetry.source,
    },
    solarFluxSeries,
    groundValidation: {
      magneticFieldX: Number(magneticFieldX.toFixed(2)),
      magneticFieldY: Number(magneticFieldY.toFixed(2)),
      magneticFieldZ: Number(magneticFieldZ.toFixed(2)),
      magneticFieldMagnitude: Number(magnitude.toFixed(2)),
      magneticBaseline: baseline,
      magneticDeviation: Number(dev.toFixed(2)),
      groundValidationStatus: validationAt(dev),
      groundStationStatus: mockData.groundValidation.groundStationStatus,
      groundStationId: mockData.groundValidation.groundStationId,
      groundValidationTimestamp: nowIso,
    },
    magneticTelemetry: {
      timestamp: nowIso,
      magneticFieldX: Number(magneticFieldX.toFixed(2)),
      magneticFieldY: Number(magneticFieldY.toFixed(2)),
      magneticFieldZ: Number(magneticFieldZ.toFixed(2)),
      magneticFieldMagnitude: Number(magnitude.toFixed(2)),
    },
    magneticSeries,
    alertConsole: {
      alertLevel,
      alertStatus: "ACTIVE",
      alertMessage: copy.message,
      alertTimestamp: nowIso,
      alertSource: copy.source,
      alertAcknowledged: false,
    },
    alertHistory: [
      {
        alertLevel,
        alertStatus: "ACTIVE",
        alertMessage: copy.message,
        alertTimestamp: nowIso,
        alertSource: copy.source,
        alertAcknowledged: false,
      },
      {
        alertLevel: "ADVISORY",
        alertStatus: "CLEARED",
        alertMessage: "Elevated solar activity detected. GOES X-ray flux rising above M1 threshold.",
        alertTimestamp: historyNow(4),
        alertSource: "ML ENGINE",
        alertAcknowledged: true,
      },
      {
        alertLevel: "NOMINAL",
        alertStatus: "CLEARED",
        alertMessage: "Flux returned to background. All systems nominal.",
        alertTimestamp: historyNow(18),
        alertSource: "GROUND VALIDATION",
        alertAcknowledged: true,
      },
      {
        alertLevel: "WATCH",
        alertStatus: "CLEARED",
        alertMessage: "C-class flare probability crossed 40%. Monitoring window opened.",
        alertTimestamp: historyNow(32),
        alertSource: "ML ENGINE",
        alertAcknowledged: true,
      },
    ],
    systemStatus: {
      noaaConnectionStatus: mockData.systemStatus.noaaConnectionStatus,
      adityaDataStatus: mockData.systemStatus.adityaDataStatus,
      mlEngineStatus: mockData.systemStatus.mlEngineStatus,
      backendConnectionStatus: mockData.systemStatus.backendConnectionStatus,
      websocketConnectionStatus: mockData.systemStatus.websocketConnectionStatus,
      lastUpdated: nowIso,
    },
    demoMode: mockData.demoMode,
  };
}
