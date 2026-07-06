import { CHUNK_CHAR_BUDGET } from "../shared/constants.js";

function estimateBlockSize(block) {
  return (block.text?.length || 0) + 40;
}

export function buildChunks(documentData, budget = CHUNK_CHAR_BUDGET) {
  const chunks = [];
  let currentBlocks = [];
  let currentSize = 0;
  let chunkIndex = 0;
  let section = "General";

  const flush = () => {
    if (!currentBlocks.length) {
      return;
    }

    const id = `chunk_${String(chunkIndex + 1).padStart(4, "0")}`;
    chunks.push({
      id,
      index: chunkIndex,
      section,
      blockIds: currentBlocks.map((b) => b.id),
      blocks: currentBlocks.map((b) => ({ id: b.id, text: b.text, section: b.section })),
    });

    chunkIndex += 1;
    currentBlocks = [];
    currentSize = 0;
  };

  for (const block of documentData.blocks) {
    if (block.tag && /^h[1-6]$/i.test(block.tag)) {
      section = block.text || section;
    }

    const blockSize = estimateBlockSize(block);

    if (blockSize > budget) {
      flush();
      currentBlocks.push(block);
      currentSize = blockSize;
      flush();
      continue;
    }

    if (currentSize + blockSize > budget && currentBlocks.length) {
      flush();
    }

    currentBlocks.push(block);
    currentSize += blockSize;
  }

  flush();

  return {
    chunks,
    totalChunks: chunks.length,
    budget,
  };
}
