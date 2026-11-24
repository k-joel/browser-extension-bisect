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
| [008](#adr-008-split-extension-management-behind-a-capability-adapter) | Split extension management behind a capability adapter |
| [009](#adr-009-make-the-wxt-side-panel-the-primary-ui) | Make the WXT side panel the primary UI |
| [010](#adr-010-use-set-bisection-with-a-mandatory-baseline) | Use set bisection with a mandatory baseline |
| [011](#adr-011-persist-an-event-sourced-bisect-log-in-local-storage) | Persist an event-sourced bisect log in local storage |
| [012](#adr-012-replace-the-scaffold-and-minimize-permissions) | Replace the scaffold and minimize permissions |
| [013](#adr-013-keep-the-culprit-disabled-and-require-explicit-restore) | Keep the culprit disabled and require explicit restore |
| [014](#adr-014-ship-human-verdicts-only-in-v1) | Ship human verdicts only in v1 |
| [015](#adr-015-report-non-single-culprit-outcomes-as-inconclusive) | Report non-single-culprit outcomes as inconclusive |

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

---

## ADR-008: Split extension management behind a capability adapter

**Status**: Accepted
**Date**: 2026-11-24
**Deciders**: Technical design session (LLM-driven, user-approved)

### Context

Chrome allows an extension with the `management` permission to enable and disable other regular extensions. Firefox does not: `management.setEnabled()` rejects every target that is not a theme unless the calling add-on itself was installed by enterprise policy (`toolkit/components/extensions/parent/ext-management.js`, `setEnabled`). A single engine and UI must still serve both browsers without pretending the Firefox flow is automated.

### Decision

Define a `ManagementPort` interface with `getCapabilities`, `listCandidates`, `applyTargetState`, `verifyState`, `restore`, and `watchEvents`. Implement a Chrome automated adapter and a Firefox assisted adapter, and expose a `CapabilityReport` with `browserName` and `canAutoToggle`. The Firefox adapter switches to the automated path only when `management.getSelf().installType === "admin"`; normal installs receive manual batches and event-driven state verification.

### Consequences

**Good**: The bisect engine, log, and UI stay platform-agnostic; the Firefox restriction is represented honestly; each adapter is independently testable behind the same contract.

**Bad**: Two adapters and two E2E paths to maintain; the Firefox assisted flow is slower and more manual; capability detection adds branching to the UI.

**Mitigations**: Share one eligibility filter and contract test suite; inject a fake `ManagementPort` in unit tests; keep the capability matrix in `TECH_DESIGN.md` and test the assisted state machine without browser APIs.

---

## ADR-009: Make the WXT side panel the primary UI

**Status**: Accepted
**Date**: 2026-11-24
**Deciders**: Technical design session (LLM-driven, user-approved)

### Context

The current popup is a small, transient surface that closes when focus moves. The bisect flow needs a candidate list that can exceed 50 rows, persistent instructions while the user visits `about:addons` or the test page, and a visible Restore action. WXT maps one `entrypoints/sidepanel/` entrypoint to Chrome's `side_panel` API and Firefox's `sidebar_action`, so both browsers can share one Vue app.

### Decision

Use a WXT `entrypoints/sidepanel/` Vue app as the only product UI; retire the popup. On Chrome, declare the `sidePanel` permission and call `sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` so the toolbar action opens the panel. On Firefox, rely on the generated `sidebar_action` with `default_panel`. Reuse the existing plain-CSS token layer and `data-testid` convention (ADR-005).

### Consequences

**Good**: Guidance stays visible while the user navigates; long candidate lists fit; one UI codebase for both browsers; the test tab and side panel can be used side by side.

**Bad**: Chrome requires 114+ for the side panel API; Firefox's sidebar has different chrome and sizing behavior; the popup tests and popup-specific test-mode hooks are retired; narrow panels require a compact layout.

**Mitigations**: Design a narrow single-column layout; navigate directly to `sidepanel.html` in E2E rather than automating the browser's side-panel chrome; record the Chrome minimum version in the manifest and docs.

---

## ADR-010: Use set bisection with a mandatory baseline

**Status**: Accepted
**Date**: 2026-11-24
**Deciders**: Technical design session (LLM-driven, user-approved)

### Context

The reference behavior (VS Code extension bisect) is an all-off baseline followed by repeated half-splits: disable half the suspects, keep cleared items enabled, and use the binary verdict to choose the half that still contains the culprit. The baseline prevents blaming an extension when the browser itself is broken. The current `batchSize` setting is a scaffold placeholder with no algorithmic meaning.

### Decision

Use set bisection over a deterministic candidate snapshot. Run an all-off baseline (automatic on Chrome, manual or externally attested on Firefox), then partition the suspect set with `mid = floor(n / 2)`, keep every non-suspect enabled, and shrink to the half indicated by the verdict. Run a final confirmation when the last partition left the lone suspect enabled. Report `inconclusive` on a contradiction. Remove `batchSize` and do not support delta debugging in v1.

### Consequences

**Good**: About `ceil(log2 N)` partition trials plus the baseline; re-enabling cleared items preserves the user's environment and surfaces interactions early; the algorithm is pure and easy to test; no arbitrary batch-size tuning.

**Bad**: The baseline is one extra trial; a final confirmation can add another; the single-culprit assumption fails for interaction bugs; the user must understand the two verdicts.

**Mitigations**: Show progress and the current partition; include a worked example in `TECH_DESIGN.md`; support retry and live undo; report ambiguity explicitly instead of guessing.

---

## ADR-011: Persist an event-sourced bisect log in local storage

**Status**: Accepted
**Date**: 2026-11-24
**Deciders**: Technical design session (LLM-driven, user-approved)

### Context

Chrome terminates the MV3 service worker after roughly 30 seconds of inactivity, and the side panel can close at any time. The v1 scope includes an editable log and deterministic replay after a corrected verdict. A single mutable session blob would be harder to audit and replay, and in-memory state would be lost on worker termination.

### Decision

Persist an append-only `BisectLog` of typed events in `local:bisectLog` and the versioned `BisectConfig` in `local:bisectConfig`. Derive the session view with a pure reducer. The background is the sole writer, and every mutation enters a serialized promise queue that rehydrates, applies, and persists. Replay operates on a **copy** of the log with corrected verdicts; the live log stays immutable. No module-level session object is authoritative.

### Consequences

**Good**: Survives worker termination, panel close, and browser restart; deterministic replay; a human-readable audit trail; the reducer and replay are pure and unit-testable.

**Bad**: More storage writes than one snapshot; the event schema needs versioning; replay must validate malformed or edited logs; the editing UI adds surface area.

**Mitigations**: Keep the event set small; cap the log at 500 events; include `schemaVersion` and a documented migrator; test replay with valid, corrected, and invalid logs.

---

## ADR-012: Replace the scaffold and minimize permissions

**Status**: Accepted
**Date**: 2026-11-24
**Deciders**: Technical design session (LLM-driven, user-approved)

### Context

The scaffold's `enabled` toggle, interaction counter, `batchSize`, `enabledExtensions`, `<all_urls>` content script, and DOM marker exist to prove the plumbing, not to support bisection. The content script adds a broad host-access warning, and the `tabs` permission is unnecessary because `tabs.reload()` needs no permission. Chrome Web Store and Mozilla policies both require the narrowest permissions necessary.

### Decision

Retire the popup, content script, marker, `enabled`, `interactionCount`, `batchSize`, `enabledExtensions`, and the marker messages. Ship with `storage`, `management`, and Chrome's `sidePanel` permissions only; drop `<all_urls>`, `tabs`, and host permissions. Delete the legacy storage keys on first start because this is a pre-release project with no data to migrate. Rework the unit and E2E suites around the side panel and management state.

### Consequences

**Good**: Only the `management` warning remains; no host access or page-content access; a single-purpose product; less code and fewer stale concepts; test-tab reload still works.

**Bad**: The E2E harness loses the content marker and must install fixture extensions and drive the side panel; the `management` warning may deter some users; a future automated oracle would need a separate permission decision.

**Mitigations**: Use minimal fixture extensions for E2E; explain the management permission in the listing and onboarding; keep the permission set recorded in `TECH_DESIGN.md` and `wxt.config.ts`.

---

## ADR-013: Keep the culprit disabled and require explicit restore

**Status**: Accepted
**Date**: 2026-11-24
**Deciders**: Technical design session (LLM-driven, user-approved)

### Context

A bisect result is only useful if the user can act on it: the culprit should stay disabled so the user can confirm the fix and continue working. Silently re-enabling everything on completion would erase the result. At the same time, the tool temporarily changes browser state and must be able to put it back, including after an abort or a restart.

### Decision

On success, leave the culprit disabled and show a prominent **Restore** action that re-enables every candidate the session touched. On abort, prompt "Restore all extensions?" with restore as the default. On startup with an unfinished session, reconcile the actual states and offer Resume or Restore. Restore only touches candidates whose state the session changed, reports partial failures, and never claims success when a greylisted or policy-locked extension could not be re-enabled.

### Consequences

**Good**: The result is immediately actionable; the user can verify the fix without another trip to the extensions page; restore is explicit and auditable; untouched extensions are never modified.

**Bad**: The user may forget to restore; uninstalling the add-on mid-session leaves the disabled states behind; greylist or policy failures require manual recovery.

**Mitigations**: Keep Restore visible on every screen; warn during onboarding and in the store listing; record `session-reset` events and show manual-recovery instructions when a restore fails.

---

## ADR-014: Ship human verdicts only in v1

**Status**: Accepted
**Date**: 2026-11-24
**Deciders**: Technical design session (LLM-driven, user-approved)

### Context

The reference methodology supports an automated oracle (`git bisect run`) and a human oracle. A browser equivalent would need a test URL plus a CSS selector or text condition, host or `activeTab` access, and careful handling of async, flaky, and authenticated pages. A wrong selector would silently corrupt the search. The v1 scope is already substantial with the assisted Firefox flow and log/replay.

### Decision

Use human verdicts only in v1: **"Problem persists"** and **"Problem is gone"**. Do not ship a test-URL/selector oracle, and do not add host or scripting permissions for it. Keep the `Verdict` boundary in the engine so a future oracle can implement the same interface.

### Consequences

**Good**: Works for any symptom, including visual and interaction bugs; no extra permissions; no silent selector failures; simpler and faster to ship.

**Bad**: The user must test each batch manually; the flow is slower than an automated oracle; human misreporting remains the main source of error.

**Mitigations**: Provide the log/replay correction path, retry and live undo, clear verdict labels, and a future `Verdict` adapter seam.

---

## ADR-015: Report non-single-culprit outcomes as inconclusive

**Status**: Accepted
**Date**: 2026-11-24
**Deciders**: Technical design session (LLM-driven, user-approved)

### Context

Set bisection assumes a single culprit (or an OR-combination that behaves like one). Pairwise interactions, multiple culprits, and contradictory final verdicts can produce a state where the lone suspect is disabled but the symptom persists, or where both halves look clean in isolation. Delta debugging (`ddmin`) can handle some of these cases but is a larger algorithm and a different UX.

### Decision

When the final confirmation contradicts the single-culprit assumption, stop and report **inconclusive** with the remaining ambiguity set and the evidence (the last trial and verdict). Do not blame the last suspect, do not loop, and do not run `ddmin` in v1. Offer Restore and Start over. Keep the result in the log/replay report.

### Consequences

**Good**: Honest outcomes; no false attribution; the user learns that the problem is likely an interaction or multi-culprit case; the ambiguity set is actionable for manual follow-up.

**Bad**: Some sessions end without a culprit; the user may be disappointed; `ddmin` remains future work.

**Mitigations**: Explain the possible causes in the UI; offer restore and a fresh session; keep the report copyable; leave the engine's partition boundary ready for a ddmin fallback.

