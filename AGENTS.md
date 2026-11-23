# Memory

## Project Overview
See @README.md for project overview and @package.json for available npm/pnpm commands for this project.

## Code Style Guidelines
- Use descriptive variable names
- Follow existing patterns in the codebase
- Extract complex conditions into meaningful boolean variables

## Architecture Notes
Add important architectural decisions and patterns here.

## Common Workflows
Document frequently used workflows and commands here.

## References

You have access to two browser-extension documentation indexes, which map every page and section of their respective documentation trees:

- `references/firefox-extension-overview.md` — MDN WebExtensions docs (Firefox; Manifest V2 and V3; cross-browser and Chrome-compatibility notes).
- `references/chrome-extension-overview.md` — Chrome Extensions docs (Manifest V3; extension service workers; Chrome Web Store).

### Choosing the index

Pick the index that matches the browser and platform the work targets — not merely the browser you are testing in:

- **Firefox index** when writing or debugging Firefox add-ons, using `browser.*` APIs, `browser_specific_settings`/`gecko.id`, `web-ext`, temporary add-on loading via `about:debugging`, AMO signing/publishing, Manifest V2 keys, or cross-browser compatibility questions.
- **Chrome index** when writing or debugging Chrome extensions, using `chrome.*` APIs, extension service workers (including their 30-second idle termination), Manifest V3 `host_permissions`, Chrome Web Store publishing, or the MV2→MV3 migration.
- **Both indexes** when the feature must work in both browsers, or when one browser's docs defer to the other (e.g. Firefox vs Chrome API differences, namespace/promise differences, polyfills, packaging differences). Compare the two and call out divergences explicitly.

### How to use the chosen index

For any question I ask:

1. Search the chosen index first to identify the 1–3 most relevant page URLs and specific section headings.
2. Use the web-fetch tool to retrieve the full content of those exact URLs before answering.
3. Base the answer strictly on the fetched pages, and cite the exact page URL and section heading used.

### Index-specific fetch notes

- **Firefox/MDN:** fetch the absolute `https://developer.mozilla.org/...` URL. Headings marked *anchor unverified* (or quoted in the index) have no verified `#fragment` — fetch the page URL and locate the section by its exact heading text.
- **Chrome:** fetch the absolute `https://developer.chrome.com/...` URL. Appending `.md.txt` (before any `#fragment`) returns a clean markdown version, which is cheaper and easier to read.
- Never invent URLs or anchors: use only the absolute URLs in the index, and verify the heading exists on the fetched page before citing it.
- If a fetched page contradicts the index (moved page, renamed section, changed MV3 behaviour), trust the fetched page and state that the index is stale.

## Agent skills

### Issue tracker

Issues and specs live in the repo's GitHub Issues (`k-joel/browser-extension-bisect`) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles with their default label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.
