import { isVisibleElement } from "./visibility.js";
import { makeBlockId, normalizeText, getSectionForElement } from "./block-builder.js";
import { saveDomMap } from "./dom-map.js";

const CANDIDATE_SELECTOR = "h1,h2,h3,h4,h5,h6,p,li,blockquote,td,th,dt,dd,div,section,article";

function hasMeaningfulDirectText(element) {
  const cloned = element.cloneNode(true);
  for (const child of [...cloned.children]) {
    child.remove();
  }
  const directText = normalizeText(cloned.textContent || "");
  return directText.length > 25;
}

function shouldUseContainer(element) {
  const tag = element.tagName.toLowerCase();
  if (["div", "section", "article"].includes(tag)) {
    return hasMeaningfulDirectText(element);
  }
  return true;
}

export function extractDocument(scanId) {
  const blocks = [];
  const domMap = new Map();

  const elements = [...document.body.querySelectorAll(CANDIDATE_SELECTOR)].filter((element) => {
    if (!isVisibleElement(element)) {
      return false;
    }

    if (!shouldUseContainer(element)) {
      return false;
    }

    // Keep leaf-most semantic blocks to avoid duplicate parent/child extraction.
    const semanticChild = element.querySelector("h1,h2,h3,h4,h5,h6,p,li,blockquote,td,th,dt,dd");
    if (semanticChild && ["div", "section", "article"].includes(element.tagName.toLowerCase())) {
      return false;
    }

    return true;
  });

  let currentSection = "General";

  for (const element of elements) {
    const text = normalizeText(element.textContent || "");
    if (!text || text.length < 20) {
      continue;
    }

    const tag = element.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) {
      currentSection = text;
    }

    const blockId = makeBlockId(blocks.length);
    const block = {
      id: blockId,
      text,
      tag,
      section: currentSection || getSectionForElement(element),
    };

    blocks.push(block);
    domMap.set(blockId, element);
  }

  saveDomMap(scanId, domMap);

  return {
    documentData: {
      documentTitle: document.title || "Untitled Document",
      url: window.location.href,
      blocks,
    },
  };
}
