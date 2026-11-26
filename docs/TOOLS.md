# Tools

Development helper scripts live in [`tools/`](../tools/) (top level). This file is the
inventory and the reference for agents deciding whether a new script is needed.

**Before writing any new tool, check this inventory.** If an existing tool can do the job,
use it instead of adding another script. Existing tools may be extended with more features
as long as the additions fit the purpose the tool was designed for. **Whenever a tool is
created or modified, this document must be updated in the same session** so the inventory
stays current.

<!--
TOOLS.md MAINTENANCE GUIDE (FOR AGENTS & CONTRIBUTORS)

PURPOSE & SCOPE
- Is: The canonical inventory of standalone developer/agent helper scripts in `tools/`
  and the mandatory pre-creation check before adding any new script.
- Is Not: A CLI flag manual, usage tutorial, changelog, or registry for application
  source code, build artifacts, or third-party binaries.
- Audience: LLM agents and developers maintaining this repository.

UPDATE TRIGGERS
- Check this file BEFORE writing any new helper script.
- Update this file IN THE SAME SESSION whenever a script in `tools/` is added,
  renamed, deleted, or modified in purpose, inputs/outputs, paths, or dependencies.

INCLUSION / EXCLUSION CRITERIA
- Include: Top-level standalone scripts/executables in `tools/` meant to be invoked
  directly.
- Exclude: Internal shared modules imported only by other scripts, uncommitted one-off
  scripts, generated artifacts, and exhaustive CLI flag lists (keep those in script
  help output or source docstrings).

STRUCTURE & FORMATTING
- Top-level structure: `# Tools`, short preamble linking [`tools/`](../tools/), this
  comment block, and `## Inventory`. Always keep `## Inventory` (if empty, put
  `_No tools registered._`); omit any extra sections.
- Ordering: Strictly alphabetical (case-insensitive) by exact filename.
- Entry format: Single-line bullet using ``- **`<Filename.ext>`** — <Summary>``
  (bold inline code filename, single space, em-dash `—`, single space).
- Metadata policy: No ID numbers, dates, versions, or inline status tags. Reference
  affected repo paths in inline code.

QUALITY & STYLE RULES
- Voice & Tense: Concise, third-person present tense starting with an action verb
  (e.g., "Validates...", "Exports...", "Cleans...").
- Brevity: 1 to 2 sentences on a single bullet line; no sub-bullets or code blocks.
- Verification: Read the actual script before writing or editing an entry. State what
  it does, key inputs/outputs or repo paths, and non-stdlib packages or external
  SDKs/tools required (note `Standard library only.` if none).

LIFECYCLE & WORKFLOW
- Add: Confirm no existing tool fits or can be extended; add script to `tools/`;
  insert entry in alphabetical order under `## Inventory`.
- Modify: Update the existing bullet in place if behavior, paths, or dependencies
  change.
- Rename: Update the backticked filename and re-sort alphabetically.
- Retire: Delete the bullet in the same session the script is removed from `tools/`
  (rely on git history; do not retain deprecated or struck-through entries).

ANTI-PATTERNS
- Adding a new script without first checking or extending existing tools.
- Documenting CLI flags, usage examples, or implementation internals here.
- Leaving stale/deleted entries, unsorted entries, or unverified claims.
- Using hyphens (`-`) instead of an em-dash (`—`), omitting bold/backticks on
  filenames, or adding sub-bullets.

EXAMPLE LAYOUT (4-SPACE INDENTED)

    ## Inventory

    - **`CheckAssets.py`** — Validates asset sizes under `assets/` against thresholds and exits non-zero on failure. Standard library only.
    - **`SyncSchemas.py`** — Regenerates bindings from `schemas/` into `include/generated/` via `codegen-cli` (Node.js).
-->

---

## Inventory

- **`bad-extension-probe.mjs`** — Loads a page in a headless browser with the single-purpose fault extension installed and reports whether its symptom marker is present, exiting non-zero when the result disagrees with `--expect=<active|inactive>`. Reuses `tests/e2e/harness.mjs`; requires `puppeteer` and a prior `npm run bad-extension:build`.
- **`download_good_extensions.py`** — Downloads the curated marketplace extensions listed in `tests/e2e/curated-extensions.json`, keeps the original `.crx`/`.xpi` archives under `good_extensions/_archives/`, unpacks each into a directory Puppeteer can load, and writes `good_extensions/catalog.json` for the test runners. Python 3 standard library only (AMO API for Firefox, the Web Store update endpoint for Chrome).
- **`manual-browser.mjs`** — Launches a visible Puppeteer browser with the built extension installed, pre-binds a fixture page as the test tab, and holds the window open for hands-on use; `--extensions=<fixtures|real|none>` selects the fixture set, the 20 curated extensions plus the fault extension, or nothing, and `--start` begins the bisect at the baseline question; `--smoke` runs the same path headless as a self-check. Reuses `tests/e2e/harness.mjs`; requires `puppeteer`, a prior `npm run build:<browser>`, and for `real` also the downloader, `npm run bad-extension:build`, and (on Firefox) `npm run firefox:install`. On Firefox `real` it runs from the project-local portable Nightly under `.cache/puppeteer/`, into which `tests/e2e/firefox-policy.mjs` writes an update-disabled policy (ADR-026).

