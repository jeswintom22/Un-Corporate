import browserApi from "../shared/browser.js";
import { MESSAGES } from "../shared/messages.js";

const el = {
  statusText: document.getElementById("statusText"),
  progressWrap: document.getElementById("progressWrap"),
  progressBar: document.getElementById("progressBar"),
  progressNumbers: document.getElementById("progressNumbers"),
  summaryWrap: document.getElementById("summaryWrap"),
  scanBtn: document.getElementById("scanBtn"),
  cancelBtn: document.getElementById("cancelBtn"),
  openBtn: document.getElementById("openBtn"),
  rescanBtn: document.getElementById("rescanBtn"),
  clearBtn: document.getElementById("clearBtn"),
  settingsBtn: document.getElementById("settingsBtn"),
  providerText: document.getElementById("providerText"),
  modelText: document.getElementById("modelText"),
};

async function callBackground(type, payload = {}) {
  return browserApi.runtime.sendMessage({ type, payload });
}

function toggle(elRef, visible) {
  elRef.classList.toggle("hidden", !visible);
}

function renderSummary(summary) {
  el.summaryWrap.innerHTML = "";

  const values = [
    `${summary.high || 0} HIGH`,
    `${summary.medium || 0} MEDIUM`,
    `${summary.low || 0} LOW`,
    `${summary.info || 0} INFO`,
  ];

  for (const text of values) {
    const badge = document.createElement("span");
    badge.className = "pixel-badge";
    badge.textContent = text;
    el.summaryWrap.appendChild(badge);
  }
}

function renderState(state) {
  const status = state?.status || "IDLE";
  const progress = state?.progress || { current: 0, total: 0, message: "READY TO GET NOSY" };

  el.statusText.textContent = progress.message || "READY TO GET NOSY";
  toggle(el.progressWrap, ["EXTRACTING", "CHUNKING", "DETECTING", "EXPLAINING", "RENDERING"].includes(status));

  const total = progress.total || 0;
  const current = progress.current || 0;
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  el.progressBar.style.width = `${percent}%`;
  el.progressNumbers.textContent = `${current} / ${total}`;

  const isComplete = status === "COMPLETE";
  const isRunning = ["EXTRACTING", "CHUNKING", "DETECTING", "EXPLAINING", "RENDERING"].includes(status);

  toggle(el.scanBtn, !isRunning && !isComplete);
  toggle(el.cancelBtn, isRunning);
  toggle(el.openBtn, isComplete);
  toggle(el.rescanBtn, isComplete);
  toggle(el.clearBtn, isComplete || status === "ERROR" || status === "CANCELLED");
  toggle(el.summaryWrap, isComplete);

  if (isComplete) {
    renderSummary(state.summary || {});
  }
}

async function maybeConfirmPrivacyWarning() {
  const warningState = await callBackground(MESSAGES.GET_PRIVACY_WARNING_STATE);
  if (!warningState?.ok || warningState.acknowledged) {
    return true;
  }

  const providerResponse = await callBackground(MESSAGES.GET_PROVIDER_SETTINGS);
  const provider = providerResponse?.settings?.provider || "your provider";

  const accepted = confirm(
    `SEND PAGE TEXT TO ${provider.toUpperCase()}?\n\nUn-Corporate will extract visible document text and send it to ${provider} using your API key.\n\nDon't scan sensitive documents unless you are allowed to send them to that provider.`
  );

  if (!accepted) {
    return false;
  }

  await callBackground(MESSAGES.SET_PRIVACY_WARNING_STATE, { acknowledged: true });
  return true;
}

async function refresh() {
  const settingsResult = await callBackground(MESSAGES.GET_PROVIDER_SETTINGS);
  if (settingsResult?.ok) {
    el.providerText.textContent = (settingsResult.settings.provider || "openai").toUpperCase();
    el.modelText.textContent = settingsResult.settings.model || "-";
  }

  const stateResult = await callBackground(MESSAGES.GET_TAB_SCAN_STATE);
  if (stateResult?.ok) {
    renderState(stateResult.state);
  }
}

el.scanBtn.addEventListener("click", async () => {
  const allowed = await maybeConfirmPrivacyWarning();
  if (!allowed) {
    return;
  }

  const start = await callBackground(MESSAGES.START_SCAN);
  if (!start?.ok) {
    el.statusText.textContent = start?.error?.message || "THE ROBOT SAID NOPE.";
    return;
  }

  renderState(start.state);
  await refresh();
});

el.cancelBtn.addEventListener("click", async () => {
  await callBackground(MESSAGES.CANCEL_SCAN);
  await refresh();
});

el.openBtn.addEventListener("click", async () => {
  await callBackground(MESSAGES.OPEN_SIDEBAR);
});

el.rescanBtn.addEventListener("click", async () => {
  const allowed = await maybeConfirmPrivacyWarning();
  if (!allowed) {
    return;
  }

  await callBackground(MESSAGES.START_SCAN);
  await refresh();
});

el.clearBtn.addEventListener("click", async () => {
  await callBackground(MESSAGES.CLEAR_SCAN);
  await refresh();
});

el.settingsBtn.addEventListener("click", () => {
  browserApi.runtime.openOptionsPage();
});

refresh();
