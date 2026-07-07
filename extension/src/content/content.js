import browserApi from "../shared/browser.js";
import { MESSAGES } from "../shared/messages.js";
import { extractDocument } from "./extractor.js";
import {
  applyHighlights,
  clearHighlights,
  focusFinding,
} from "./highlighter.js";
import {
  openSidebar,
  closeSidebar,
  updateSidebarSelection,
} from "./sidebar.js";

let currentScanId = null;

/*
 * Render snapshots are not canonical scan state.
 *
 * The background owns findings and summary.
 * Content keeps only the latest data required to render
 * the current webpage UI.
 */
let renderedFindings = [];
let renderedSummary = {
  high: 0,
  medium: 0,
  low: 0,
  info: 0,
};

let selectedFindingId = null;

function applyRenderSnapshot(payload) {
  if (
    payload?.scanId &&
    currentScanId &&
    payload.scanId !== currentScanId
  ) {
    return false;
  }

  if (payload?.scanId) {
    currentScanId = payload.scanId;
  }

  if (Array.isArray(payload?.findings)) {
    renderedFindings = payload.findings;
  }

  if (
    payload?.summary &&
    typeof payload.summary === "object"
  ) {
    renderedSummary = {
      high:
        Number(payload.summary.high) || 0,

      medium:
        Number(payload.summary.medium) || 0,

      low:
        Number(payload.summary.low) || 0,

      info:
        Number(payload.summary.info) || 0,
    };
  }

  const selectedStillExists =
    selectedFindingId &&
    renderedFindings.some(
      (finding) =>
        finding.id === selectedFindingId
    );

  if (!selectedStillExists) {
    selectedFindingId =
      renderedFindings[0]?.id || null;
  }

  return true;
}

function openSidebarForSnapshot() {
  openSidebar({
    findings: renderedFindings,

    summary: renderedSummary,

    selectedFindingId,

    handlers: {
      onSelectFinding: (findingId) => {
        selectedFindingId = findingId;

        updateSidebarSelection(findingId);
        focusFinding(findingId);
      },

      onClose: () => {
        closeSidebar();
      },

      onCopy: async (finding) => {
        const lines = [
          finding.title,
          "",

          `What they mean: ${finding.plainExplanation}`,

          `Why it matters: ${finding.whyItMatters}`,

          "Watch for:",

          ...(finding.watchFor || []).map(
            (item) => `- ${item}`
          ),
        ];

        await navigator.clipboard.writeText(
          lines.join("\n")
        );
      },
    },
  });
}

function resetRenderState() {
  currentScanId = null;

  renderedFindings = [];

  renderedSummary = {
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  selectedFindingId = null;
}

function attachHighlightClickHandler() {
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const findingEl = target.closest(
        "[data-uc-finding-id]"
      );

      if (!findingEl) {
        return;
      }

      const findingId =
        findingEl.getAttribute(
          "data-uc-finding-id"
        );

      if (!findingId) {
        return;
      }

      const findingExists =
        renderedFindings.some(
          (finding) =>
            finding.id === findingId
        );

      if (!findingExists) {
        return;
      }

      selectedFindingId = findingId;

      openSidebarForSnapshot();

      focusFinding(findingId);
    }
  );
}

attachHighlightClickHandler();

browserApi.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    const type = message?.type;

    if (
      type === MESSAGES.EXTRACT_DOCUMENT
    ) {
      const scanId =
        message?.payload?.scanId;

      currentScanId = scanId;

      /*
       * A new extraction belongs to a new scan.
       * Previous render snapshots are discarded.
       */
      renderedFindings = [];

      renderedSummary = {
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
      };

      selectedFindingId = null;

      try {
        const { documentData } =
          extractDocument(scanId);

        sendResponse({
          ok: true,
          documentData,
        });
      } catch (error) {
        sendResponse({
          ok: false,

          error: {
            message:
              error?.message ||
              "Extraction failed.",
          },
        });
      }

      return true;
    }

    if (
      type === MESSAGES.APPLY_FINDINGS
    ) {
      const payload =
        message.payload || {};

      const accepted =
        applyRenderSnapshot(payload);

      if (!accepted) {
        sendResponse({
          ok: false,
          stale: true,
        });

        return true;
      }

      applyHighlights(
        currentScanId,
        renderedFindings
      );

      openSidebarForSnapshot();

      sendResponse({
        ok: true,

        findingCount:
          renderedFindings.length,
      });

      return true;
    }

    if (
      type === MESSAGES.SCAN_COMPLETE
    ) {
      const payload =
        message.payload || {};

      applyRenderSnapshot(payload);

      sendResponse({
        ok: true,
      });

      return true;
    }

    if (
      type === MESSAGES.SCAN_PROGRESS
    ) {
      sendResponse({
        ok: true,
      });

      return true;
    }

    if (
      type === MESSAGES.SCAN_ERROR
    ) {
      sendResponse({
        ok: true,
      });

      return true;
    }

    if (
      type === MESSAGES.CLEAR_SCAN
    ) {
      resetRenderState();

      clearHighlights();

      if (
        !message?.payload?.preserveSidebar
      ) {
        closeSidebar();
      }

      sendResponse({
        ok: true,
      });

      return true;
    }

    if (
      type === MESSAGES.OPEN_SIDEBAR
    ) {
      const payload =
        message.payload || {};

      /*
       * OPEN_SIDEBAR always refreshes the local render
       * snapshot from authoritative background state.
       */
      if (payload.scanId) {
        currentScanId = payload.scanId;
      }

      if (
        Array.isArray(payload.findings)
      ) {
        renderedFindings =
          payload.findings;
      }

      if (
        payload.summary &&
        typeof payload.summary === "object"
      ) {
        renderedSummary = {
          high:
            Number(payload.summary.high) || 0,

          medium:
            Number(
              payload.summary.medium
            ) || 0,

          low:
            Number(payload.summary.low) || 0,

          info:
            Number(payload.summary.info) || 0,
        };
      }

      const selectedStillExists =
        selectedFindingId &&
        renderedFindings.some(
          (finding) =>
            finding.id ===
            selectedFindingId
        );

      if (!selectedStillExists) {
        selectedFindingId =
          renderedFindings[0]?.id || null;
      }

      openSidebarForSnapshot();

      sendResponse({
        ok: true,

        findingCount:
          renderedFindings.length,
      });

      return true;
    }

    if (
      type === MESSAGES.CLOSE_SIDEBAR
    ) {
      closeSidebar();

      sendResponse({
        ok: true,
      });

      return true;
    }

    if (
      type === MESSAGES.SELECT_FINDING
    ) {
      const findingId =
        message?.payload?.findingId;

      const findingExists =
        renderedFindings.some(
          (finding) =>
            finding.id === findingId
        );

      if (findingExists) {
        selectedFindingId = findingId;

        updateSidebarSelection(
          findingId
        );

        focusFinding(findingId);
      }

      sendResponse({
        ok: true,
      });

      return true;
    }

    return false;
  }
);