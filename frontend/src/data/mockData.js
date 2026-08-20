/* ============================================================
   SURYA-NETRA MOCK DATA LAYER
   ------------------------------------------------------------
   PURPOSE
   Provide realistic-looking telemetry so the frontend runs before
   the backend exists. This layer is the ONLY place that owns mock
   values — UI components must never contain them.

   REPLACEMENT PATH
   When the FastAPI backend + WebSocket stream are ready, swap
   these exports for service-backed data (see /services). The
   data shapes and variable names below are the stable contract.

   IMPORTANT
   These are NOT live NOAA or Aditya-L1 measurements. The UI
   always labels this state as DEMO / REPLAY.
   ============================================================ */

const minutesAgo = (m) => new Date(Date.now() - m * 60000).toISOString();

/* ---- SPACE PREDICTION ---- */
export const mockSpacePrediction = {
  predictionProbability: 0.68,
  predictionStatus: "ELEVATED",
  flareClass: "M2.3",
  flareScore: 86,
  predictionTimestamp: minutesAgo(3),
  predictionSource: "ML ENGINE v1.0 · ENSEMBLE",
};

/* ---- SOLAR TELEMETRY (single latest sample) ---- */
export const mockSolarTelemetry = {
  timestamp: minutesAgo(0),
  xrayFlux: 4.6, // µW/m²
  fluxClass: "M-class",
  source: "NOAA GOES-18 · REPLAY",
};

/* ---- SOLAR X-RAY FLUX HISTORY (future chart feed) ---- */
export const mockSolarFluxSeries = [
  { timestamp: minutesAgo(24), xrayFlux: 1.1 },
  { timestamp: minutesAgo(22), xrayFlux: 1.4 },
  { timestamp: minutesAgo(20), xrayFlux: 1.3 },
  { timestamp: minutesAgo(18), xrayFlux: 1.7 },
  { timestamp: minutesAgo(16), xrayFlux: 1.9 },
  { timestamp: minutesAgo(14), xrayFlux: 2.2 },
  { timestamp: minutesAgo(12), xrayFlux: 2.6 },
  { timestamp: minutesAgo(10), xrayFlux: 3.0 },
  { timestamp: minutesAgo(8), xrayFlux: 3.4 },
  { timestamp: minutesAgo(6), xrayFlux: 3.9 },
  { timestamp: minutesAgo(4), xrayFlux: 4.2 },
  { timestamp: minutesAgo(2), xrayFlux: 4.5 },
  { timestamp: minutesAgo(0), xrayFlux: 4.6 },
];

/* ---- GROUND VALIDATION ---- */
export const mockGroundValidation = {
  magneticFieldX: 21.4, // µT
  magneticFieldY: -18.7, // µT
  magneticFieldZ: 36.9, // µT
  magneticFieldMagnitude: 47.2, // µT
  magneticBaseline: 46.1, // µT
  magneticDeviation: 1.1, // µT
  groundValidationStatus: "BASELINE",
  groundStationStatus: "ONLINE",
  groundStationId: "SN-GND-01",
  groundValidationTimestamp: minutesAgo(0),
};

/* ---- MAGNETIC TELEMETRY (single latest sample) ---- */
export const mockMagneticTelemetry = {
  timestamp: minutesAgo(0),
  magneticFieldX: 21.4,
  magneticFieldY: -18.7,
  magneticFieldZ: 36.9,
  magneticFieldMagnitude: 47.2,
};

/* ---- MAGNETIC FIELD HISTORY (future chart feed) ---- */
export const mockMagneticSeries = [
  { timestamp: minutesAgo(24), magneticFieldMagnitude: 46.2 },
  { timestamp: minutesAgo(22), magneticFieldMagnitude: 46.1 },
  { timestamp: minutesAgo(20), magneticFieldMagnitude: 46.3 },
  { timestamp: minutesAgo(18), magneticFieldMagnitude: 46.1 },
  { timestamp: minutesAgo(16), magneticFieldMagnitude: 46.2 },
  { timestamp: minutesAgo(14), magneticFieldMagnitude: 46.4 },
  { timestamp: minutesAgo(12), magneticFieldMagnitude: 46.5 },
  { timestamp: minutesAgo(10), magneticFieldMagnitude: 46.3 },
  { timestamp: minutesAgo(8), magneticFieldMagnitude: 46.6 },
  { timestamp: minutesAgo(6), magneticFieldMagnitude: 46.7 },
  { timestamp: minutesAgo(4), magneticFieldMagnitude: 46.9 },
  { timestamp: minutesAgo(2), magneticFieldMagnitude: 47.1 },
  { timestamp: minutesAgo(0), magneticFieldMagnitude: 47.2 },
];

/* ---- ALERT CONSOLE ---- */
export const mockAlertConsole = {
  alertLevel: "ADVISORY",
  alertStatus: "ACTIVE",
  alertMessage:
    "Elevated solar activity detected. GOES X-ray flux rising above M1 threshold; ground validation monitoring.",
  alertTimestamp: minutesAgo(12),
  alertSource: "ML ENGINE",
  alertAcknowledged: false,
};

/* ---- ALERT HISTORY ---- */
export const mockAlertHistory = [
  {
    alertLevel: "NOMINAL",
    alertStatus: "CLEARED",
    alertMessage: "Flux returned to background. All systems nominal.",
    alertTimestamp: minutesAgo(42),
    alertSource: "GROUND VALIDATION",
    alertAcknowledged: true,
  },
  {
    alertLevel: "ADVISORY",
    alertStatus: "CLEARED",
    alertMessage: "Minor magnetic deviation observed at SN-GND-01.",
    alertTimestamp: minutesAgo(96),
    alertSource: "GROUND VALIDATION",
    alertAcknowledged: true,
  },
  {
    alertLevel: "NOMINAL",
    alertStatus: "CLEARED",
    alertMessage: "ML engine heartbeat verified. Model drift within tolerance.",
    alertTimestamp: minutesAgo(180),
    alertSource: "ML ENGINE",
    alertAcknowledged: true,
  },
  {
    alertLevel: "ADVISORY",
    alertStatus: "CLEARED",
    alertMessage: "C-class flare probability crossed 40%. Monitoring window opened.",
    alertTimestamp: minutesAgo(300),
    alertSource: "ML ENGINE",
    alertAcknowledged: true,
  },
  {
    alertLevel: "NOMINAL",
    alertStatus: "CLEARED",
    alertMessage: "Backend link established during startup sequence.",
    alertTimestamp: minutesAgo(420),
    alertSource: "SYSTEM",
    alertAcknowledged: true,
  },
];

/* ---- SYSTEM / DATA-SOURCE STATUS ---- */
export const mockSystemStatus = {
  noaaConnectionStatus: "REPLAY",
  adityaDataStatus: "AVAILABLE",
  mlEngineStatus: "ONLINE",
  backendConnectionStatus: "OFFLINE",
  websocketConnectionStatus: "DISCONNECTED",
  lastUpdated: minutesAgo(0),
};

/* ---- GLOBAL MODE FLAG ----
   "true" means all values on screen are demo/replay mock values.
   Keep this true until real backend + WebSocket streams are wired. */
export const mockDemoMode = true;

export const mockData = {
  spacePrediction: mockSpacePrediction,
  solarTelemetry: mockSolarTelemetry,
  solarFluxSeries: mockSolarFluxSeries,
  groundValidation: mockGroundValidation,
  magneticTelemetry: mockMagneticTelemetry,
  magneticSeries: mockMagneticSeries,
  alertConsole: mockAlertConsole,
  alertHistory: mockAlertHistory,
  systemStatus: mockSystemStatus,
  demoMode: mockDemoMode,
};
