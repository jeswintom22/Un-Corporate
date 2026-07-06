export const browserApi = globalThis.browser || globalThis.chrome;

if (!browserApi) {
  throw new Error("Browser extension APIs are unavailable in this context.");
}

export default browserApi;
