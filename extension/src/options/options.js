import browserApi from "../shared/browser.js";
import { MESSAGES } from "../shared/messages.js";

const el = {
  provider: document.getElementById("provider"),
  apiKey: document.getElementById("apiKey"),
  toggleApiKey: document.getElementById("toggleApiKey"),
  model: document.getElementById("model"),
  testBtn: document.getElementById("testBtn"),
  saveBtn: document.getElementById("saveBtn"),
  deleteBtn: document.getElementById("deleteBtn"),
  status: document.getElementById("status"),
};

function getStorageMode() {
  const selected = document.querySelector("input[name='storageMode']:checked");
  return selected?.value || "local";
}

function setStorageMode(value) {
  const radio = document.querySelector(`input[name='storageMode'][value='${value}']`);
  if (radio) {
    radio.checked = true;
  }
}

async function callBackground(type, payload = {}) {
  return browserApi.runtime.sendMessage({ type, payload });
}

function setStatus(text) {
  el.status.textContent = `STATUS: ${text}`;
}

async function loadSettings() {
  const result = await callBackground(MESSAGES.GET_PROVIDER_SETTINGS);
  if (!result?.ok) {
    setStatus("FAILED TO LOAD SETTINGS");
    return;
  }

  const settings = result.settings;
  el.provider.value = settings.provider || "openai";
  el.model.value = settings.model || "gpt-4.1-mini";
  setStorageMode(settings.keyStorageMode || "local");
}

el.toggleApiKey.addEventListener("click", () => {
  const masked = el.apiKey.type === "password";
  el.apiKey.type = masked ? "text" : "password";
  el.toggleApiKey.textContent = masked ? "HIDE" : "SHOW";
});

el.testBtn.addEventListener("click", async () => {
  setStatus("TESTING...");
  const result = await callBackground(MESSAGES.TEST_PROVIDER, {
    settings: {
      provider: el.provider.value,
      model: el.model.value.trim(),
      keyStorageMode: getStorageMode(),
    },
    apiKey: el.apiKey.value.trim() || undefined,
  });

  if (result?.ok) {
    setStatus("ROBOT RESPONDED. WE'RE SO BACK.");
  } else {
    setStatus(result?.error?.message || "THE ROBOT SAID NOPE.");
  }
});

el.saveBtn.addEventListener("click", async () => {
  const payload = {
    settings: {
      provider: el.provider.value,
      model: el.model.value.trim(),
      keyStorageMode: getStorageMode(),
      hasCompletedSetup: true,
    },
    apiKey: el.apiKey.value.trim(),
  };

  const result = await callBackground(MESSAGES.SAVE_PROVIDER_SETTINGS, payload);
  if (result?.ok) {
    setStatus("SETTINGS SAVED.");
    el.apiKey.value = "";
  } else {
    setStatus(result?.error?.message || "FAILED TO SAVE.");
  }
});

el.deleteBtn.addEventListener("click", async () => {
  const result = await callBackground(MESSAGES.DELETE_API_KEY);
  if (result?.ok) {
    el.apiKey.value = "";
    setStatus("API KEY DELETED.");
  } else {
    setStatus(result?.error?.message || "DELETE FAILED.");
  }
});

loadSettings();
