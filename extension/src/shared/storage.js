import browserApi from "./browser.js";
import { DEFAULT_PROVIDER_SETTINGS, STORAGE_KEYS } from "./constants.js";

const localStorageArea = browserApi.storage.local;
const sessionStorageArea = browserApi.storage.session;

export async function getProviderSettings() {
  const result = await localStorageArea.get(STORAGE_KEYS.PROVIDER_SETTINGS);
  return {
    ...DEFAULT_PROVIDER_SETTINGS,
    ...(result[STORAGE_KEYS.PROVIDER_SETTINGS] || {}),
  };
}

export async function saveProviderSettings(settings) {
  const merged = {
    ...DEFAULT_PROVIDER_SETTINGS,
    ...settings,
    hasCompletedSetup: true,
  };

  await localStorageArea.set({
    [STORAGE_KEYS.PROVIDER_SETTINGS]: merged,
  });

  return merged;
}

export async function getApiKey(storageMode = "local") {
  if (storageMode === "session" && sessionStorageArea) {
    const result = await sessionStorageArea.get(STORAGE_KEYS.API_KEY_SESSION);
    return result[STORAGE_KEYS.API_KEY_SESSION] || "";
  }

  const result = await localStorageArea.get(STORAGE_KEYS.API_KEY_LOCAL);
  return result[STORAGE_KEYS.API_KEY_LOCAL] || "";
}

export async function saveApiKey(apiKey, storageMode = "local") {
  if (storageMode === "session" && sessionStorageArea) {
    await sessionStorageArea.set({
      [STORAGE_KEYS.API_KEY_SESSION]: apiKey,
    });
    await localStorageArea.remove(STORAGE_KEYS.API_KEY_LOCAL);
    return;
  }

  await localStorageArea.set({
    [STORAGE_KEYS.API_KEY_LOCAL]: apiKey,
  });

  if (sessionStorageArea) {
    await sessionStorageArea.remove(STORAGE_KEYS.API_KEY_SESSION);
  }
}

export async function deleteApiKey() {
  await localStorageArea.remove(STORAGE_KEYS.API_KEY_LOCAL);
  if (sessionStorageArea) {
    await sessionStorageArea.remove(STORAGE_KEYS.API_KEY_SESSION);
  }
}

export async function getPrivacyWarningAck() {
  const result = await localStorageArea.get(STORAGE_KEYS.PRIVACY_WARNING_ACK);
  return Boolean(result[STORAGE_KEYS.PRIVACY_WARNING_ACK]);
}

export async function setPrivacyWarningAck(value) {
  await localStorageArea.set({
    [STORAGE_KEYS.PRIVACY_WARNING_ACK]: Boolean(value),
  });
}
