import browserApi from "../shared/browser.js";
import { MESSAGES } from "../shared/messages.js";

const POLL_INTERVAL_MS = 500;

const RUNNING_STATUSES = new Set([
  "EXTRACTING",
  "CHUNKING",
  "DETECTING",
  "EXPLAINING",
  "RENDERING",
]);

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

let pollTimer = null;
let pollInFlight = false;

async function callBackground(type, payload = {}) {
  return browserApi.runtime.sendMessage({
    type,
    payload,
  });
}

function toggle(elRef, visible) {
  elRef.classList.toggle("hidden", !visible);
}

function isRunningStatus(status) {
  return RUNNING_STATUSES.has(status);
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

  const progress = state?.progress || {
    current: 0,
    total: 0,
    message: "READY TO GET NOSY",
  };

  el.statusText.textContent =
    progress.message || "READY TO GET NOSY";

  const isRunning = isRunningStatus(status);
  const isComplete = status === "COMPLETE";

  toggle(el.progressWrap, isRunning);

  const total = Number(progress.total) || 0;
  const current = Number(progress.current) || 0;

  const percent =
    total > 0
      ? Math.min(
          100,
          Math.round((current / total) * 100)
        )
      : 0;

  el.progressBar.style.width = `${percent}%`;

  el.progressNumbers.textContent =
    total > 0
      ? `${current} / ${total}`
      : status;

  toggle(
    el.scanBtn,
    !isRunning && !isComplete
  );

  toggle(el.cancelBtn, isRunning);
  toggle(el.openBtn, isComplete);
  toggle(el.rescanBtn, isComplete);

  toggle(
    el.clearBtn,
    isComplete ||
      status === "ERROR" ||
      status === "CANCELLED"
  );

  toggle(el.summaryWrap, isComplete);

  if (isComplete) {
    renderSummary(state.summary || {});
  }
}

function stopPolling() {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function pollScanState() {
  if (pollInFlight) {
    return;
  }

  pollInFlight = true;

  try {
    const stateResult = await callBackground(
      MESSAGES.GET_TAB_SCAN_STATE
    );

    if (!stateResult?.ok) {
      stopPolling();

      el.statusText.textContent =
        stateResult?.error?.message ||
        "INTERNAL EXTENSION ERROR.";

      return;
    }

    const state = stateResult.state;

    renderState(state);

    if (!isRunningStatus(state?.status)) {
      stopPolling();
    }
  } catch {
    stopPolling();

    el.statusText.textContent =
      "INTERNAL EXTENSION ERROR.";
  } finally {
    pollInFlight = false;
  }
}

function startPolling() {
  stopPolling();

  pollScanState();

  pollTimer = setInterval(
    pollScanState,
    POLL_INTERVAL_MS
  );
}

async function maybeConfirmPrivacyWarning() {
  const warningState = await callBackground(
    MESSAGES.GET_PRIVACY_WARNING_STATE
  );

  if (
    !warningState?.ok ||
    warningState.acknowledged
  ) {
    return true;
  }

  const providerResponse = await callBackground(
    MESSAGES.GET_PROVIDER_SETTINGS
  );

  const provider =
    providerResponse?.settings?.provider ||
    "your provider";

  const accepted = confirm(
    `SEND PAGE TEXT TO ${provider.toUpperCase()}?\n\n` +
      `Un-Corporate will extract visible document text ` +
      `and send it to ${provider} using your API key.\n\n` +
      `Don't scan sensitive documents unless you are ` +
      `allowed to send them to that provider.`
  );

  if (!accepted) {
    return false;
  }

  await callBackground(
    MESSAGES.SET_PRIVACY_WARNING_STATE,
    {
      acknowledged: true,
    }
  );

  return true;
}

async function refreshSettings() {
  const settingsResult = await callBackground(
    MESSAGES.GET_PROVIDER_SETTINGS
  );

  if (!settingsResult?.ok) {
    return;
  }

  el.providerText.textContent = (
    settingsResult.settings.provider ||
    "openai"
  ).toUpperCase();

  el.modelText.textContent =
    settingsResult.settings.model || "-";
}

async function refreshState() {
  const stateResult = await callBackground(
    MESSAGES.GET_TAB_SCAN_STATE
  );

  if (!stateResult?.ok) {
    el.statusText.textContent =
      stateResult?.error?.message ||
      "INTERNAL EXTENSION ERROR.";

    return null;
  }

  renderState(stateResult.state);

  return stateResult.state;
}

async function initializePopup() {
  await refreshSettings();

  const state = await refreshState();

  if (isRunningStatus(state?.status)) {
    startPolling();
  }
}

el.scanBtn.addEventListener(
  "click",
  async () => {
    const allowed =
      await maybeConfirmPrivacyWarning();

    if (!allowed) {
      return;
    }

    const start = await callBackground(
      MESSAGES.START_SCAN
    );

    if (!start?.ok) {
      el.statusText.textContent =
        start?.error?.message ||
        "THE ROBOT SAID NOPE.";

      return;
    }

    renderState(start.state);
    startPolling();
  }
);

el.cancelBtn.addEventListener(
  "click",
  async () => {
    stopPolling();

    const result = await callBackground(
      MESSAGES.CANCEL_SCAN
    );

    if (result?.ok) {
      renderState(result.state);
      return;
    }

    el.statusText.textContent =
      result?.error?.message ||
      "COULD NOT CANCEL SCAN.";
  }
);

el.openBtn.addEventListener(
  "click",
  async () => {
    const result = await callBackground(
      MESSAGES.OPEN_SIDEBAR
    );

    if (!result?.ok) {
      el.statusText.textContent =
        result?.error?.message ||
        "COULD NOT OPEN FINDINGS.";
    }
  }
);

el.rescanBtn.addEventListener(
  "click",
  async () => {
    const allowed =
      await maybeConfirmPrivacyWarning();

    if (!allowed) {
      return;
    }

    const start = await callBackground(
      MESSAGES.START_SCAN
    );

    if (!start?.ok) {
      el.statusText.textContent =
        start?.error?.message ||
        "COULD NOT START SCAN.";

      return;
    }

    renderState(start.state);
    startPolling();
  }
);

el.clearBtn.addEventListener(
  "click",
  async () => {
    stopPolling();

    const result = await callBackground(
      MESSAGES.CLEAR_SCAN
    );

    if (result?.ok) {
      renderState(result.state);
      return;
    }

    el.statusText.textContent =
      result?.error?.message ||
      "COULD NOT CLEAR SCAN.";
  }
);

el.settingsBtn.addEventListener(
  "click",
  () => {
    browserApi.runtime.openOptionsPage();
  }
);

window.addEventListener(
  "unload",
  stopPolling
);

initializePopup();