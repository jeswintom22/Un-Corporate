export const RISK_LEVELS = ["INFO", "LOW", "MEDIUM", "HIGH"];

export function isRiskLevel(value) {
  return RISK_LEVELS.includes(String(value || "").toUpperCase());
}

export function normalizeRisk(value) {
  const upper = String(value || "").toUpperCase();
  return isRiskLevel(upper) ? upper : null;
}
