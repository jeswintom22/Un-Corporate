import browserApi from "../shared/browser.js";
import { SCAN_PHASES } from "../shared/constants.js";

const SESSION_KEY_PREFIX = "uc_scan_state_";

const memoryFallback = new Map();

export const EMPTY_SUMMARY = Object.freeze({
  high: 0,
  medium: 0,
  low: 0,
  info: 0,
});

function getStorageKey(tabId) {
  return `${SESSION_KEY_PREFIX}${tabId}`;
}

export function createIdleScanState(tabId) {
  return {
    tabId,
    scanId: null,

    status: SCAN_PHASES.IDLE,

    progress: {
      phase: SCAN_PHASES.IDLE,
      current: 0,
      total: 0,
      message: "READY TO GET NOSY",
    },

    summary: {
      ...EMPTY_SUMMARY,
    },

    findings: [],

    error: null,
  };
}

export async function getTabScanState(tabId) {
  const storageArea = browserApi.storage.session;

  if (!storageArea) {
    return (
      memoryFallback.get(tabId) ||
      createIdleScanState(tabId)
    );
  }

  const storageKey = getStorageKey(tabId);

  const result = await storageArea.get(
    storageKey
  );

  const storedState = result?.[storageKey];

  if (!storedState) {
    return createIdleScanState(tabId);
  }

  return {
    ...createIdleScanState(tabId),
    ...storedState,

    tabId,

    progress: {
      ...createIdleScanState(tabId).progress,
      ...(storedState.progress || {}),
    },

    summary: {
      ...EMPTY_SUMMARY,
      ...(storedState.summary || {}),
    },

    findings: Array.isArray(
      storedState.findings
    )
      ? storedState.findings
      : [],
  };
}

export async function setTabScanState(
  tabId,
  patch
) {
  const current =
    await getTabScanState(tabId);

  const nextState = {
    ...current,
    ...patch,

    tabId,

    progress: patch.progress
      ? {
          ...current.progress,
          ...patch.progress,
        }
      : current.progress,

    summary: patch.summary
      ? {
          ...current.summary,
          ...patch.summary,
        }
      : current.summary,

    findings: Array.isArray(patch.findings)
      ? patch.findings
      : current.findings,
  };

  const storageArea =
    browserApi.storage.session;

  if (!storageArea) {
    memoryFallback.set(
      tabId,
      nextState
    );

    return nextState;
  }

  const storageKey = getStorageKey(tabId);

  await storageArea.set({
    [storageKey]: nextState,
  });

  return nextState;
}

export async function replaceTabScanState(
  tabId,
  state
) {
  const nextState = {
    ...createIdleScanState(tabId),
    ...state,

    tabId,

    progress: {
      ...createIdleScanState(tabId).progress,
      ...(state?.progress || {}),
    },

    summary: {
      ...EMPTY_SUMMARY,
      ...(state?.summary || {}),
    },

    findings: Array.isArray(state?.findings)
      ? state.findings
      : [],
  };

  const storageArea =
    browserApi.storage.session;

  if (!storageArea) {
    memoryFallback.set(
      tabId,
      nextState
    );

    return nextState;
  }

  const storageKey = getStorageKey(tabId);

  await storageArea.set({
    [storageKey]: nextState,
  });

  return nextState;
}

export async function clearTabScanState(tabId) {
  const storageArea =
    browserApi.storage.session;

  memoryFallback.delete(tabId);

  if (storageArea) {
    await storageArea.remove(
      getStorageKey(tabId)
    );
  }

  return createIdleScanState(tabId);
}