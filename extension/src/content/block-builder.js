import { padNumber } from "../shared/utils.js";

export function normalizeText(text) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function makeBlockId(index) {
  return `block_${padNumber(index + 1, 4)}`;
}

export function getSectionForElement(element, fallback = "General") {
  if (!element) {
    return fallback;
  }

  const heading = element.closest("section,article,main")?.querySelector("h1,h2,h3");
  const headingText = normalizeText(heading?.textContent || "");
  return headingText || fallback;
}
