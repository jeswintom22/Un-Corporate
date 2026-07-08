import browserApi from "../shared/browser.js";
import { MESSAGES } from "../shared/messages.js";
import { SCAN_PHASES } from "../shared/constants.js";
import {
  AppError,
  ERROR_CODES,
  toAppError,
  toUserError,
} from "../shared/errors.js";
import {
  getApiKey,
  getProviderSettings,
} from "../shared/storage.js";
import { createProvider } from "../providers/provider-factory.js";
import { buildChunks } from "../analysis/chunker.js";
import { runAnalysis } from "../analysis/analyzer.js";
import {
  EMPTY_SUMMARY,
  createIdleScanState,
  getTabScanState,
  setTabScanState,
  replaceTabScanState,
} from "./scan-state.js";

const RUNNING_PHASES = new Set([
  SCAN_PHASES.EXTRACTING,
  SCAN_PHASES.CHUNKING,
  SCAN_PHASES.DETECTING,
  SCAN_PHASES.EXPLAINING,
  SCAN_PHASES.RENDERING,
]);

function makeScanId() {
  return (
    `scan_${Date.now()}_` +
    Math.random().toString(36).slice(2, 8)
  );
}

function summarizeFindings(findings) {
  return findings.reduce(
    (summary, finding) => {
      const risk = String(
        finding.risk || ""
      ).toUpperCase();

      if (risk === "HIGH") {
        summary.high += 1;
      }

      if (risk === "MEDIUM") {
        summary.medium += 1;
      }

      if (risk === "LOW") {
        summary.low += 1;
      }

      if (risk === "INFO") {
        summary.info += 1;
      }

      return summary;
    },
    {
      ...EMPTY_SUMMARY,
    }
  );
}

async function ensureContentInjected(tabId) {
  await browserApi.scripting.executeScript({
    target: {
      tabId,
    },
    files: [
      "bundles/content.bundle.js",
    ],
  });
}

async function sendToTab(tabId, message) {
  return browserApi.tabs.sendMessage(
    tabId,
    message
  );
}

async function isScanActive(tabId, scanId) {
  const state = await getTabScanState(tabId);

  return (
    state.scanId === scanId &&
    RUNNING_PHASES.has(state.status)
  );
}

async function updateProgress(
  tabId,
  scanId,
  progress,
  status
) {
  const active = await isScanActive(
    tabId,
    scanId
  );

  if (!active) {
    return;
  }

  const current =
    await getTabScanState(tabId);

  const nextStatus =
    status || current.status;

  await setTabScanState(tabId, {
    status: nextStatus,
    progress,
  });

  sendToTab(tabId, {
    type: MESSAGES.SCAN_PROGRESS,
    payload: {
      scanId,
      status: nextStatus,
      progress,
    },
  }).catch(() => {});
}

export { getTabScanState };

export async function startScan(tabId) {
  const existing =
    await getTabScanState(tabId);

  if (RUNNING_PHASES.has(existing.status)) {
    throw new AppError(
      ERROR_CODES.SCAN_ALREADY_RUNNING,
      "SCAN ALREADY RUNNING."
    );
  }

  const scanId = makeScanId();

  await replaceTabScanState(tabId, {
    tabId,
    scanId,

    status: SCAN_PHASES.EXTRACTING,

    progress: {
      phase: SCAN_PHASES.EXTRACTING,
      current: 0,
      total: 0,
      message:
        "READING CORPORATE NONSENSE...",
    },

    findings: [],

    summary: {
      ...EMPTY_SUMMARY,
    },

    error: null,
  });

  try {
    await ensureContentInjected(tabId);

    if (
      !(await isScanActive(tabId, scanId))
    ) {
      return getTabScanState(tabId);
    }

    const settings =
      await getProviderSettings();

    const apiKey = await getApiKey(
      settings.keyStorageMode
    );

    const provider = createProvider(
      settings,
      apiKey
    );

    if (
      !(await isScanActive(tabId, scanId))
    ) {
      return getTabScanState(tabId);
    }

    await updateProgress(
      tabId,
      scanId,
      {
        phase: SCAN_PHASES.EXTRACTING,
        current: 0,
        total: 0,
        message:
          "READING CORPORATE NONSENSE...",
      },
      SCAN_PHASES.EXTRACTING
    );

    const extraction = await sendToTab(
      tabId,
      {
        type: MESSAGES.EXTRACT_DOCUMENT,
        payload: {
          scanId,
        },
      }
    );

    if (
      !(await isScanActive(tabId, scanId))
    ) {
      return getTabScanState(tabId);
    }

    if (
      !extraction?.ok ||
      !extraction.documentData
    ) {
      throw new AppError(
        ERROR_CODES.EXTRACTION_FAILED,
        "FAILED TO READ PAGE CONTENT."
      );
    }

    const { documentData } = extraction;

    if (
      !Array.isArray(documentData.blocks) ||
      documentData.blocks.length < 3
    ) {
      throw new AppError(
        ERROR_CODES.DOCUMENT_TOO_SMALL,
        "NOT ENOUGH TEXT TO ANALYZE."
      );
    }

    await updateProgress(
      tabId,
      scanId,
      {
        phase: SCAN_PHASES.CHUNKING,
        current: 0,
        total: 0,
        message:
          "SLICING THE DOC INTO BITE-SIZE CHAOS...",
      },
      SCAN_PHASES.CHUNKING
    );

    const chunking =
      buildChunks(documentData);

    if (
      !(await isScanActive(tabId, scanId))
    ) {
      return getTabScanState(tabId);
    }

    let stale = false;

    const staleCheck = async () => {
      stale = !(
        await isScanActive(tabId, scanId)
      );

      return stale;
    };

    /*
     * runAnalysis expects a synchronous stale callback.
     *
     * Session storage is asynchronous, so progress updates
     * refresh the local stale flag before analysis work
     * continues.
     */
    const analysisResult =
      await runAnalysis({
        documentData,
        chunks: chunking.chunks,
        provider,

        onProgress: async (progress) => {
          await updateProgress(
            tabId,
            scanId,
            progress
          );

          await staleCheck();
        },

        isStale: () => stale,
      });

    if (
      analysisResult.cancelled ||
      stale ||
      !(await isScanActive(tabId, scanId))
    ) {
      return getTabScanState(tabId);
    }

    const findings =
      analysisResult.findings;

    const summary =
      summarizeFindings(findings);

    await setTabScanState(tabId, {
      status: SCAN_PHASES.RENDERING,

      progress: {
        phase: SCAN_PHASES.RENDERING,
        current: 0,
        total: 0,
        message:
          "PAINTING THE SUS BITS...",
      },

      findings,
      summary,
      error: null,
    });

    if (
      !(await isScanActive(tabId, scanId))
    ) {
      return getTabScanState(tabId);
    }

    await sendToTab(tabId, {
      type: MESSAGES.APPLY_FINDINGS,

      payload: {
        scanId,
        findings,
        summary,
      },
    });

    if (
      !(await isScanActive(tabId, scanId))
    ) {
      return getTabScanState(tabId);
    }

    const finalState =
      await setTabScanState(tabId, {
        status: SCAN_PHASES.COMPLETE,

        progress: {
          phase: SCAN_PHASES.COMPLETE,
          current: 1,
          total: 1,
          message:
            "SCAN COMPLETE. YIKES.",
        },

        error: null,
      });

    sendToTab(tabId, {
      type: MESSAGES.SCAN_COMPLETE,

      payload: {
        scanId,
        status: finalState.status,
        progress: finalState.progress,
        findings: finalState.findings,
        summary: finalState.summary,
      },
    }).catch(() => {});

    return finalState;
  } catch (error) {
    const active = await isScanActive(
      tabId,
      scanId
    );

    if (!active) {
      return getTabScanState(tabId);
    }

    const appError = toAppError(error);

    const failedState =
      await setTabScanState(tabId, {
        status: SCAN_PHASES.ERROR,

        progress: {
          phase: SCAN_PHASES.ERROR,
          current: 0,
          total: 0,
          message: appError.message,
        },

        error: toUserError(appError),
      });

    sendToTab(tabId, {
      type: MESSAGES.SCAN_ERROR,

      payload: {
        scanId,
        error: failedState.error,
      },
    }).catch(() => {});

    throw appError;
  }
}

export async function cancelScan(tabId) {
  const current =
    await getTabScanState(tabId);

  if (
    !current.scanId ||
    !RUNNING_PHASES.has(current.status)
  ) {
    return current;
  }

  const cancelledState =
    await replaceTabScanState(tabId, {
      ...current,

      scanId: null,

      status: SCAN_PHASES.CANCELLED,

      progress: {
        phase: SCAN_PHASES.CANCELLED,
        current: 0,
        total: 0,
        message: "SCAN CANCELLED.",
      },

      findings: [],

      summary: {
        ...EMPTY_SUMMARY,
      },

      error: null,
    });

  await sendToTab(tabId, {
    type: MESSAGES.CLEAR_SCAN,

    payload: {
      preserveSidebar: false,
    },
  }).catch(() => {});

  return cancelledState;
}

export async function clearScan(tabId) {
  const idleState =
    createIdleScanState(tabId);

  await replaceTabScanState(
    tabId,
    idleState
  );

  await sendToTab(tabId, {
    type: MESSAGES.CLEAR_SCAN,

    payload: {
      preserveSidebar: false,
    },
  }).catch(() => {});

  return idleState;
}