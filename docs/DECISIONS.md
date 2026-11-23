# Architecture Decision Records

Concise record of architecturally significant choices made in this project—capturing the context, decision, and trade-offs behind non-obvious structure and dependencies. Read the relevant entry before modifying or reverting established behavior.

<!--
DECISIONS.md MAINTENANCE GUIDE (FOR AGENTS & CONTRIBUTORS)

PURPOSE & SCOPE
- Canonical, single-file log of architecturally significant decisions for future
  engineers and autonomous agents.
- Explains *why* structural, dependency, and cross-cutting design choices exist.
- NOT a changelog, task/issue tracker, release note, API doc, or how-to guide.

UPDATE TRIGGERS
Update `docs/DECISIONS.md` before ending a session or finalizing a change whenever you:
- Introduce, swap, or retire a technology, framework, protocol, or design pattern.
- Make a structural choice that constrains multiple modules or is costly to reverse.
- Accept or reject a `Proposed` ADR.
- Supersede or deprecate an existing ADR (update BOTH the new and old entries,
  plus the summary index table).
Draft entries before or alongside implementation—never leave decisions undocumented.

INCLUSION / EXCLUSION CRITERIA
INCLUDE:
- Framework, library, or runtime adoption/removal.
- Data storage, schema paradigm, caching, or state-management architecture.
- Public API, IPC, or integration contracts and concurrency/deployment models.
- Security, authentication, or boundary rules and non-obvious constraints.

EXCLUDE:
- Routine bug fixes, patch/minor version bumps, or dependency hygiene.
- Local implementation details, variable naming, or behavior-preserving refactors.
- Trivial config/lint tweaks, temporary workarounds, or unmade hypotheticals.

STRUCTURE & FORMATTING
- Single H1: Keep `# Architecture Decision Records` as the only H1 in the file
  (per MADR / markdownlint MD025).
- Summary Index Table: Maintain `| ADR | Decision |` under `## Entries`
  in ascending numeric order. Every row must link to its section anchor
  (`[NNN](#adr-nnn-kebab-case-title)`).
- Numbering: Use 3-digit zero-padded IDs (`ADR-001`, `ADR-002`, ...; expand to
  4 digits only past `999`). IDs are permanent; never reuse or renumber them.
- Entry Heading: `## ADR-NNN: <Short Descriptive Title>` (H2 so file keeps one H1).
- Required Metadata (immediately below the entry heading):
    **Status**: Proposed | Accepted | Rejected | Deprecated | Superseded by ADR-NNN
    **Date**: YYYY-MM-DD  (ISO 8601 date of creation or last status update)
    **Deciders**: <@handles, team/role, or agent/session identifier>
- Required Subsections (exact names and H3 level, in order):
    ### Context
    ### Decision
    ### Consequences
- Required Consequences Fields:
    **Good**: <Positive outcomes.>
    **Bad**: <Real trade-offs, costs, or limitations.>
    **Mitigations**: <Guardrails or follow-up actions; omit ONLY if none apply.>
- Never omit `### Context`, `### Decision`, `### Consequences`, `**Good**:`, or
  `**Bad**:`. Keep entries in ascending numeric order (`ADR-001` .. `ADR-NNN`).

QUALITY & STYLE RULES
- Tense & Tone: Neutral, factual, concise (~15-25 lines per entry). Use past
  tense for `Context` ("Faced..."), present/imperative for `Decision` ("Use...").
- Honesty: Document genuine downsides in `**Bad**:`; no choice is cost-free.
- Verifiability: Ground claims in concrete constraints, observed measurements,
  or repo-relative paths and ADR IDs (`ADR-NNN`). Avoid vague adjectives
  ("faster", "cleaner", "better") without specifics.
- Cross-Links: Reference related decisions inline as `ADR-NNN` (e.g., `see ADR-002`).

LIFECYCLE & WORKFLOW
- Add: Append the new entry at the end of the file with the next `ADR-NNN` and
  add its matching row to the summary index table.
- Promote / Reject: Transition `**Status**` (`Proposed` -> `Accepted` or
  `Rejected`) and update `**Date**`. Keep `Rejected` entries so dead ends are
  not retried.
- Clarify: Only typo or wording fixes that preserve meaning are allowed on an
  `Accepted` entry. Never silently change the substance of an `Accepted` ADR.
- Supersede / Deprecate (Preserve History): Never delete old entries. To replace
  an `Accepted` decision, append a new `ADR-MMM` citing `ADR-NNN`, then update
  the old entry's `**Status**` to `Superseded by ADR-MMM` (or `Deprecated` if
  retired without replacement) and update its `**Date**`.

ANTI-PATTERNS
- Editing an `Accepted` ADR to say the opposite instead of writing a new ADR.
- Deleting `Deprecated`, `Rejected`, or `Superseded` entries, or renumbering IDs.
- Adding extra H1 (`#`) headings, skipping metadata fields, or forgetting to
  update the top summary index table / anchor links.
- Writing `**Bad**: None.` or omitting trade-offs.
- Recording implementation steps, file diffs, or routine bug fixes as ADRs.

EXAMPLE LAYOUT (4-SPACE INDENTED)

    ## Entries

    | ADR | Decision |
    |---|---|
    | [001](#adr-001-short-descriptive-title) | Short descriptive title |

    ---

    ## ADR-001: Short Descriptive Title

    **Status**: Accepted
    **Date**: YYYY-MM-DD
    **Deciders**: @handle, Core Team

    ### Context

    <2-4 sentences describing the problem, technical constraints, and forces
    requiring a decision. Cite affected components or prior ADRs if relevant.>

    ### Decision

    <1-3 sentences stating the exact choice made and any firm boundaries.>

    ### Consequences

    **Good**: <Concrete benefits and enabled capabilities.>

    **Bad**: <Accepted costs, complexity, or limitations.>

    **Mitigations**: <Steps or controls reducing the bad consequences.>

-->

---

## Entries

| ADR | Decision |
|---|---|
| [001](#adr-001-adopt-wxt-as-the-cross-browser-extension-framework) | Adopt WXT as the cross-browser extension framework |
| [002](#adr-002-ship-firefox-as-manifest-v2-with-a-pinned-gecko-id) | Ship Firefox as Manifest V2 with a pinned gecko id |
| [003](#adr-003-use-a-typed-protocolmap-for-all-extension-messaging) | Use a typed ProtocolMap for all extension messaging |
| [004](#adr-004-keep-all-state-in-three-typed-local-storage-items) | Keep all state in three typed local storage items |
| [005](#adr-005-style-the-popup-with-plain-hand-written-css-and-data-testid-hooks) | Style the popup with plain hand-written CSS and data-testid hooks |
| [006](#adr-006-drive-e2e-from-one-puppeteer-harness-over-cdp-and-bidi) | Drive E2E from one Puppeteer harness over CDP and BiDi |
| [007](#adr-007-gate-test-mode-hooks-behind-a-build-time-define) | Gate test-mode hooks behind a build-time define |

---

## ADR-001: Adopt WXT as the cross-browser extension framework

**Status**: Accepted
**Date**: 2026-11-23
**Deciders**: Initial scaffold session (LLM-driven project setup)

### Context

The extension must ship to Chrome (MV3) and Firefox (MV2) from one TypeScript codebase with a Vue 3 popup, browser-divergent manifest keys (Firefox needs `browser_specific_settings.gecko.id`), and typed storage/messaging utilities. Hand-rolling a webpack + manifest pipeline per browser would duplicate build configuration and drift between targets.

### Decision

Build on WXT 0.21 with `@wxt-dev/module-vue`; rely on WXT's entrypoint conventions (`entrypoints/background.ts`, `entrypoints/content.ts`, `entrypoints/popup/`) and its per-browser manifest callback in `wxt.config.ts`. Build outputs are the WXT-native `.output/chrome-mv3` and `.output/firefox-mv2`.

### Consequences

**Good**: One codebase and one build configuration for both targets; manifest divergence is auto-generated with browser-scoped keys; typed entrypoint helpers (`defineBackground`, `defineContentScript`); `wxt/utils/storage` and `wxt/testing` integrations come for free.

**Bad**: Framework lock-in to WXT's conventions and 0.x release cadence (the old `wxt/testing` barrel moved once, breaking imports); Vitest/Vite version coupling.

**Mitigations**: Pin `wxt` at `^0.21.5`; import test helpers only from their subpaths (see NOTES.md); `npm run typecheck` runs `wxt prepare` to catch convention migration drift.

---

## ADR-002: Ship Firefox as Manifest V2 with a pinned gecko id

**Status**: Accepted
**Date**: 2026-11-23
**Deciders**: Initial scaffold session (LLM-driven project setup)

### Context

E2E must address the popup at a stable `moz-extension://` origin. Firefox derives a random extension UUID per install unless `extensions.webextensions.uuids` is pinned, and a stable id requires `browser_specific_settings.gecko.id` in the manifest. Firefox MV3 also changes the background model, which the WebDriver BiDi automation had not been exercised against.

### Decision

Target `.output/firefox-mv2` (no `--mv3`) and declare `browser_specific_settings.gecko.id` (`dev-test@my-browser-extension.local`, see `wxt.config.ts`) only in the Firefox branch of the manifest callback. The harness pins `extensions.webextensions.uuids` to `FIXED_FIREFOX_UUID` and asserts `installExtension()` returns the gecko id.

### Consequences

**Good**: Deterministic extension origin and id on every run; simplest background lifecycle for BiDi automation; the manifest key is regenerated from config, never hand-edited.

**Bad**: MV2 is the legacy target for Firefox; a future MV2-to-MV3 migration changes the background model and requires harness rework.

**Mitigations**: Keep the gecko id scoped to Firefox builds; the MV2 pin is recorded here and in ARCH.md so `--mv3` is not added casually.

---

## ADR-003: Use a typed ProtocolMap for all extension messaging

**Status**: Accepted
**Date**: 2026-11-23
**Deciders**: Initial scaffold session (LLM-driven project setup)

### Context

Popup, background, and content script need RPC across `runtime.sendMessage`, which is stringly-typed and behaves differently across the `chrome` and `browser` namespaces (callback vs promise flavors).

### Decision

Route every message through `defineExtensionMessaging<ProtocolMap>` (`utils/messaging.ts`): six typed messages whose payloads and returns are exported interfaces. No raw `runtime.sendMessage` calls exist in extension code.

### Consequences

**Good**: One compile-time contract shared by all contexts and tests; message drift is a type error, not a runtime failure.

**Bad**: An extra runtime dependency; `fakeBrowser`'s `sendMessage` does not implement the promise-returning listener protocol, so unit tests need an adapter.

**Mitigations**: `tests/unit/helpers/messaging-bridge.ts` (`installMessagingBridge()`) adapts `fakeBrowser`; keep the `ProtocolMap` as the single source of the message surface.

---

## ADR-004: Keep all state in three typed local storage items

**Status**: Accepted
**Date**: 2026-11-23
**Deciders**: Initial scaffold session (LLM-driven project setup)

### Context

State must survive popup close and reload, be readable by the popup, and propagate to content scripts without polling. Candidates were one JSON blob under a single key versus discrete typed keys.

### Decision

Three `storage.defineItem` items — `local:enabled` (boolean, fallback `true`), `local:interactionCount` (number, fallback `0`), `local:settings` (`BisectSettings`, fallback defaults) — with the background as sole writer and `readState()` aggregating them via `Promise.all`.

### Consequences

**Good**: `watch()` pushes changes to the content script without polling; fallbacks make first-run state deterministic; unit tests exercise items in isolation.

**Bad**: Three keys instead of one versioned blob means no schema version field, so future shape changes need migration care; multi-item updates in `applyStateUpdate` are not atomic.

**Mitigations**: Every read/write goes through `utils/state.ts` helpers, so a migration touches one module; fallback defaults keep the current shape stable.

---

## ADR-005: Style the popup with plain hand-written CSS and data-testid hooks

**Status**: Accepted
**Date**: 2026-11-23
**Deciders**: Initial scaffold session (LLM-driven project setup)

### Context

Popup markup is asserted by both `@vue/test-utils` unit tests and cross-browser E2E selectors; styling must stay maintainable for agents without pulling in a framework or build plugin.

### Decision

Hand-written CSS in `entrypoints/popup/style.css` over a custom-property token layer (`--surface`, `--text`, `--accent`, `--space-*`, `--radius`) with `color-scheme: light dark` + `light-dark()` and a `prefers-color-scheme` fallback. Every meaningful node carries a `data-testid`; classes are presentation-only.

### Consequences

**Good**: Zero styling dependencies; one stable selector contract for both test layers; theming via tokens only.

**Bad**: No component library — a larger surface (options page, injected panel) means more hand-written CSS.

**Mitigations**: Revisit only if a substantial new UI surface lands; any host-injected UI must use WXT `createShadowRootUi` with `cssInjectionMode: 'ui'` so host styles and popup tokens cannot leak either way.

---

## ADR-006: Drive E2E from one Puppeteer harness over CDP and BiDi

**Status**: Accepted
**Date**: 2026-11-24
**Deciders**: E2E framework session (commit e3f631d, LLM-driven)

### Context

The verification gate must drive the real popup and content script in real browsers. Chrome offers CDP; Firefox has neither CDP nor a Puppeteer browser-action trigger, and extension installation differs per browser. A second stack (web-ext, Selenium) would double maintenance.

### Decision

One Node harness (`tests/e2e/harness.mjs`) on Puppeteer. Chrome launches with `enableExtensions: true`, `pipe: true`, and `--enable-unsafe-extension-debugging`, then installs via `browser.installExtension()` after launch. Firefox launches with `xpinstall.signatures.required: false` and the pinned-UUID pref, then installs via WebDriver BiDi `installExtension()`. Browser-specific steps (popup opening, background worker access) branch on `browserName`.

### Consequences

**Good**: One dependency and one JSON gate for both browsers; deterministic origins (ADR-002); all protocol quirks isolated in a single module.

**Bad**: Two protocol code paths to maintain; BiDi limitations (navigation `waitUntil`, `page.url()`) require wrappers; CDP-only APIs crash if they reach the Firefox path.

**Mitigations**: `gotoExtensionPage()` / `reloadExtensionPage()` wrappers; `FIXED_FIREFOX_UUID` plus the gecko-id assertion; the divergences are recorded in NOTES.md.

---

## ADR-007: Gate test-mode hooks behind a build-time define

**Status**: Accepted
**Date**: 2026-11-24
**Deciders**: E2E framework session (commit e3f631d, LLM-driven)

### Context

Automation needs hooks that production builds must not have: `?tabId=` popup targeting (Firefox cannot trigger the browser action), the tab-id DOM marker, and `[EXT_BG_ERR]` error logging. A runtime flag would ship dead test surface and a config read to every install.

### Decision

`EXT_TEST_MODE=1` at build time sets the Vite `define __EXT_TEST_MODE__`; `utils/test-mode.ts` gates every hook on `isTestMode()`. Only `build:chrome` / `build:firefox` set the env; `build:prod:*` builds strip the hooks entirely.

### Consequences

**Good**: Zero runtime configuration; hooks vanish from production bundles via dead-code elimination; popup behavior is identical in both flavors apart from the gated hooks.

**Bad**: E2E exercises test-mode builds, not the production bundles, so production-only regressions can slip through; two build flavors must stay in sync.

**Mitigations**: Keep hooks thin and unit-tested (`utils/test-mode.ts`); document the build flavors in RUNBOOK.md and ARCH.md so the right build is used for the right purpose.

