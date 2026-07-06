const EXCLUDED_SELECTOR = [
  "script",
  "style",
  "noscript",
  "svg",
  "canvas",
  "iframe",
  "input",
  "textarea",
  "select",
  "option",
  "[hidden]",
  "[contenteditable='true']",
  "[contenteditable='']",
  "[data-uc-sidebar-root]",
  "[aria-hidden='true']",
].join(",");

export function isExcludedElement(element) {
  if (!element || !(element instanceof Element)) {
    return true;
  }

  if (element.closest(EXCLUDED_SELECTOR)) {
    return true;
  }

  const tag = element.tagName.toLowerCase();
  if (tag === "button" && (element.textContent || "").trim().length < 30) {
    return true;
  }

  return false;
}

export function isVisibleElement(element) {
  if (!element || !(element instanceof Element)) {
    return false;
  }

  if (isExcludedElement(element)) {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }

  if (Number(style.opacity) === 0) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return false;
  }

  return true;
}
