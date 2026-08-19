/* ============================================================
   SURYA-NETRA CONSTANTS
   Single source of truth for shared vocabulary, tones, and
   semantic maps. Do not duplicate these values elsewhere.
   ============================================================ */

import {
  LayoutDashboard,
  Activity,
  Bell,
  Settings,
  Satellite,
  RadioTower,
  ShieldAlert,
  CheckCircle,
  Magnet,
  Database,
  Cpu,
} from "lucide-react";

export const APP = {
  name: "Surya-Netra",
  tagline: "Space Weather Intelligence",
  mission: "Predict in Space · Confirm on Earth",
  version: "v0.1.0",
};

export const ROUTES = {
  dashboard: "/",
  telemetry: "/telemetry",
  alerts: "/alerts",
  system: "/about",
};

export const NAV_ITEMS = [
  { key: "dashboard", label: "Mission Dashboard", to: ROUTES.dashboard, icon: LayoutDashboard },
  { key: "telemetry", label: "Live Telemetry", to: ROUTES.telemetry, icon: Activity },
  { key: "alerts", label: "Alerts", to: ROUTES.alerts, icon: Bell },
  { key: "system", label: "System Status", to: ROUTES.system, icon: Settings },
];

export const SYSTEM_MODES = {
  demo: "Demo / Replay",
  live: "Live",
};

/* ---- Status tone map (status string → semantic tone) ---- */
export const CONNECTION_TONES = {
  ONLINE: "green",
  CONNECTED: "green",
  AVAILABLE: "green",
  NOMINAL: "green",
  VALIDATED: "green",
  CONFIRMED: "green",
  REPLAY: "amber",
  CONNECTING: "amber",
  ELEVATED: "amber",
  ADVISORY: "amber",
  WATCH: "amber",
  BASELINE: "cyan",
  MONITORING: "cyan",
  VALIDATING: "cyan",
  WARNING: "red",
  CRITICAL: "red",
  OFFLINE: "red",
  DISCONNECTED: "red",
};

/* ---- Prediction status vocabulary ---- */
export const PREDICTION_STATUSES = [
  "IDLE",
  "MONITORING",
  "ELEVATED",
  "WARNING",
  "CRITICAL",
];

/* ---- Ground validation states ---- */
export const VALIDATION_STATES = ["BASELINE", "VALIDATING", "CONFIRMED", "FAULT"];

/* ---- Alert levels (low → high) ---- */
export const ALERT_LEVELS = ["NOMINAL", "ADVISORY", "WATCH", "WARNING", "CRITICAL"];

export const ALERT_TONES = {
  NOMINAL: "green",
  ADVISORY: "amber",
  WATCH: "amber",
  WARNING: "red",
  CRITICAL: "red",
};

/* ---- System flow story: TELEMETRY → PREDICT → VALIDATE → CONFIRM ----
   Keys "predict" | "validate" | "confirm" are the stable flowStage
   contract derived in the provider; "telemetry" is the upstream feed. */
export const FLOW_STAGES = [
  {
    key: "telemetry",
    label: "Space Telemetry",
    desc: "NOAA · Aditya-L1",
    icon: Satellite,
    className: "flow-stage-telemetry",
  },
  {
    key: "predict",
    label: "ML Prediction",
    desc: "Predict in Space",
    icon: Cpu,
    className: "flow-stage-predict",
  },
  {
    key: "validate",
    label: "Ground Validation",
    desc: "Confirm on Earth",
    icon: RadioTower,
    className: "flow-stage-validate",
  },
  {
    key: "confirm",
    label: "GMD Alert",
    desc: "Operational decision",
    icon: ShieldAlert,
    className: "flow-stage-confirm",
  },
];

/* ---- Source / system labels ---- */
export const DATA_SOURCES = {
  noaa: { name: "NOAA GOES", type: "Space Telemetry", icon: Satellite },
  aditya: { name: "Aditya-L1", type: "Historical / Context", icon: Database },
  ml: { name: "ML Engine", type: "Prediction Core", icon: Cpu },
  ground: { name: "Ground Station", type: "ESP32 + QMC5883L", icon: Magnet },
};

/* ---- Semantic tone → badge tone class ---- */
export const TONE_TO_BADGE = {
  cyan: "badge-tone-cyan",
  violet: "badge-tone-violet",
  amber: "badge-tone-amber",
  green: "badge-tone-green",
  red: "badge-tone-red",
  muted: "badge-tone-muted",
};

export const TONE_TO_STATUS = {
  cyan: "status-tone-cyan",
  violet: "status-tone-violet",
  amber: "status-tone-amber",
  green: "status-tone-green",
  red: "status-tone-red",
  muted: "status-tone-muted",
};

export const HEALTH_ICON = CheckCircle;
export const ALERT_ICON = ShieldAlert;
export const VALIDATED_ICON = CheckCircle;
