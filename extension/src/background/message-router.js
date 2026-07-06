import { MESSAGES } from "../shared/messages.js";
import {
  getProviderSettings,
  saveProviderSettings,
  saveApiKey,
  deleteApiKey,
  getApiKey,
  getPrivacyWarningAck,
  setPrivacyWarningAck,
} from "../shared/storage.js";
import { createProvider } from "../providers/provider-factory.js";
import { toUserError } from "../shared/errors.js";
import { startScan, cancelScan, clearScan, getTabScanState } from "./scan-controller.js";

async function withActiveTab(sendResponse, handler) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    sendResponse({ ok: false, error: { code: "TAB_UNAVAILABLE", message: "COULD NOT ACCESS TAB." } });
    return;
  }

  try {
    const result = await handler(tab.id);
    sendResponse({ ok: true, ...result });
  } catch (error) {
    sendResponse({ ok: false, error: toUserError(error) });
  }
}

export function registerMessageRouter(browserApi) {
  browserApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const type = message?.type;

    if (type === MESSAGES.GET_PROVIDER_SETTINGS) {
      getProviderSettings()
        .then((settings) => sendResponse({ ok: true, settings }))
        .catch((error) => sendResponse({ ok: false, error: toUserError(error) }));
      return true;
    }

    if (type === MESSAGES.SAVE_PROVIDER_SETTINGS) {
      const { settings, apiKey } = message.payload || {};
      (async () => {
        const saved = await saveProviderSettings(settings);
        if (apiKey) {
          await saveApiKey(apiKey, saved.keyStorageMode);
        }
        return saved;
      })()
        .then((saved) => sendResponse({ ok: true, settings: saved }))
        .catch((error) => sendResponse({ ok: false, error: toUserError(error) }));
      return true;
    }

    if (type === MESSAGES.DELETE_API_KEY) {
      deleteApiKey()
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: toUserError(error) }));
      return true;
    }

    if (type === MESSAGES.TEST_PROVIDER) {
      (async () => {
        const settings = await getProviderSettings();
        const payload = message.payload || {};
        const settingsToUse = { ...settings, ...(payload.settings || {}) };
        const apiKey = payload.apiKey || (await getApiKey(settingsToUse.keyStorageMode));
        const provider = createProvider(settingsToUse, apiKey);
        await provider.testConnection();
        return { ok: true };
      })()
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ ok: false, error: toUserError(error) }));
      return true;
    }

    if (type === MESSAGES.GET_PRIVACY_WARNING_STATE) {
      getPrivacyWarningAck()
        .then((acknowledged) => sendResponse({ ok: true, acknowledged }))
        .catch((error) => sendResponse({ ok: false, error: toUserError(error) }));
      return true;
    }

    if (type === MESSAGES.SET_PRIVACY_WARNING_STATE) {
      setPrivacyWarningAck(Boolean(message?.payload?.acknowledged))
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: toUserError(error) }));
      return true;
    }

    if (type === MESSAGES.GET_TAB_SCAN_STATE) {
      withActiveTab(sendResponse, async (tabId) => ({ state: getTabScanState(tabId) }));
      return true;
    }

    if (type === MESSAGES.START_SCAN) {
      withActiveTab(sendResponse, async (tabId) => ({ state: await startScan(tabId) }));
      return true;
    }

    if (type === MESSAGES.CANCEL_SCAN) {
      withActiveTab(sendResponse, async (tabId) => ({ state: await cancelScan(tabId) }));
      return true;
    }

    if (type === MESSAGES.CLEAR_SCAN) {
      withActiveTab(sendResponse, async (tabId) => ({ state: await clearScan(tabId) }));
      return true;
    }

    if (type === MESSAGES.OPEN_SIDEBAR) {
      withActiveTab(sendResponse, async (tabId) => {
        const state = getTabScanState(tabId);
        await browserApi.tabs.sendMessage(tabId, {
          type: MESSAGES.OPEN_SIDEBAR,
          payload: { findings: state.findings, summary: state.summary, progress: state.progress, status: state.status },
        });
        return { state };
      });
      return true;
    }

    return false;
  });
}
