import { PROVIDERS } from "../shared/constants.js";
import { AppError, ERROR_CODES } from "../shared/errors.js";
import { OpenAIProvider } from "./openai.provider.js";

export function createProvider(settings, apiKey) {
  if (!settings?.provider || !settings?.model) {
    throw new AppError(ERROR_CODES.INVALID_PROVIDER_SETTINGS, "PROVIDER SETTINGS LOOK SUS.");
  }

  if (!apiKey) {
    throw new AppError(ERROR_CODES.API_KEY_MISSING, "API KEY MISSING. BRUH.");
  }

  if (settings.provider === PROVIDERS.OPENAI) {
    return new OpenAIProvider({ apiKey, model: settings.model });
  }

  throw new AppError(ERROR_CODES.INVALID_PROVIDER_SETTINGS, "UNSUPPORTED PROVIDER.");
}
