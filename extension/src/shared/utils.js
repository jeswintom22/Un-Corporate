export function padNumber(num, width = 4) {
  return String(num).padStart(width, "0");
}

export function uniqueArray(values) {
  return [...new Set(values)];
}

export function safeJsonParse(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function riskWeight(risk) {
  const order = {
    INFO: 0,
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
  };
  return order[risk] ?? -1;
}
