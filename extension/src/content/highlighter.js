import { getDomMap } from "./dom-map.js";

const highlightedElements = new Map();

function clearHighlightClasses(element) {
  element.classList.remove("uc-highlight", "uc-risk-info", "uc-risk-low", "uc-risk-medium", "uc-risk-high", "uc-highlight-selected");
  delete element.dataset.ucFindingId;
  delete element.dataset.ucBlockId;
  delete element.dataset.ucRisk;
  delete element.dataset.ucCategory;
}

function riskClass(risk) {
  const normalized = String(risk || "").toLowerCase();
  if (normalized === "high") return "uc-risk-high";
  if (normalized === "medium") return "uc-risk-medium";
  if (normalized === "low") return "uc-risk-low";
  return "uc-risk-info";
}

export function applyHighlights(scanId, findings) {
  const domMap = getDomMap(scanId);

  clearHighlights();

  for (const finding of findings) {
    for (const blockId of finding.blockIds) {
      const element = domMap.get(blockId);
      if (!element || !(element instanceof Element)) {
        continue;
      }

      element.classList.add("uc-highlight", riskClass(finding.risk));
      element.dataset.ucFindingId = finding.id;
      element.dataset.ucBlockId = blockId;
      element.dataset.ucRisk = finding.risk;
      element.dataset.ucCategory = finding.category;

      const key = `${finding.id}:${blockId}`;
      highlightedElements.set(key, element);
    }
  }
}

export function clearHighlights() {
  for (const element of highlightedElements.values()) {
    if (element && element.isConnected) {
      clearHighlightClasses(element);
    }
  }
  highlightedElements.clear();
}

export function focusFinding(findingId) {
  for (const element of highlightedElements.values()) {
    if (!element || !element.isConnected) {
      continue;
    }

    const selected = element.dataset.ucFindingId === findingId;
    element.classList.toggle("uc-highlight-selected", selected);

    if (selected) {
      element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }
  }
}
