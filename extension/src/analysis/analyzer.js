import { buildDetectionPrompt } from "../prompts/detection.prompt.js";
import { buildExplanationPrompt } from "../prompts/explanation.prompt.js";
import { validateFindingResponse } from "./finding-validator.js";
import { dedupeFindings, finalizeFindings } from "./finding-normalizer.js";
import { CHUNK_CONTEXT_LINES } from "../shared/constants.js";

function getContextBlocks(allBlocks, finding) {
  const firstIndex = allBlocks.findIndex((block) => block.id === finding.blockIds[0]);
  const lastIndex = allBlocks.findIndex((block) => block.id === finding.blockIds[finding.blockIds.length - 1]);

  if (firstIndex < 0 || lastIndex < 0) {
    return [];
  }

  const start = Math.max(0, firstIndex - CHUNK_CONTEXT_LINES);
  const end = Math.min(allBlocks.length - 1, lastIndex + CHUNK_CONTEXT_LINES);
  return allBlocks.slice(start, end + 1);
}

export async function runAnalysis({ documentData, chunks, provider, onProgress, isStale }) {
  const allFindings = [];
  const validBlockIds = documentData.blocks.map((block) => block.id);

  for (let i = 0; i < chunks.length; i += 1) {
    if (isStale()) {
      return { cancelled: true, findings: [] };
    }

    const chunk = chunks[i];
    onProgress?.({ phase: "DETECTING", current: i + 1, total: chunks.length, message: `SNIFFING OUT WEIRD CLAUSES... ${i + 1}/${chunks.length}` });

    const detectionPrompt = buildDetectionPrompt({
      documentTitle: documentData.documentTitle,
      url: documentData.url,
      chunk,
    });

    const detectionResponse = await provider.detectFindings({ prompt: detectionPrompt });
    const valid = validateFindingResponse(detectionResponse, validBlockIds);
    allFindings.push(...valid);
  }

  const deduped = dedupeFindings(allFindings);
  const blockOrderMap = new Map(documentData.blocks.map((block, index) => [block.id, index]));
  const normalizedFindings = finalizeFindings(deduped, blockOrderMap);

  const explained = [];

  for (let i = 0; i < normalizedFindings.length; i += 1) {
    if (isStale()) {
      return { cancelled: true, findings: [] };
    }

    const finding = normalizedFindings[i];
    onProgress?.({ phase: "EXPLAINING", current: i + 1, total: normalizedFindings.length, message: `ASKING THE ROBOT WHAT THIS MEANS... ${i + 1}/${normalizedFindings.length}` });

    const contextBlocks = getContextBlocks(documentData.blocks, finding);
    const explanationPrompt = buildExplanationPrompt({
      documentTitle: documentData.documentTitle,
      finding,
      contextBlocks,
    });

    const explanation = await provider.explainFinding({ prompt: explanationPrompt });

    explained.push({
      ...finding,
      title: String(explanation?.title || "Potential User Impact"),
      plainExplanation: String(explanation?.plainExplanation || "The text may affect user rights or expectations."),
      whyItMatters: String(explanation?.whyItMatters || "This may change what options users have in practice."),
      watchFor: Array.isArray(explanation?.watchFor)
        ? explanation.watchFor.slice(0, 5).map((item) => String(item))
        : [],
    });
  }

  return {
    cancelled: false,
    findings: explained,
  };
}
