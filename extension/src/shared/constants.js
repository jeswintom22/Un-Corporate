export const PROVIDERS = {
  OPENAI: "openai",
};

export const RISK_LEVELS = ["INFO", "LOW", "MEDIUM", "HIGH"];

export const DEFAULT_PROVIDER_SETTINGS = {
  provider: PROVIDERS.OPENAI,
  model: "gpt-4.1-mini",
  keyStorageMode: "local",
  hasCompletedSetup: false,
};

export const STORAGE_KEYS = {
  PROVIDER_SETTINGS: "providerSettings",
  API_KEY_LOCAL: "apiKeyLocal",
  API_KEY_SESSION: "apiKeySession",
  PRIVACY_WARNING_ACK: "privacyWarningAcknowledged",
};

export const SCAN_PHASES = {
  IDLE: "IDLE",
  EXTRACTING: "EXTRACTING",
  CHUNKING: "CHUNKING",
  DETECTING: "DETECTING",
  EXPLAINING: "EXPLAINING",
  RENDERING: "RENDERING",
  COMPLETE: "COMPLETE",
  ERROR: "ERROR",
  CANCELLED: "CANCELLED",
};

export const CHUNK_CHAR_BUDGET = 5500;
export const CHUNK_CONTEXT_LINES = 2;
