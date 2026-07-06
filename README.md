# Un-Corporate

Un-Corporate is a Chrome/Firefox browser extension that scans readable policy text on the current page, highlights potentially user-impacting clauses, and explains each finding in direct language.

## Core workflow

1. Open a policy page (Terms, Privacy Policy, subscription terms, etc.).
2. Open the extension popup.
3. Click SCAN THIS PAGE.
4. Confirm the first-scan provider warning.
5. Review highlighted clauses and explanations in the sidebar.
6. Click cards to jump to highlights, or click highlights to select cards.

## Features implemented

- Manifest V3 extension architecture.
- Chrome and Firefox build outputs.
- BYOK settings page for OpenAI.
- Local/session key storage modes.
- Connection test for provider settings.
- Full-page text extraction with form/editable exclusions.
- Block IDs and chunking.
- Two-stage AI analysis: detection then explanation.
- Finding validation and deduplication.
- In-page highlighting with risk styling.
- Right-side findings sidebar.
- Popup controls for start/cancel/open/rescan/clear.
- First-scan warning modal in popup flow.

## Repository structure

- extension/manifests: browser-specific manifests
- extension/src/background: scan coordination and message routing
- extension/src/content: extraction, highlights, sidebar
- extension/src/options: BYOK setup UI
- extension/src/popup: scan control UI
- extension/src/providers: provider interface + OpenAI adapter
- extension/src/analysis: chunking, validation, normalization
- extension/src/prompts: AI prompt builders
- extension/src/shared: constants, storage, messages, errors, browser layer
- extension/src/ui: pixel tokens and reusable component styles
- scripts: build scripts for Chrome and Firefox

## Local setup

1. Install Node.js 20+.
2. Install dependencies:

```bash
npm install
```

3. Build both extension targets:

```bash
npm run build
```

Or build one target at a time:

```bash
npm run build:chrome
npm run build:firefox
```

## Load in Chrome

1. Open chrome://extensions.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select dist/chrome.

## Load in Firefox

1. Open about:debugging.
2. Click This Firefox.
3. Click Load Temporary Add-on.
4. Select dist/firefox/manifest.json.

## BYOK and privacy

- Un-Corporate does not use a project backend in V1.
- Extracted page text is sent directly to your configured AI provider only when you click scan.
- API key storage supports local or session mode.
- Keys are never stored in sync storage.

See PRIVACY.md for full details.

## Known limitations (V1)

- Native browser PDF pages are not supported.
- Iframes are not scanned.
- Highly dynamic pages may require rescan after rerender.
- AI findings can be incomplete or incorrect.
- Impact levels are not legal judgments.
- OpenAI is the only provider implemented in V1.

## Disclaimer

AI explanation, not legal advice.