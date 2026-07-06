import { buildDetectionPrompt } from "../prompts/detection.prompt.js";
import { buildExplanationPrompt } from "../prompts/explanation.prompt.js";
import { validateFindingResponse } from "./finding-validator.js";
import {
  dedupeFindings,
  finalizeFindings,
} from "./finding-normalizer.js";
import {
  CHUNK_CONTEXT_LINES,
} from "../shared/constants.js";

const DETECTION_CONCURRENCY = 3;

function getContextBlocks(allBlocks, finding) {
  const firstIndex = allBlocks.findIndex(
    (block) => block.id === finding.blockIds[0]
  );

  const lastIndex = allBlocks.findIndex(
    (block) =>
      block.id ===
      finding.blockIds[finding.blockIds.length - 1]
  );

  if (firstIndex < 0 || lastIndex < 0) {
    return [];
  }

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

async function runWithConcurrency({
  items,
  concurrency,
  worker,
  isStale,
}) {
  const results = new Array(items.length);

  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      if (isStale()) {
        return;
      }

      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await worker(
        items[currentIndex],
        currentIndex
      );
    }
  }

  const workerCount = Math.min(
    concurrency,
    items.length
  );

  const workers = Array.from(
    { length: workerCount },
    () => runWorker()
  );

  await Promise.all(workers);

  return results;
}

async function detectFindings({
  documentData,
  chunks,
  provider,
  onProgress,
  isStale,
}) {
  const validBlockIds = documentData.blocks.map(
    (block) => block.id
  );

  let completedChunks = 0;

  const detectionResults = await runWithConcurrency({
    items: chunks,
    concurrency: DETECTION_CONCURRENCY,
    isStale,

    worker: async (chunk) => {
      if (isStale()) {
        return [];
      }

      const detectionPrompt = buildDetectionPrompt({
        documentTitle: documentData.documentTitle,
        url: documentData.url,
        chunk,
      });

      const detectionResponse =
        await provider.detectFindings({
          prompt: detectionPrompt,
        });

      if (isStale()) {
        return [];
      }

      const validFindings = validateFindingResponse(
        detectionResponse,
        validBlockIds
      );

      completedChunks += 1;

      onProgress?.({
        phase: "DETECTING",
        current: completedChunks,
        total: chunks.length,
        message:
          `SNIFFING OUT WEIRD CLAUSES... ` +
          `${completedChunks}/${chunks.length}`,
      });

      return validFindings;
    },
  });

  if (isStale()) {
    return {
      cancelled: true,
      findings: [],
    };
  }

  return {
    cancelled: false,
    findings: detectionResults
      .filter(Array.isArray)
      .flat(),
  };
}

async function explainFindings({
  documentData,
  findings,
  provider,
  onProgress,
  isStale,
}) {
  const explained = [];

  for (
    let index = 0;
    index < findings.length;
    index += 1
  ) {
    if (isStale()) {
      return {
        cancelled: true,
        findings: [],
      };
    }

    const finding = findings[index];

    onProgress?.({
      phase: "EXPLAINING",
      current: index + 1,
      total: findings.length,
      message:
        `ASKING THE ROBOT WHAT THIS MEANS... ` +
        `${index + 1}/${findings.length}`,
    });

    const contextBlocks = getContextBlocks(
      documentData.blocks,
      finding
    );

    const explanationPrompt =
      buildExplanationPrompt({
        documentTitle: documentData.documentTitle,
        finding,
        contextBlocks,
      });

    const explanation =
      await provider.explainFinding({
        prompt: explanationPrompt,
      });

    if (isStale()) {
      return {
        cancelled: true,
        findings: [],
      };
    }

    explained.push({
      ...finding,

      title: String(
        explanation?.title ||
          "Potential User Impact"
      ),

      plainExplanation: String(
        explanation?.plainExplanation ||
          "The text may affect user rights or expectations."
      ),

      whyItMatters: String(
        explanation?.whyItMatters ||
          "This may change what options users have in practice."
      ),

      watchFor: Array.isArray(
        explanation?.watchFor
      )
        ? explanation.watchFor
            .slice(0, 5)
            .map((item) => String(item))
        : [],
    });
  }

  return {
    cancelled: false,
    findings: explained,
  };
}

export async function runAnalysis({
  documentData,
  chunks,
  provider,
  onProgress,
  isStale,
}) {
  const detectionResult = await detectFindings({
    documentData,
    chunks,
    provider,
    onProgress,
    isStale,
  });

  if (detectionResult.cancelled) {
    return {
      cancelled: true,
      findings: [],
    };
  }

  const deduped = dedupeFindings(
    detectionResult.findings
  );

  const blockOrderMap = new Map(
    documentData.blocks.map(
      (block, index) => [block.id, index]
    )
  );

  const normalizedFindings = finalizeFindings(
    deduped,
    blockOrderMap
  );

  const explanationResult = await explainFindings({
    documentData,
    findings: normalizedFindings,
    provider,
    onProgress,
    isStale,
  });

  if (explanationResult.cancelled) {
    return {
      cancelled: true,
      findings: [],
    };
  }

  return {
    cancelled: false,
    findings: explanationResult.findings,
  };
}