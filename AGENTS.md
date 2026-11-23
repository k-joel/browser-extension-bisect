# Memory

## Project Overview
See @README.md for project overview and @package.json for available npm/pnpm commands for this project.

## Project Docs

Read the relevant doc before planning or reporting work:
- [docs/ARCH.md](docs/ARCH.md) — the live architecture overview (topology, data flow, domain/data model, component design, testing). **Important:** update it whenever the project's structure, runtime topology, interfaces, schema, or behaviour changes; when the document and the code disagree, the code wins.
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — the user-facing, curated history of notable changes. **It must be updated after every agent session**.
- [docs/DECISIONS.md](docs/DECISIONS.md) — architecture decision records (ADRs) in compressed form: the "why" behind structural, architectural, and dependency choices. **Read the relevant entry before changing behaviour that looks unusual, and add an entry for every new architectural decision.**
- [docs/GLOSSARY.md](docs/GLOSSARY.md) — canonical domain terms; use its vocabulary in code, docs, and summaries.
- [docs/ISSUES.md](docs/ISSUES.md) — the ongoing issue tracker. **Add every issue, bug or defect flagged during an LLM session here — even if it is only mentioned in passing in the summary — and delete the entry once it is fixed.**
- [docs/NOTES.md](docs/NOTES.md) — gotchas, watch-outs and oddities. **Add anything a future session needs to know that is not an open issue here.**
- [docs/RUNBOOK.md](docs/RUNBOOK.md) — numbered operator procedures. **Review it each session and update any procedures affected by the work.**
- [docs/TECH_DEBT.md](docs/TECH_DEBT.md) — architectural debt and code smells. **Add every structural anti-pattern, code duplication, or AI-induced code smell spotted during a session here, and delete the entry once refactored.**
- [docs/TOOLS.md](docs/TOOLS.md) — the inventory of development scripts in [tools/](tools/). **Check it before writing any new tool, and update it whenever a tool is created or modified.**

## Code Style Guidelines
- Use descriptive variable names
- Follow existing patterns in the codebase
- Extract complex conditions into meaningful boolean variables
- No comments unless the logic is non-obvious.
- Styling lives in plain CSS files; prefer the existing custom-property tokens over new hard-coded colors or spacing values.

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
