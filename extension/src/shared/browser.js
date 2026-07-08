const rawBrowserApi =
  globalThis.browser || globalThis.chrome;

if (!rawBrowserApi) {
  throw new Error(
    "Browser extension APIs are unavailable in this context."
  );
}

export const browserApi = {
  runtime: rawBrowserApi.runtime,
  storage: rawBrowserApi.storage,
  tabs: rawBrowserApi.tabs,
  scripting: rawBrowserApi.scripting,
};

export default browserApi;