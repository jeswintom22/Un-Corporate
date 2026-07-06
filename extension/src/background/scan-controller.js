import browserApi from "../shared/browser.js";
import { MESSAGES } from "../shared/messages.js";
import { SCAN_PHASES } from "../shared/constants.js";
import { AppError, ERROR_CODES, toAppError, toUserError } from "../shared/errors.js";
import { getApiKey, getProviderSettings } from "../shared/storage.js";
import { createProvider } from "../providers/provider-factory.js";
import { buildChunks } from "../analysis/chunker.js";
import { runAnalysis } from "../analysis/analyzer.js";

const tabScanState = new Map();

function makeScanId() {
  return `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getTabScanState(tabId) {
  return (
    tabScanState.get(tabId) || {
      tabId,
      status: SCAN_PHASES.IDLE,
      progress: { phase: SCAN_PHASES.IDLE, current: 0, total: 0, message: "READY TO GET NOSY" },
      summary: { high: 0, medium: 0, low: 0, info: 0 },
      findings: [],
      selectedFindingId: null,
    }
  );
}

function setTabScanState(tabId, nextState) {
  tabScanState.set(tabId, { ...getTabScanState(tabId), ...nextState });
}

function summarizeFindings(findings) {
  return findings.reduce(
    (acc, finding) => {
      const risk = finding.risk?.toUpperCase();
      if (risk === "HIGH") acc.high += 1;
      if (risk === "MEDIUM") acc.medium += 1;
      if (risk === "LOW") acc.low += 1;
      if (risk === "INFO") acc.info += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0, info: 0 }
  );
}

async function ensureContentInjected(tabId) {
  await browserApi.scripting.executeScript({
    target: { tabId },
    files: ["bundles/content.bundle.js"],
  });
}

async function sendToTab(tabId, message) {
  return browserApi.tabs.sendMessage(tabId, message);
}

function updateProgress(tabId, scanId, progress, status) {
  const current = getTabScanState(tabId);
  if (current.scanId !== scanId) {
    return;
  }

  const nextStatus = status || current.status;
  setTabScanState(tabId, {
    status: nextStatus,
    progress,
  });

  sendToTab(tabId, {
    type: MESSAGES.SCAN_PROGRESS,
    payload: {
      status: nextStatus,
      progress,
    },
  }).catch(() => {});
}

function isScanStale(tabId, scanId) {
  return getTabScanState(tabId).scanId !== scanId;
}

export async function startScan(tabId) {
  const existing = getTabScanState(tabId);
  if ([SCAN_PHASES.EXTRACTING, SCAN_PHASES.CHUNKING, SCAN_PHASES.DETECTING, SCAN_PHASES.EXPLAINING, SCAN_PHASES.RENDERING].includes(existing.status)) {
    throw new AppError(ERROR_CODES.SCAN_ALREADY_RUNNING, "SCAN ALREADY RUNNING.");
  }

  const scanId = makeScanId();
  setTabScanState(tabId, {
    tabId,
    scanId,
    status: SCAN_PHASES.EXTRACTING,
    progress: { phase: SCAN_PHASES.EXTRACTING, current: 0, total: 0, message: "READING CORPORATE NONSENSE..." },
    findings: [],
    summary: { high: 0, medium: 0, low: 0, info: 0 },
    selectedFindingId: null,
  });

  try {
    await ensureContentInjected(tabId);

    const settings = await getProviderSettings();
    const apiKey = await getApiKey(settings.keyStorageMode);
    const provider = createProvider(settings, apiKey);

    updateProgress(tabId, scanId, { phase: SCAN_PHASES.EXTRACTING, current: 0, total: 0, message: "READING CORPORATE NONSENSE..." }, SCAN_PHASES.EXTRACTING);

    const extraction = await sendToTab(tabId, {
      type: MESSAGES.EXTRACT_DOCUMENT,
      payload: { scanId },
    });

    if (isScanStale(tabId, scanId)) {
      return getTabScanState(tabId);
    }

    if (!extraction?.ok || !extraction.documentData) {
      throw new AppError(ERROR_CODES.EXTRACTION_FAILED, "FAILED TO READ PAGE CONTENT.");
    }

    const { documentData } = extraction;
    if (!Array.isArray(documentData.blocks) || documentData.blocks.length < 3) {
      throw new AppError(ERROR_CODES.DOCUMENT_TOO_SMALL, "NOT ENOUGH TEXT TO ANALYZE.");
    }

    updateProgress(tabId, scanId, { phase: SCAN_PHASES.CHUNKING, current: 0, total: 0, message: "SLICING THE DOC INTO BITE-SIZE CHAOS..." }, SCAN_PHASES.CHUNKING);

    const chunking = buildChunks(documentData);

    const analysisResult = await runAnalysis({
      documentData,
      chunks: chunking.chunks,
      provider,
      onProgress: (progress) => updateProgress(tabId, scanId, progress),
      isStale: () => isScanStale(tabId, scanId),
    });

    if (analysisResult.cancelled || isScanStale(tabId, scanId)) {
      return getTabScanState(tabId);
    }

    updateProgress(tabId, scanId, { phase: SCAN_PHASES.RENDERING, current: 0, total: 0, message: "PAINTING THE SUS BITS..." }, SCAN_PHASES.RENDERING);

    await sendToTab(tabId, {
      type: MESSAGES.APPLY_FINDINGS,
      payload: {
        scanId,
        findings: analysisResult.findings,
      },
    });

    const summary = summarizeFindings(analysisResult.findings);
    const finalState = {
      ...getTabScanState(tabId),
      status: SCAN_PHASES.COMPLETE,
      progress: { phase: SCAN_PHASES.COMPLETE, current: 1, total: 1, message: "SCAN COMPLETE. YIKES." },
      findings: analysisResult.findings,
      summary,
    };

    tabScanState.set(tabId, finalState);

    sendToTab(tabId, {
      type: MESSAGES.SCAN_COMPLETE,
      payload: {
        summary,
        findings: analysisResult.findings,
      },
    }).catch(() => {});

    return finalState;
  } catch (error) {
    const appError = toAppError(error);
    const failedState = {
      ...getTabScanState(tabId),
      status: SCAN_PHASES.ERROR,
      progress: { phase: SCAN_PHASES.ERROR, current: 0, total: 0, message: appError.message },
      error: toUserError(appError),
    };

    tabScanState.set(tabId, failedState);

    sendToTab(tabId, {
      type: MESSAGES.SCAN_ERROR,
      payload: failedState.error,
    }).catch(() => {});

    throw appError;
  }
}

export async function cancelScan(tabId) {
  const current = getTabScanState(tabId);
  if (!current.scanId) {
    return current;
  }

  const cancelledState = {
    ...current,
    status: SCAN_PHASES.CANCELLED,
    progress: { phase: SCAN_PHASES.CANCELLED, current: 0, total: 0, message: "SCAN CANCELLED." },
  };

  tabScanState.set(tabId, cancelledState);

  await sendToTab(tabId, {
    type: MESSAGES.CLEAR_SCAN,
    payload: { preserveSidebar: false },
  }).catch(() => {});

  return cancelledState;
}

export async function clearScan(tabId) {
  tabScanState.set(tabId, {
    tabId,
    status: SCAN_PHASES.IDLE,
    progress: { phase: SCAN_PHASES.IDLE, current: 0, total: 0, message: "READY TO GET NOSY" },
    summary: { high: 0, medium: 0, low: 0, info: 0 },
    findings: [],
    selectedFindingId: null,
  });

  await sendToTab(tabId, {
    type: MESSAGES.CLEAR_SCAN,
    payload: { preserveSidebar: false },
  }).catch(() => {});

  return getTabScanState(tabId);
}
