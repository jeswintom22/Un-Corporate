import { isAllowedCategory } from "./risk-categories.js";
import { normalizeRisk } from "./risk-levels.js";
import { uniqueArray } from "../shared/utils.js";

export function validateFindingResponse(response, validBlockIds) {
  const blockIdSet = new Set(validBlockIds);
  const findings = Array.isArray(response?.findings) ? response.findings : [];
  const valid = [];

  for (const rawFinding of findings) {
    if (!rawFinding || typeof rawFinding !== "object") {
      continue;
    }

    const category = String(rawFinding.category || "").trim();
    const risk = normalizeRisk(rawFinding.risk);
    const confidence = Number(rawFinding.confidence);
    const blockIds = uniqueArray((rawFinding.blockIds || []).filter((id) => blockIdSet.has(id)));

    if (!category || !isAllowedCategory(category)) {
      continue;
    }

    if (!risk) {
      continue;
    }

    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      continue;
    }

    if (!blockIds.length) {
      continue;
    }

    valid.push({
      blockIds,
      category,
      risk,
      confidence,
    });
  }

  return valid;
}
