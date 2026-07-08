import { buildDetectionPrompt } from "../prompts/detection.prompt.js";
import { buildExplanationPrompt } from "../prompts/explanation.prompt.js";
import { validateFindingResponse } from "./finding-validator.js";
import { dedupeFindings, finalizeFindings } from "./finding-normalizer.js";
import {
  CHUNK_CONTEXT_LINES,
  EXPLANATION_BATCH_SIZE,
} from "../shared/constants.js";

function getContextBlocks(allBlocks, finding) {
  const blockIndexes = finding.blockIds
    .map((blockId) =>
      allBlocks.findIndex((block) => block.id === blockId)
    )
    .filter((index) => index >= 0);

  if (!blockIndexes.length) {
    return [];
  }

  const firstIndex = Math.min(...blockIndexes);
  const lastIndex = Math.max(...blockIndexes);

  const start = Math.max(
    0,
    firstIndex - CHUNK_CONTEXT_LINES
  );

  const end = Math.min(
    allBlocks.length - 1,
    lastIndex + CHUNK_CONTEXT_LINES
  );

  return allBlocks.slice(start, end + 1);
}

function buildExplanationBatches(findings, allBlocks) {
  const prepared = findings.map((finding) => ({
    finding,
    contextBlocks: getContextBlocks(allBlocks, finding),
  }));

  const batches = [];

  for (
    let index = 0;
    index < prepared.length;
    index += EXPLANATION_BATCH_SIZE
  ) {
    batches.push(
      prepared.slice(
        index,
        index + EXPLANATION_BATCH_SIZE
      )
    );
  }

  return batches;
}

function normalizeExplanationResponse(response) {
  if (!Array.isArray(response?.explanations)) {
    return [];
  }

  return response.explanations.filter(
    (explanation) =>
      explanation &&
      typeof explanation === "object" &&
      typeof explanation.findingId === "string"
  );
}

function applyExplanation(finding, explanation) {
  return {
    ...finding,
    title: String(
      explanation?.title || "Potential User Impact"
    ),
    plainExplanation: String(
      explanation?.plainExplanation ||
        "The text may affect user rights or expectations."
    ),
    whyItMatters: String(
      explanation?.whyItMatters ||
        "This may change what options users have in practice."
    ),
    watchFor: Array.isArray(explanation?.watchFor)
      ? explanation.watchFor
          .slice(0, 5)
          .map((item) => String(item))
      : [],
  };
}

export async function runAnalysis({
  documentData,
  chunks,
  provider,
  onProgress,
  isStale,
}) {
  const allFindings = [];

  const validBlockIds = documentData.blocks.map(
    (block) => block.id
  );

  for (let i = 0; i < chunks.length; i += 1) {
    if (isStale()) {
      return {
        cancelled: true,
        findings: [],
      };
    }

    const chunk = chunks[i];

    onProgress?.({
      phase: "DETECTING",
      current: i + 1,
      total: chunks.length,
      message: `SNIFFING OUT WEIRD CLAUSES... ${i + 1}/${chunks.length}`,
    });

    const detectionPrompt = buildDetectionPrompt({
      documentTitle: documentData.documentTitle,
      url: documentData.url,
      chunk,
    });

    const detectionResponse =
      await provider.detectFindings({
        prompt: detectionPrompt,
      });

    const valid = validateFindingResponse(
      detectionResponse,
      validBlockIds
    );

    allFindings.push(...valid);
  }

  const deduped = dedupeFindings(allFindings);

  const blockOrderMap = new Map(
    documentData.blocks.map((block, index) => [
      block.id,
      index,
    ])
  );

  const normalizedFindings = finalizeFindings(
    deduped,
    blockOrderMap
  );

  const explanationBatches = buildExplanationBatches(
    normalizedFindings,
    documentData.blocks
  );

  const explanationMap = new Map();

  for (
    let i = 0;
    i < explanationBatches.length;
    i += 1
  ) {
    if (isStale()) {
      return {
        cancelled: true,
        findings: [],
      };
    }

    const batch = explanationBatches[i];

    onProgress?.({
      phase: "EXPLAINING",
      current: i + 1,
      total: explanationBatches.length,
      message: `ASKING THE ROBOT WHAT THIS MEANS... ${i + 1}/${explanationBatches.length}`,
    });

    const explanationPrompt = buildExplanationPrompt({
      documentTitle: documentData.documentTitle,
      findings: batch,
    });

    const explanationResponse =
      await provider.explainFinding({
        prompt: explanationPrompt,
      });

    const explanations =
      normalizeExplanationResponse(
        explanationResponse
      );

    for (const explanation of explanations) {
      explanationMap.set(
        explanation.findingId,
        explanation
      );
    }
  }

  const explained = normalizedFindings.map((finding) =>
    applyExplanation(
      finding,
      explanationMap.get(finding.id)
    )
  );

  return {
    cancelled: false,
    findings: explained,
  };
}