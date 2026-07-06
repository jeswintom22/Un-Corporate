import { riskWeight } from "../shared/utils.js";

function keyForFinding(finding) {
  return `${finding.category}::${finding.blockIds.slice().sort().join(",")}`;
}

export function dedupeFindings(findings) {
  const merged = new Map();

  for (const finding of findings) {
    const key = keyForFinding(finding);
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, { ...finding, blockIds: [...finding.blockIds] });
      continue;
    }

    existing.confidence = Math.max(existing.confidence, finding.confidence);
    if (riskWeight(finding.risk) > riskWeight(existing.risk)) {
      existing.risk = finding.risk;
    }
  }

  return [...merged.values()];
}

export function finalizeFindings(findings, blockOrderMap) {
  return findings
    .map((finding, index) => {
      const firstOrder = Math.min(...finding.blockIds.map((id) => blockOrderMap.get(id) ?? Number.MAX_SAFE_INTEGER));
      return {
        id: `finding_${String(index + 1).padStart(4, "0")}`,
        ...finding,
        documentOrder: firstOrder,
      };
    })
    .sort((a, b) => a.documentOrder - b.documentOrder)
    .map((finding, index) => ({
      ...finding,
      id: `finding_${String(index + 1).padStart(4, "0")}`,
    }));
}
