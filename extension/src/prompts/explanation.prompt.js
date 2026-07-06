export function buildExplanationPrompt({ documentTitle, finding, contextBlocks }) {
  return {
    system: [
      "You explain policy clauses in concise, factual language.",
      "Do not provide legal advice.",
      "Do not invent intent.",
      "If language is ambiguous, say that clearly.",
      "Return JSON only.",
    ].join("\n"),
    user: {
      task: "Explain one validated finding.",
      output: {
        title: "string",
        plainExplanation: "string",
        whyItMatters: "string",
        watchFor: ["string"],
      },
      finding: {
        category: finding.category,
        risk: finding.risk,
        blockIds: finding.blockIds,
      },
      context: {
        documentTitle,
        blocks: contextBlocks,
      },
    },
  };
}
