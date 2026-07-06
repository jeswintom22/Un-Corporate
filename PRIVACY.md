# Privacy Model (V1)

Un-Corporate V1 has no project backend. The extension runs locally in your browser.

## What happens locally

- DOM traversal and visibility filtering
- Readable text extraction
- Text normalization
- Block ID generation and DOM mapping
- Chunk construction
- Highlight rendering on the page
- Sidebar rendering and finding state management

## What can be sent to your AI provider

When you click SCAN THIS PAGE and confirm warning prompts, Un-Corporate may send:

- Extracted readable page text
- Page title and URL context
- Block IDs and chunk context
- Analysis instructions for detection/explanation

## What is not intentionally sent

- Cookies
- Browser history
- Password field values
- Form field values
- Contenteditable draft text
- localStorage/sessionStorage page data
- Extension API keys in prompts

## API key storage

- Local mode: key stored in extension local storage until you delete it.
- Session mode: key stored in extension session storage when supported.
- Keys are not stored in sync storage.

## Important limits

- Provider-side handling is controlled by your configured AI provider's policies.
- Do not scan confidential documents unless you are allowed to send that text to the provider.
- V1 keeps no cloud scan history.
