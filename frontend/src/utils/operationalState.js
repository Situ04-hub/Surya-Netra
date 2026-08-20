/* ============================================================
   SURYA-NETRA — OPERATIONAL STATE DERIVATION
   ------------------------------------------------------------
   Centralized state machine mapping shared contract data to the
   four operational states required by the project team:

     SAFE      Normal background data.
     ARMED     NOAA flare confirmed AND 1-minute alert window active.
     DANGER    Flare confirmed AND magnetic spike > 7.0 µT.
     RECOVERY  Magnetic field normalized after DANGER; 7-second
               auto-reset countdown active.

   This is DERIVED frontend state. It is NOT a replacement for
   alertConsole or groundValidation — it sits alongside them.
   ============================================================ */

/* ---- Operational state constants -------------------------------- */

export const OPERATIONAL_STATES = Object.freeze({
  SAFE: "SAFE",
  ARMED: "ARMED",
  DANGER: "DANGER",
  RECOVERY: "RECOVERY",
});

/* ---- Thresholds ------------------------------------------------- */

export const OPERATIONAL_THRESHOLDS = Object.freeze({
  /** Magnetic deviation (µT) above which DANGER triggers. */
  DANGER_MAGNETIC_SPIKE: 7.0,

  /**
   * Seconds after a DANGER condition clears before the state
   * transitions back to SAFE.  Driven by timestamps, NOT by
   * component-level timers.
   */
  RECOVERY_COUNTDOWN_SECONDS: 7,
});

/* ---- Derivation ------------------------------------------------- */

/**
 * Pure, deterministic state derivation.
 *
 * @param {Object}  params
 * @param {Object}  params.spacePrediction      — from shared contract
 * @param {Object}  params.groundValidation     — from shared contract
 * @param {string}  params.previousOperationalState — from useRef in provider
 * @param {number}  params.currentTime          — Date.now() snapshot
 * @param {number}  params.dangerEnteredAt      — timestamp when DANGER first entered
 * @returns {{ operationalState: string, operationalStateMeta: Object }}
 */
export function deriveOperationalState({
  spacePrediction,
  groundValidation,
  previousOperationalState,
  currentTime,
  dangerEnteredAt,
}) {
  const probability = spacePrediction?.predictionProbability ?? 0;
  const deviation = Math.abs(groundValidation?.magneticDeviation ?? 0);

  /* ---- Derived predicates --------------------------------------- */

  /* "Flare confirmed" — prediction model indicates elevated/warning
     or critical flare probability. */
  const flareConfirmed =
    probability >= 0.75 ||
    spacePrediction?.predictionStatus === "WARNING" ||
    spacePrediction?.predictionStatus === "CRITICAL";

  /* "Magnetic spike" — local sensor deviation exceeds the danger
     threshold. */
  const magneticSpike = deviation >= OPERATIONAL_THRESHOLDS.DANGER_MAGNETIC_SPIKE;

  /* ---- State machine -------------------------------------------- */

  let state;
  let reason;
  let recoveryStartedAt = null;
  let dangerEnteredAtOut = null;

  if (previousOperationalState === OPERATIONAL_STATES.RECOVERY) {
    /* RECOVERY → SAFE when countdown completes. */
    const elapsed = dangerEnteredAt
      ? (currentTime - dangerEnteredAt) / 1000
      : OPERATIONAL_THRESHOLDS.RECOVERY_COUNTDOWN_SECONDS;

    if (elapsed >= OPERATIONAL_THRESHOLDS.RECOVERY_COUNTDOWN_SECONDS) {
      state = OPERATIONAL_STATES.SAFE;
      reason = "Recovery complete — normal monitoring resumed.";
    } else {
      state = OPERATIONAL_STATES.RECOVERY;
      reason = "Post-danger recovery in progress.";
      recoveryStartedAt = dangerEnteredAt;
    }
  } else if (magneticSpike && flareConfirmed) {
    /* DANGER takes priority over ARMED. */
    state = OPERATIONAL_STATES.DANGER;
    reason = "Geomagnetic disturbance exceeds safe threshold.";
    dangerEnteredAtOut = previousOperationalState === OPERATIONAL_STATES.DANGER
      ? dangerEnteredAt
      : currentTime;
  } else if (flareConfirmed) {
    state = OPERATIONAL_STATES.ARMED;
    reason = "NOAA flare confirmed — monitoring window active.";
  } else {
    state = OPERATIONAL_STATES.SAFE;
    reason = "Normal background monitoring.";
  }

  /* If previously in DANGER and magnetic spike has cleared,
     transition to RECOVERY (not immediately to SAFE). */
  if (
    previousOperationalState === OPERATIONAL_STATES.DANGER &&
    state === OPERATIONAL_STATES.SAFE &&
    !magneticSpike
  ) {
    state = OPERATIONAL_STATES.RECOVERY;
    reason = "Post-danger recovery in progress.";
    recoveryStartedAt = dangerEnteredAt || currentTime;
    dangerEnteredAtOut = dangerEnteredAt || currentTime;
  }

  const recoveryRemainingSeconds = state === OPERATIONAL_STATES.RECOVERY && recoveryStartedAt
    ? Math.max(
      0,
      OPERATIONAL_THRESHOLDS.RECOVERY_COUNTDOWN_SECONDS -
        (currentTime - recoveryStartedAt) / 1000,
    )
    : null;

  return {
    operationalState: state,
    operationalStateMeta: Object.freeze({
      state,
      reason,
      predictionProbability: probability,
      magneticDeviation: deviation,
      flareConfirmed,
      magneticSpike,
      recoveryStartedAt,
      recoveryRemainingSeconds,
      dangerEnteredAt: dangerEnteredAtOut,
      timestamp: currentTime,
    }),
  };
}
