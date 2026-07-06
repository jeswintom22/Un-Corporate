import browserApi from "../shared/browser.js";
import { MESSAGES } from "../shared/messages.js";
import { extractDocument } from "./extractor.js";
import { applyHighlights, clearHighlights, focusFinding } from "./highlighter.js";
import { openSidebar, closeSidebar, updateSidebarSelection } from "./sidebar.js";

let currentScanId = null;
let currentFindings = [];
let selectedFindingId = null;

function getSummary(findings) {
  return findings.reduce(
    (acc, finding) => {
      const risk = String(finding.risk || "").toUpperCase();
      if (risk === "HIGH") acc.high += 1;
      if (risk === "MEDIUM") acc.medium += 1;
      if (risk === "LOW") acc.low += 1;
      if (risk === "INFO") acc.info += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0, info: 0 }
  );
}

function openSidebarForCurrent() {
  openSidebar({
    findings: currentFindings,
    summary: getSummary(currentFindings),
    selectedFindingId,
    handlers: {
      onSelectFinding: (findingId) => {
        selectedFindingId = findingId;
        updateSidebarSelection(findingId);
        focusFinding(findingId);
      },
      onClose: () => closeSidebar(),
      onCopy: async (finding) => {
        const lines = [
          finding.title,
          "",
          `What they mean: ${finding.plainExplanation}`,
          `Why it matters: ${finding.whyItMatters}`,
          "Watch for:",
          ...(finding.watchFor || []).map((item) => `- ${item}`),
        ];
        await navigator.clipboard.writeText(lines.join("\n"));
      },
    },
  });
}

function attachHighlightClickHandler() {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const findingEl = target.closest("[data-uc-finding-id]");
    if (!findingEl) {
      return;
    }

    const findingId = findingEl.getAttribute("data-uc-finding-id");
    if (!findingId) {
      return;
    }

    selectedFindingId = findingId;
    openSidebarForCurrent();
    focusFinding(findingId);
  });
}

attachHighlightClickHandler();

browserApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const type = message?.type;

  if (type === MESSAGES.EXTRACT_DOCUMENT) {
    const scanId = message?.payload?.scanId;
    currentScanId = scanId;

    try {
      const { documentData } = extractDocument(scanId);
      sendResponse({ ok: true, documentData });
    } catch (error) {
      sendResponse({ ok: false, error: { message: error?.message || "Extraction failed." } });
    }

    return true;
  }

  if (type === MESSAGES.APPLY_FINDINGS) {
    const payload = message.payload || {};
    currentScanId = payload.scanId || currentScanId;
    currentFindings = payload.findings || [];
    selectedFindingId = currentFindings[0]?.id || null;

    applyHighlights(currentScanId, currentFindings);
    openSidebarForCurrent();

    sendResponse({ ok: true });
    return true;
  }

  if (type === MESSAGES.CLEAR_SCAN) {
    currentFindings = [];
    selectedFindingId = null;
    clearHighlights();

    if (!message?.payload?.preserveSidebar) {
      closeSidebar();
    }

    sendResponse({ ok: true });
    return true;
  }

  if (type === MESSAGES.OPEN_SIDEBAR) {
    openSidebarForCurrent();
    sendResponse({ ok: true });
    return true;
  }

  if (type === MESSAGES.CLOSE_SIDEBAR) {
    closeSidebar();
    sendResponse({ ok: true });
    return true;
  }

  if (type === MESSAGES.SELECT_FINDING) {
    const findingId = message?.payload?.findingId;
    if (findingId) {
      selectedFindingId = findingId;
      updateSidebarSelection(findingId);
      focusFinding(findingId);
    }
    sendResponse({ ok: true });
    return true;
  }

  return false;
});
