import browserApi from "../shared/browser.js";
import { CATEGORY_MAP } from "../analysis/risk-categories.js";

let hostEl = null;
let shadowRoot = null;

let onSelectFinding = null;
let onClose = null;
let onCopy = null;

let currentState = {
  findings: [],
  summary: {
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  },
  selectedFindingId: null,
};

const STYLESHEETS = [
  "src/ui/tokens.css",
  "src/ui/pixel-components.css",
  "src/content/sidebar.css",
];

function getRiskLabel(risk) {
  return String(
    risk || "INFO"
  ).toUpperCase();
}

function findingCategoryLabel(categoryId) {
  return (
    CATEGORY_MAP[categoryId]?.shortLabel ||
    categoryId
  );
}

function appendStylesheets() {
  for (const stylesheetPath of STYLESHEETS) {
    const link =
      document.createElement("link");

    link.rel = "stylesheet";

    link.href =
      browserApi.runtime.getURL(
        stylesheetPath
      );

    shadowRoot.appendChild(link);
  }
}

function ensureHost() {
  if (
    hostEl &&
    hostEl.isConnected &&
    shadowRoot
  ) {
    return;
  }

  hostEl = document.createElement("div");

  hostEl.dataset.ucSidebarRoot = "true";

  hostEl.className = "uc-sidebar-root";

  document.documentElement.appendChild(
    hostEl
  );

  shadowRoot = hostEl.attachShadow({
    mode: "open",
  });
}

function createCard(finding) {
  const button =
    document.createElement("button");

  button.type = "button";

  button.className = "uc-finding-card";

  button.dataset.findingId = finding.id;

  button.dataset.selected = String(
    finding.id ===
      currentState.selectedFindingId
  );

  const category =
    document.createElement("div");

  category.className = "uc-chip";

  category.textContent =
    findingCategoryLabel(finding.category);

  const risk =
    document.createElement("div");

  risk.className = "uc-chip";

  risk.textContent =
    getRiskLabel(finding.risk);

  const title =
    document.createElement("div");

  title.textContent = finding.title;

  const meta =
    document.createElement("div");

  meta.className = "uc-chip-row";

  meta.append(
    category,
    risk
  );

  button.append(
    meta,
    title
  );

  button.addEventListener(
    "click",
    () => {
      onSelectFinding?.(
        finding.id
      );
    }
  );

  return button;
}

function createDetail(selectedFinding) {
  const detail =
    document.createElement("section");

  detail.className = "uc-detail";

  if (!selectedFinding) {
    const text =
      document.createElement("p");

    text.textContent =
      "Pick a finding to see the full explanation.";

    detail.appendChild(text);

    return detail;
  }

  const title =
    document.createElement("h4");

  title.textContent =
    selectedFinding.title;

  const explainLabel =
    document.createElement("h4");

  explainLabel.textContent =
    "WHAT THEY MEAN";

  const explain =
    document.createElement("p");

  explain.textContent =
    selectedFinding.plainExplanation;

  const matterLabel =
    document.createElement("h4");

  matterLabel.textContent =
    "WHY YOU SHOULD CARE";

  const matter =
    document.createElement("p");

  matter.textContent =
    selectedFinding.whyItMatters;

  const watchLabel =
    document.createElement("h4");

  watchLabel.textContent =
    "KEEP AN EYE ON";

  const watchList =
    document.createElement("ul");

  for (
    const watchItem of
    selectedFinding.watchFor || []
  ) {
    const item =
      document.createElement("li");

    item.textContent = watchItem;

    watchList.appendChild(item);
  }

  const copyButton =
    document.createElement("button");

  copyButton.type = "button";

  copyButton.className =
    "pixel-button";

  copyButton.textContent = "COPY";

  copyButton.addEventListener(
    "click",
    () => {
      onCopy?.(
        selectedFinding
      );
    }
  );

  detail.append(
    title,
    explainLabel,
    explain,
    matterLabel,
    matter,
    watchLabel,
    watchList,
    copyButton
  );

  return detail;
}

function createHeader() {
  const header =
    document.createElement("header");

  header.className = "uc-header";

  const row =
    document.createElement("div");

  row.className = "uc-row";

  const title =
    document.createElement("h3");

  title.className = "uc-title";

  title.textContent =
    "UN-CORPORATE";

  const closeButton =
    document.createElement("button");

  closeButton.type = "button";

  closeButton.className =
    "pixel-button";

  closeButton.dataset.role = "close";

  closeButton.textContent = "X";

  closeButton.addEventListener(
    "click",
    () => {
      onClose?.();
    }
  );

  row.append(
    title,
    closeButton
  );

  const subtitle =
    document.createElement("div");

  subtitle.textContent =
    "CORPORATE SPEAK DETECTOR v1";

  header.append(
    row,
    subtitle
  );

  return header;
}

function createStats() {
  const stats =
    document.createElement("section");

  stats.className = "uc-section";

  const title =
    document.createElement("div");

  title.textContent =
    "SCAN COMPLETE!";

  const chipRow =
    document.createElement("div");

  chipRow.className =
    "uc-chip-row";

  const values = [
    `${currentState.summary.high} HIGH`,
    `${currentState.summary.medium} MED`,
    `${currentState.summary.low} LOW`,
    `${currentState.summary.info} INFO`,
  ];

  for (const value of values) {
    const chip =
      document.createElement("span");

    chip.className = "uc-chip";

    chip.textContent = value;

    chipRow.appendChild(chip);
  }

  stats.append(
    title,
    chipRow
  );

  return stats;
}

function createFindingsList() {
  const list =
    document.createElement("section");

  list.className =
    "uc-findings-list";

  for (
    const finding of
    currentState.findings
  ) {
    list.appendChild(
      createCard(finding)
    );
  }

  return list;
}

function createFooter() {
  const footer =
    document.createElement("footer");

  footer.className = "uc-footer";

  footer.textContent =
    "AI explanation, not legal advice.";

  return footer;
}

function render() {
  if (!shadowRoot) {
    return;
  }

  const selectedFinding =
    currentState.findings.find(
      (finding) =>
        finding.id ===
        currentState.selectedFindingId
    );

  const container =
    document.createElement("section");

  container.className = "uc-sidebar";

  container.append(
    createHeader(),
    createStats(),
    createFindingsList(),
    createDetail(selectedFinding),
    createFooter()
  );

  shadowRoot.replaceChildren();

  appendStylesheets();

  shadowRoot.appendChild(container);
}

export function openSidebar({
  findings,
  summary,
  selectedFindingId,
  handlers,
}) {
  ensureHost();

  onSelectFinding =
    handlers?.onSelectFinding || null;

  onClose =
    handlers?.onClose || null;

  onCopy =
    handlers?.onCopy || null;

  currentState = {
    ...currentState,

    findings:
      findings || [],

    summary:
      summary ||
      currentState.summary,

    selectedFindingId:
      selectedFindingId ||
      findings?.[0]?.id ||
      null,
  };

  render();
}

export function updateSidebarSelection(
  findingId
) {
  currentState.selectedFindingId =
    findingId;

  render();
}

export function closeSidebar() {
  if (
    hostEl &&
    hostEl.isConnected
  ) {
    hostEl.remove();
  }

  hostEl = null;
  shadowRoot = null;
}