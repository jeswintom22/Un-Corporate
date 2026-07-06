import { AIProvider } from "./provider.js";
import { AppError, ERROR_CODES } from "../shared/errors.js";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

function normalizeProviderError(status) {
  if (status === 401 || status === 403) {
    return new AppError(ERROR_CODES.PROVIDER_AUTH_FAILED, "API KEY GOT REJECTED.");
  }
  if (status === 429) {
    return new AppError(ERROR_CODES.PROVIDER_RATE_LIMITED, "THE ROBOT IS RATE-LIMITING YOU.");
  }
  if (status >= 500) {
    return new AppError(ERROR_CODES.PROVIDER_UNAVAILABLE, "THE ROBOT SAID NOPE.");
  }
  return new AppError(ERROR_CODES.PROVIDER_BAD_RESPONSE, "THE ROBOT SENT GIBBERISH.");
}

async function callOpenAI({ apiKey, model, prompt }) {
  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: JSON.stringify(prompt.user) },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw normalizeProviderError(response.status);
  }

  const body = await response.json();
  const content = body?.choices?.[0]?.message?.content;
  if (!content) {
    throw new AppError(ERROR_CODES.PROVIDER_BAD_RESPONSE, "THE ROBOT SENT NO DATA.");
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new AppError(ERROR_CODES.PROVIDER_BAD_RESPONSE, "THE ROBOT SENT INVALID JSON.");
  }
}

export class OpenAIProvider extends AIProvider {
  constructor({ apiKey, model }) {
    super();
    this.apiKey = apiKey;
    this.model = model;
  }

  async testConnection() {
    const prompt = {
      system: "Return JSON only.",
      user: { ping: true, response: "pong" },
    };
    await callOpenAI({ apiKey: this.apiKey, model: this.model, prompt });
    return { ok: true };
  }

  async detectFindings({ prompt }) {
    return callOpenAI({ apiKey: this.apiKey, model: this.model, prompt });
  }

  async explainFinding({ prompt }) {
    return callOpenAI({ apiKey: this.apiKey, model: this.model, prompt });
  }
}
