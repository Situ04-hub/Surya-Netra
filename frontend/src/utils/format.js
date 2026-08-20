/* ============================================================
   SURYA-NETRA FORMATTING UTILITIES
   ============================================================ */

export function formatUtcClock(date = new Date()) {
  const iso = date.toISOString();
  return `${iso.slice(0, 19).replace("T", " ")} UTC`;
}

export function formatIso(iso) {
  if (!iso) return "—";
  return new Date(iso).toISOString().slice(0, 19).replace("T", " ");
}

export function formatPercent(value) {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value * 100)}%`;
}

export function formatNumber(value, digits = 1) {
  if (value === null || value === undefined) return "—";
  return Number(value).toFixed(digits);
}

export function formatSigned(value, digits = 2) {
  if (value === null || value === undefined) return "—";
  const n = Number(value).toFixed(digits);
  return n > 0 ? `+${n}` : n;
}
