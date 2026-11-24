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

**Extension**:
The canonical unit of the product: an installed WebExtension that can be enabled or disabled as a whole; themes and apps are not extensions in this sense.
_Avoid_: plugin, addon (in prose), add-on (except Firefox UI)

**ExtensionState**:
The aggregate value object returned by every state message — `enabled`, `interactionCount`, and `settings` — assembled on demand by `readState()` in `utils/state.ts` and never persisted as one blob.
_Avoid_: app state, global state

**BisectSettings**:
The persisted settings object (`batchSize`, `enabledExtensions`) stored under `local:settings` with defaults from `BISECT_SETTINGS_DEFAULTS`.
_Avoid_: settings blob, preferences object

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

## Bisect

**Bisect session**:
A single tracked search over a snapshot of enabled extensions, from the baseline decision to a culprit, an inconclusive result, or an abort, persisted as a bisect log.
_Avoid_: bisect run, search, job

**Candidate extension**:
An installed, enabled WebExtension eligible to enter a bisect session; excludes this add-on, themes, apps, policy-locked add-ons, and user-excluded items.
_Avoid_: suspect (before the session starts), plugin

**Suspect pool**:
The current subset of candidate extensions that could still contain the culprit; it shrinks by roughly half each trial.
_Avoid_: remaining list, search space

**Trial**:
One materialized partition of the suspect pool plus one verdict; displayed as "Trial N of ~M".
_Avoid_: round, step, iteration

**Verdict**:
The user's binary report on a trial, either `Problem persists` or `Problem is gone`.
_Avoid_: result, answer, good/bad, pass/fail

**Baseline check**:
The all-off trial that decides whether the symptom is attributable to an extension at all; a persisting symptom aborts the session as a host issue.
_Avoid_: null test, control run

**Cleared extension**:
A candidate ruled out by a verdict and kept enabled during later trials.
_Avoid_: good extension, safe extension

**Culprit**:
The single extension isolated by the final confirmation and left disabled for the user to act on.
_Avoid_: bad extension, offender, faulty plugin

**Inconclusive**:
The terminal outcome when the evidence contradicts the single-culprit assumption or the log cannot be replayed; it reports an ambiguity set instead of naming a culprit.
_Avoid_: failed, unknown, no result

**Bisect log**:
The append-only sequence of typed events that records a session and is the input to replay.
_Avoid_: history, audit trail (as the canonical noun)

**Replay**:
Recomputing a session's trials and outcome from a copy of the log with corrected verdicts, without changing installed extension states.
_Avoid_: rerun, redo

**Restore**:
Returning every candidate the session touched to its pre-session enabled state; distinct from replay, which never changes browser state.
_Avoid_: rollback, undo, reset (for the browser-state action)

**Drift**:
A mismatch between the session's expected candidate states and the browser's actual management state.
_Avoid_: desync, inconsistency

**Oracle**:
The source of a verdict; v1 uses a human oracle, and a future automated oracle may evaluate a DOM condition.
_Avoid_: tester, checker

**Bisect config**:
The versioned non-session preferences under `local:bisectConfig` — excluded candidate ids, the bound test tab, and UI preferences; the scaffold `BisectSettings` is retired on implementation.
_Avoid_: settings (in prose), preferences

## Platform

**Automated mode**:
The Chrome capability to apply a trial's target state through `management.setEnabled` without manual toggling; also available on Firefox only when the add-on itself is enterprise-policy-installed.
_Avoid_: auto mode, chrome mode

**Assisted mode**:
The Firefox flow in which the add-on computes the batch, the user toggles it in `about:addons`, and the add-on verifies the state through `management` events.
_Avoid_: manual mode, guided mode

**Capability report**:
The runtime report of browser name, `canAutoToggle`, self install type, and side-surface kind that the UI uses to choose the automated or assisted flow.
_Avoid_: feature flags, platform info

**Enterprise-policy exception**:
The Firefox case where the calling add-on is installed by enterprise policy (`installType === "admin"`), which permits `management.setEnabled` for regular add-ons.
_Avoid_: admin mode, special case

## UI

**Side panel**:
The WXT `entrypoints/sidepanel/` Vue app rendered as Chrome's side panel and Firefox's sidebar; the only product UI.
_Avoid_: popup, sidebar (in prose)

**Candidate picker**:
The pre-flight screen where the user unchecks known-good extensions and reviews ineligible ones.
_Avoid_: extension list, selection screen

**Test tab**:
The user-bound tab that the side panel reloads after each trial and that reproduces the symptom.
_Avoid_: target tab, test page

**Session view**:
The derived, read-only projection of the bisect log that the side panel renders.
_Avoid_: state, snapshot

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

**Management port**:
The injectable adapter interface that wraps `browser.management` and supplies candidates, target-state application, verification, restore, and events to the engine.
_Avoid_: management wrapper, browser port

**Fixture extension**:
A minimal unpacked extension installed by E2E to act as a candidate or culprit; it injects a unique marker on the fixture page.
_Avoid_: mock extension, test plugin

**Replay test**:
A deterministic unit test that feeds a valid, corrected, or invalid log copy to the replay function and asserts the recomputed culprit or validation error.
_Avoid_: log test, history test
