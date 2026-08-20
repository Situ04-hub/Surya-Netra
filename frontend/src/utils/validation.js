/* ============================================================
   VALIDATION STATE DERIVATION
   Presentation-level mapping of the existing shared
   ground-validation contract (status + deviation) into a clear
   operator vocabulary. Not a second alert-state system — it
   reads the established fields and never redefines them.
   ============================================================ */

export function deriveValidationState(status, deviation) {
  const magnitude = Math.abs(deviation);
  if (status === "FAULT") return { state: "FAULT", tone: "red" };
  if (status === "CONFIRMED") {
    return magnitude > 5 ? { state: "CRITICAL", tone: "red" } : { state: "VALIDATED", tone: "green" };
  }
  if (status === "VALIDATING") {
    return magnitude > 3 ? { state: "ELEVATED", tone: "amber" } : { state: "MONITORING", tone: "cyan" };
  }
  return { state: "NORMAL", tone: "cyan" };
}
