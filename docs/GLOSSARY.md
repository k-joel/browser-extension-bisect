# Browser Extension Bisect

A WXT browser extension that binary-searches faulty installed extensions across Chrome and Firefox, built on a popup-driven state model, a per-page DOM marker, and a local automated verification harness.

<!--
GLOSSARY.md MAINTENANCE GUIDE (FOR AGENTS & CONTRIBUTORS)

PURPOSE & SCOPE
- Canonical ubiquitous-language reference for this repository/context, written for developers and AI agents.
- Not a user guide, API reference, changelog, or general software engineering dictionary.
- If GLOSSARY-MAP.md exists at the repo root, keep this file strictly scoped to this context; otherwise, this is the single repo glossary.

UPDATE TRIGGERS
Update this file in the same task/PR before concluding whenever you:
- Introduce a new project-specific concept, architecture role, tool, or config artifact.
- Rename, split, merge, or redefine an existing canonical term.
- Retire a component or alias that could still cause naming confusion.
- Resolve terminology ambiguity across code, tests, or docs.

INCLUSION / EXCLUSION CRITERIA
- Include: Project-specific domain/system concepts, canonical names chosen over competing synonyms, and named tools/components with distinct conceptual roles.
- Exclude: General programming concepts (timeouts, error types, utility patterns, standard protocols), transient local variables, and step-by-step implementation details.
- Litmus test: "Is this unique to this project's context, or general programming vocabulary?" Only the former belongs.

STRUCTURE & FORMATTING
- Top of file: H1 context title followed by a 1–2 sentence overview paragraph.
- Sections: Start with `## Language`. Add `## <Cluster>` H2 sections only when 3+ related terms form a natural group. Omit empty sections; do not use H3+ headings.
- Ordering & IDs: Group logically within sections; do not add numbering, dates, status tags, or custom IDs.
- Entry syntax (separate entries with one blank line; no bullets or nested lists):
  - Line 1: `**Canonical Term**:` (optional plain `(qualifier)` before `:`). Use sentence-style casing for prose concepts; preserve exact casing for literal tool/command names (e.g., `**tool_name**:`).
  - Line 2+: 1–2 sentence definition.
  - Final line: `_Avoid_: synonym1, synonym2` (append `(in prose)` or `(retired)` in parentheses when disambiguating).

QUALITY & STYLE RULES
- Be opinionated: pick one canonical term per concept and list all rejected aliases under `_Avoid_`.
- Keep definitions tight: 1–2 sentences max, present tense, declarative. Define what the concept IS, not how it works step-by-step or why it exists.
- Verify against the codebase: confirm file paths, config keys, defaults, and exact tool/symbol names in code before adding or editing an entry.
- Cross-references: refer to other glossary entries inline using their canonical spelling (italicized if helpful); avoid external URLs or line-number links.

LIFECYCLE & WORKFLOW
- Add: Place under the fitting `## <Cluster>` or `## Language`; create a new `##` section only when a cohesive cluster emerges.
- Revise: Edit definitions in place when boundaries, paths, or defaults change while keeping the 1–2 sentence cap.
- Rename / Consolidate: Replace the bold term with the new canonical name and move the old name into `_Avoid_` (optionally tagged `(retired)`).
- Retire: Remove entries for deleted concepts. If the old term still appears in legacy files or prompts, keep it in the replacement entry's `_Avoid_` list rather than keeping a dead entry.

ANTI-PATTERNS
- Adding general programming terms or standard library/protocol concepts.
- Defining two synonyms as separate entries instead of choosing one and putting the other in `_Avoid_`.
- Writing multi-paragraph explanations, tutorials, or historical rationale inside definitions.
- Leaving empty `##` sections, using bullet points inside entries, or omitting `_Avoid_` when known aliases exist.

EXAMPLE LAYOUT (4-SPACE INDENTED)
    # Billing

    Processes customer invoices and tracks payment settlement for fulfilled orders.

    ## Language

    **Invoice**:
    A request for payment issued to a customer after order fulfillment.
    _Avoid_: bill, statement, payment request

    **Ledger entry** (settled):
    An immutable accounting record created once an invoice payment clears.
    _Avoid_: transaction, receipt (in prose)

    ## Operations

    **reconcile_invoices**:
    Scheduled job that matches bank settlement records against open invoices.
    _Avoid_: sync_bills, payment_sweep
-->

---

## Language

**ExtensionState**:
The aggregate value object returned by every state message — `enabled`, `interactionCount`, and `settings` — assembled on demand by `readState()` in `utils/state.ts` and never persisted as one blob.
_Avoid_: app state, global state

**BisectSettings**:
The persisted settings object (`batchSize`, `enabledExtensions`) stored under `local:settings` with defaults from `BISECT_SETTINGS_DEFAULTS`.
_Avoid_: config, preferences

**Content marker**:
The `data-ext-bisect-state` attribute the content script writes on `document.documentElement`, holding `enabled` or `disabled` and kept in sync via a storage watch.
_Avoid_: DOM flag, badge

**Tab-id marker**:
The `data-ext-bisect-tab-id` attribute written in test builds only, letting the Firefox E2E path target a specific tab's popup via `?tabId=`.
_Avoid_: tab marker

**Test mode**:
The compiled-in build flavor gated by the `__EXT_TEST_MODE__` define (`EXT_TEST_MODE=1`); adds `?tabId=` handling, the tab-id marker, and `[EXT_BG_ERR]` logging that production builds strip.
_Avoid_: debug mode, dev mode

**Interaction count**:
The `local:interactionCount` counter incremented by the `recordInteraction` message and shown in the popup status line.
_Avoid_: click counter

**Batch size**:
The `batchSize` setting (1 by default, 1–100 in the popup input) naming how many extensions a bisect round toggles; not yet consumed by runtime logic.
_Avoid_: chunk size

**Gecko id**:
The `browser_specific_settings.gecko.id` value (`dev-test@my-browser-extension.local`) declared for Firefox builds in `wxt.config.ts` and asserted by `installExtension()` in the E2E harness.
_Avoid_: addon id

**Background ready log**:
The `[EXT_BG_READY]` console line the background prints at startup; the Chrome E2E gate waits for it before running steps.
_Avoid_: ready signal

**Background error prefix**:
The `[EXT_BG_ERR]` prefix the background uses for uncaught errors in test builds; any occurrence in a run fails the E2E gate.
_Avoid_: bg error tag

## Testing

**E2E harness**:
The cross-browser launcher in `tests/e2e/harness.mjs` — Chrome over CDP with `enableExtensions`, Firefox over WebDriver BiDi with `installExtension` — plus the shared navigation wrappers and error recorder.
_Avoid_: test harness (in prose), driver

**Fixture server**:
The local HTTP server (`tests/e2e/fixture-server.mjs`) bound to `127.0.0.1:0` serving the `/`, `/form`, and `/dynamic` pages plus `/health`; the only page source allowed in E2E.
_Avoid_: mock server

**Verify gate**:
The `tests/e2e/verify.mjs` scenario suite (via `npm run test:e2e` or `npm run agent:verify`) that asserts popup and content behavior on both browsers and exits non-zero with failure screenshots on any failed step.
_Avoid_: CI gate, e2e suite

**Messaging bridge**:
The `installMessagingBridge()` helper in `tests/unit/helpers/messaging-bridge.ts` adapting `fakeBrowser`'s `sendMessage` to the protocol `@webext-core/messaging` expects.
_Avoid_: mock messenger

**Fixed Firefox UUID**:
The `FIXED_FIREFOX_UUID` constant in `tests/e2e/harness.mjs` pinned via the `extensions.webextensions.uuids` pref so the `moz-extension://` origin is deterministic across runs.
_Avoid_: extension uuid (in prose)
