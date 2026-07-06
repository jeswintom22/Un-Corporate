import { CATEGORY_MAP } from "../analysis/risk-categories.js";

let hostEl = null;
let shadowRoot = null;
let onSelectFinding = null;
let onClose = null;
let onCopy = null;
let currentState = {
  findings: [],
  summary: { high: 0, medium: 0, low: 0, info: 0 },
  selectedFindingId: null,
};

function getRiskLabel(risk) {
  return String(risk || "INFO").toUpperCase();
}

function findingCategoryLabel(categoryId) {
  return CATEGORY_MAP[categoryId]?.shortLabel || categoryId;
}

function ensureHost() {
  if (hostEl && hostEl.isConnected) {
    return;
  }

  hostEl = document.createElement("div");
  hostEl.dataset.ucSidebarRoot = "true";
  hostEl.className = "uc-sidebar-root";
  document.documentElement.appendChild(hostEl);

  shadowRoot = hostEl.attachShadow({ mode: "open" });

  const tokenLink = document.createElement("link");
  tokenLink.rel = "stylesheet";
  tokenLink.href = chrome.runtime.getURL("src/ui/tokens.css");

  const componentLink = document.createElement("link");
  componentLink.rel = "stylesheet";
  componentLink.href = chrome.runtime.getURL("src/ui/pixel-components.css");

  const sidebarLink = document.createElement("link");
  sidebarLink.rel = "stylesheet";
  sidebarLink.href = chrome.runtime.getURL("src/content/sidebar.css");

  shadowRoot.append(tokenLink, componentLink, sidebarLink);
}

function createCard(finding) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "uc-finding-card";
  button.dataset.findingId = finding.id;
  button.dataset.selected = String(finding.id === currentState.selectedFindingId);

  const category = document.createElement("div");
  category.className = "uc-chip";
  category.textContent = findingCategoryLabel(finding.category);

  const risk = document.createElement("div");
  risk.className = "uc-chip";
  risk.textContent = getRiskLabel(finding.risk);

  const title = document.createElement("div");
  title.textContent = finding.title;

  const meta = document.createElement("div");
  meta.className = "uc-chip-row";
  meta.append(category, risk);

  button.append(meta, title);

  button.addEventListener("click", () => {
    onSelectFinding?.(finding.id);
  });

  return button;
}

function createDetail(selectedFinding) {
  const detail = document.createElement("section");
  detail.className = "uc-detail";

  if (!selectedFinding) {
    const text = document.createElement("p");
    text.textContent = "Pick a finding to see the full explanation.";
    detail.appendChild(text);
    return detail;
  }

  const title = document.createElement("h4");
  title.textContent = selectedFinding.title;

  const explainLabel = document.createElement("h4");
  explainLabel.textContent = "WHAT THEY MEAN";

  const explain = document.createElement("p");
  explain.textContent = selectedFinding.plainExplanation;

  const matterLabel = document.createElement("h4");
  matterLabel.textContent = "WHY YOU SHOULD CARE";

  const matter = document.createElement("p");
  matter.textContent = selectedFinding.whyItMatters;

  const watchLabel = document.createElement("h4");
  watchLabel.textContent = "KEEP AN EYE ON";

  const watchList = document.createElement("ul");
  for (const watchItem of selectedFinding.watchFor || []) {
    const item = document.createElement("li");
    item.textContent = watchItem;
    watchList.appendChild(item);
  }

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "pixel-button";
  copyButton.textContent = "COPY";
  copyButton.addEventListener("click", () => {
    onCopy?.(selectedFinding);
  });

  detail.append(title, explainLabel, explain, matterLabel, matter, watchLabel, watchList, copyButton);
  return detail;
}

function render() {
  if (!shadowRoot) {
    return;
  }

  const selectedFinding = currentState.findings.find((finding) => finding.id === currentState.selectedFindingId);

  const container = document.createElement("section");
  container.className = "uc-sidebar";

  const header = document.createElement("header");
  header.className = "uc-header";
  header.innerHTML = `
    <div class="uc-row">
      <h3 class="uc-title">UN-CORPORATE</h3>
      <button type="button" class="pixel-button" data-role="close">X</button>
    </div>
    <div>CORPORATE SPEAK DETECTOR v1</div>
  `;

  const stats = document.createElement("section");
  stats.className = "uc-section";
  stats.innerHTML = `
    <div>SCAN COMPLETE!</div>
    <div class="uc-chip-row">
      <span class="uc-chip">${currentState.summary.high} HIGH</span>
      <span class="uc-chip">${currentState.summary.medium} MED</span>
      <span class="uc-chip">${currentState.summary.low} LOW</span>
      <span class="uc-chip">${currentState.summary.info} INFO</span>
    </div>
  `;

  const list = document.createElement("section");
  list.className = "uc-findings-list";
  currentState.findings.forEach((finding) => list.appendChild(createCard(finding)));

  container.append(header, stats, list, createDetail(selectedFinding));

  const footer = document.createElement("footer");
  footer.className = "uc-footer";
  footer.textContent = "AI explanation, not legal advice.";
  container.appendChild(footer);

  shadowRoot.innerHTML = "";

  const tokenLink = document.createElement("link");
  tokenLink.rel = "stylesheet";
  tokenLink.href = chrome.runtime.getURL("src/ui/tokens.css");

  const componentLink = document.createElement("link");
  componentLink.rel = "stylesheet";
  componentLink.href = chrome.runtime.getURL("src/ui/pixel-components.css");

  const sidebarLink = document.createElement("link");
  sidebarLink.rel = "stylesheet";
  sidebarLink.href = chrome.runtime.getURL("src/content/sidebar.css");

  shadowRoot.append(tokenLink, componentLink, sidebarLink, container);

  const closeButton = shadowRoot.querySelector('[data-role="close"]');
  closeButton?.addEventListener("click", () => onClose?.());
}

export function openSidebar({ findings, summary, selectedFindingId, handlers }) {
  ensureHost();
  onSelectFinding = handlers?.onSelectFinding || null;
  onClose = handlers?.onClose || null;
  onCopy = handlers?.onCopy || null;

  currentState = {
    ...currentState,
    findings: findings || [],
    summary: summary || currentState.summary,
    selectedFindingId: selectedFindingId || findings?.[0]?.id || null,
  };

  render();
}

export function updateSidebarSelection(findingId) {
  currentState.selectedFindingId = findingId;
  render();
}

export function closeSidebar() {
  if (hostEl && hostEl.isConnected) {
    hostEl.remove();
  }
  hostEl = null;
  shadowRoot = null;
}
