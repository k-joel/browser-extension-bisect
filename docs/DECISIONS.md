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
| [016](#adr-016-keep-user-exclusions-out-of-candidate-eligibility) | Keep user exclusions out of candidate eligibility |
| [017](#adr-017-store-the-test-tab-url-as-nullable) | Store the test tab URL as nullable |
| [018](#adr-018-take-the-disabled-half-of-a-partition-from-the-tail-of-the-pool) | Take the disabled half of a partition from the tail of the pool |
| [019](#adr-019-pin-the-js-beautify-transitive-chain-with-npm-overrides) | Pin the js-beautify transitive chain with npm overrides |
| [020](#adr-020-run-the-verification-gate-in-github-actions) | Run the verification gate in GitHub Actions |
| [021](#adr-021-reuse-the-e2e-harness-for-manual-browser-sessions) | Reuse the E2E harness for manual browser sessions |
| [022](#adr-022-verify-against-real-marketplace-extensions) | Verify against real marketplace extensions |
| [023](#adr-023-install-unpacked-directories-not-store-archives) | Install unpacked directories, not store archives |
| [024](#adr-024-drive-the-full-bisect-from-the-fault-extensions-own-symptom) | Drive the full bisect from the fault extension's own symptom |
| [025](#adr-025-policy-install-firefox-for-automatic-toggling) | Policy-install Firefox for automatic toggling |
| [026](#adr-026-keep-the-policy-rails-nightly-inside-the-repository) | Keep the policy rail's Nightly inside the repository |

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

---

## ADR-016: Keep user exclusions out of candidate eligibility

**Status**: Accepted (revised 2026-11-25 by ISS-016)
**Date**: 2026-11-25
**Deciders**: ISS-002 and ISS-003 implementation sessions (LLM-driven)

### Context

`listCandidates` returns `{ eligible, ineligible }`. The original ISS-002 design reported a config exclusion as `ineligible` with reason `user-excluded`, so a user preference was reported exactly like an intrinsic exclusion (theme, disabled, policy-locked, self). The candidate picker, however, has to let the user clear an exclusion again — an ineligible-only row would strand the extension with no control to re-include it. The first fix had the presentation layer re-merge those entries into the picker, which meant two modules encoded the same state and any consumer filtering on `eligible` alone silently missed a re-includable extension (`DEBT-2026-006`, `ISS-016`).

### Decision

Eligibility is **intrinsic only**: `self`, `theme-or-app`, `disabled-at-start`, `policy-locked`. User exclusions live exclusively in `BisectConfig.excludedExtensionIds`, and `eligible` is the single source for pickable candidates. `buildPickerRows(eligible, excludedIds)` marks excluded rows; there is no re-merging from `ineligible`, and `intrinsicIneligible` is deleted.

### Consequences

**Good**: One module owns the exclusion contract; a consumer that filters on `eligible` cannot silently lose a candidate; every selectable row has a checkbox; the "Not eligible" section only holds extensions the user cannot act on.

**Bad**: A caller that wants the full picture needs both `listCandidates().eligible` and the config's `excludedExtensionIds` to know which candidates the user deselected.

**Mitigations**: `startSession` receives explicit `candidateIds`, so the picker's selection is passed in rather than re-derived inside the port; the contract is recorded in `docs/SPEC.md` §Candidate eligibility and `docs/ARCH.md` §6.3.

---

## ADR-017: Store the test tab URL as nullable

**Status**: Accepted (revised 2026-11-24 by ISS-003)
**Date**: 2026-11-24
**Deciders**: ISS-003 implementation session (LLM-driven, user-approved)

### Context

`BisectConfig.testTab` was specified as `{ tabId: number; url: string } | null`, and `docs/SPEC.md` §Test tab assumed the add-on could always fill `url`. ADR-012 fixes the permission set to `storage`, `management`, and Chrome `sidePanel` — no `tabs`. Without that permission neither Chrome nor Firefox exposes `tab.url` to the caller: `tabs.query()` and `tabs.get()` return the id, index, and status but leave `url` undefined. The implemented `TestTabBinding` in `utils/bisect/domain.ts` therefore already declares `url: string | null`, which contradicted both documents.

### Decision

`testTab.url` is **nullable** everywhere: `testTab: { tabId: number; url: string | null } | null`. The background records the URL only when the browsing context happens to expose one (a test or DOM context) and records `null` otherwise. The panel renders `Tab #N` for a null URL and `Tab #N · <url>` when a URL is available. The `tabs` permission stays off; only the tab id is ever used for `tabs.reload` and `tabs.onUpdated`.

### Consequences

**Good**: The schema matches what the browser can actually deliver, so the binding is never fabricated; the add-on keeps the minimal permission set that store review and the consent screen promise (ADR-012); the UI degrades to a stable `Tab #N` label instead of showing an empty or guessed URL.

**Bad**: The user cannot tell two tabs apart by URL, so a stale binding is harder to notice; the E2E assertions can only compare the id, and any future feature that needs the URL will need a permission change plus a schema bump.

**Mitigations**: The pre-flight consent screen shows the binding and offers a rebind, and the session still reloads by id; the rationale is recorded in `docs/SPEC.md` §Storage and §Test tab, `docs/TECH_DESIGN.md` §9.1, and `docs/NOTES.md`.

---

## ADR-018: Take the disabled half of a partition from the tail of the pool

**Status**: Accepted
**Date**: 2026-11-26
**Deciders**: ISS-004 implementation session (LLM-driven, user-approved)

### Context

`docs/SPEC.md` §Partition loop and `docs/TECH_DESIGN.md` §6.3 both write the partition as `mid = floor(n / 2)` with the enabled half first, but the two documents' own prose and the mandated worked example disagree on which half `mid` counts. Read as "the first `mid` suspects are enabled", `n = 3` yields 1 enabled / 2 disabled and the `N = 24` trace in §6.5 becomes unreachable: its Trial 4 needs 7–8 enabled and 9 disabled alone, and its "#7 needs a sixth trial" variant depends on that. Read as "the last `mid` are disabled", every row of the trace reproduces exactly. §6.5 is the reference `docs/SPEC.md` §Partition loop and `docs/ISSUES.md` ISS-004 both point tests at.

### Decision

`partitionSuspects` gives the **last** `floor(n / 2)` suspects to the disabled half, so an odd pool's extra candidate is enabled and `n = 3` is 2 enabled / 1 disabled. A lone suspect is disabled alone, which is the final confirmation trial. `docs/SPEC.md` §Partition loop and `docs/TECH_DESIGN.md` §6.3 were corrected to state the disabled half explicitly; §6.5 is authoritative wherever they still disagree.

### Consequences

**Good**: The implementation matches the mandated trace batch for batch, including the sixth-trial variant, so the reference test asserts the specification rather than the code; the enabled half keeps the wider suspect coverage on every odd step, which is what the trace requires for its 3-suspect step.

**Bad**: The prose formula and the code now need to be read together, and a future reader may still "simplify" the slice bounds back to the literal first-`mid` reading; the E2E and unit tests are the only guard.

**Mitigations**: `tests/unit/bisect-engine.test.ts` asserts the full `N = 24` trace and the `#7` sixth-trial variant, and `docs/NOTES.md` §partition-loop records why the naive reading must not be reintroduced.

---

## ADR-019: Pin the js-beautify transitive chain with npm overrides

**Status**: Accepted
**Date**: 2026-11-25
**Deciders**: DEBT-2026-004 remediation session (LLM-driven)

### Context

`npm audit` reported 16 dev-tree advisories (`DEBT-2026-004`): 11 high via the `puppeteer` 24 and `happy-dom` 20 chains, and 5 moderate via `@vue/test-utils` → `js-beautify`. Bumping the first two closed the high findings, but `js-beautify` 2.0.3 — the latest release — still declares `glob: ^13.0.6` and `editorconfig: ^3.0.2`, whose only patched successors are `glob` 14 and `editorconfig` 4. No upstream release accepts them, so the remaining advisories were unreachable by a version bump or `npm audit fix` (which only offered to *downgrade* `@vue/test-utils` to 2.4.11 and re-open a worse tree).

### Decision

Pin the two transitive packages with npm `overrides` in `package.json`: `editorconfig: ^4.0.1` and `glob: ^14.0.6`. Both are used only by `js-beautify`, which `@vue/test-utils` uses to pretty-print component snapshots in unit tests, and both keep a compatible API for that use. Do not override `minimatch` directly — it follows from `glob`/`editorconfig` and is already patched there.

### Consequences

**Good**: `npm audit` reports zero vulnerabilities with no downgrade; the direct dependencies stay on their latest releases; the pin is one visible block that names exactly which packages are ahead of their declared ranges.

**Bad**: The overrides defeat the semver ranges `js-beautify` declares, so a future `js-beautify` release that widens them needs the block re-checked rather than trusted; `npm` does not warn when an override becomes stale. `glob` 14 and `editorconfig` 4 are major bumps taken on API compatibility reasoning, not on upstream testing.

**Mitigations**: `npm run test:unit` exercises the snapshot printer on every run, and `npm run agent:verify` is the completion gate; delete the block once `js-beautify` declares `glob` ≥14 and `editorconfig` ≥4. `docs/RUNBOOK.md` RUN-001 installs from the pinned lockfile.

---

## ADR-020: Run the verification gate in GitHub Actions

**Status**: Accepted
**Date**: 2026-11-25
**Deciders**: DEBT-2026-003 remediation session (LLM-driven, user-approved)

### Context

The completion gate (`npm run agent:verify`: Biome, `vue-tsc`, Vitest, both test-mode builds, and Puppeteer E2E on Chrome and Firefox) only ran on a developer machine. Nothing validated a push from another machine, and the repository had no `.github/`, no CI configuration, and no `CODEOWNERS` (`DEBT-2026-003`). The gate needs two real browsers, which the installed Puppeteer version downloads and pins (`chrome` and `firefox`, RUN-001).

### Decision

Run the existing gate unchanged in GitHub Actions (`.github/workflows/ci.yml`) on `ubuntu-latest` with Node 22: `npm ci`, install the puppeteer-pinned browsers with `npx puppeteer browsers install chrome --install-deps` and `firefox --install-deps` under `sudo` while preserving the runner's `HOME`, then `npm run agent:verify` on every push, pull request, and manual dispatch. Add a minimal `.github/CODEOWNERS` naming `@k-joel`. Do not split the gate into parallel jobs or cache browser downloads in v1.

### Consequences

**Good**: Every push and pull request runs exactly the gate a developer runs locally; the `--install-deps` invocations cover the Linux system libraries the browsers need; CODEOWNERS routes review to the maintainer; no CI-only script can drift from RUN-003.

**Bad**: A run is Linux-only and repeats the browser install and the whole E2E suite, so it is slower than the fast inner loop; the workflow is coupled to Puppeteer's pinned browser builds and to `apt-get satisfy` on the runner image; browser automation remains the most likely flake source.

**Mitigations**: The CI command is byte-identical to RUN-003; `timeout-minutes: 30` bounds a hung run; `npm run agent:verify:chrome|firefox` (RUN-004) stays the single-browser iteration path; the browser-install quirks are recorded in NOTES.md §ci.

---

## ADR-021: Reuse the E2E harness for manual browser sessions

**Status**: Accepted
**Date**: 2026-11-25
**Deciders**: Manual-session tooling request (LLM-driven, user-approved)

### Context

The add-on could only be run by hand in a developer's own browser — either the unpacked build or the WXT dev server, both of which attach to a real profile that a test add-on should not touch. Exercising the product properly needed a browser where the extension, a bound test tab, and a set of installed extensions already existed — the same three preconditions the E2E harness establishes. That launch path is genuinely subtle: Chrome extensions must be installed after launch rather than through launch arguments (NOTES.md §e2e-chrome), Firefox needs the BiDi system-access environment variable and a pinned extension UUID (NOTES.md §e2e-firefox), and a fresh profile has no extensions at all, so the candidate picker renders empty and looks broken.

### Decision

Add `tools/manual-browser.mjs`, a headful consumer of `tests/e2e/harness.mjs`, exposed as `npm run manual:chrome` and `npm run manual:firefox`. It launches through the existing `launchTestBrowser()`, installs the fixture extensions, opens the panel, pre-binds a fixture page as the test tab by writing `bisectConfig` directly, and holds the window until the browser disconnects. It duplicates no launch logic and adds no manual-only branches to the harness. A `--smoke` flag runs the same path headless with a handful of assertions so the tool can be verified without a human.

### Consequences

**Good**: One launch path, so a manual session cannot exercise a browser the gate never exercises; the install-after-launch, BiDi, and UUID subtleties stay in one file; the pre-bind avoids a bug a human would otherwise hit every session (`bindTestTab` resolves the active tab, and the panel is a tab); `--smoke` makes the tool agent-verifiable.

**Bad**: `tests/e2e/harness.mjs` is no longer E2E-private — its exports are now a contract that `tools/` depends on, so an incompatible harness change breaks a non-test consumer; the harness gained a `userDataDir` passthrough it did not need for tests; the panel opens as a tab rather than the real side panel, because a toolbar click is not scriptable over CDP or BiDi.

**Mitigations**: The harness stays free of manual-only branches and the launcher owns its pre-bind, banner, and smoke checks; `npm run agent:verify` still exercises the harness on both browsers, so an incompatible change fails the gate; NOTES.md §manual-browser records the tab-vs-side-panel limitation for the next session.

---

## ADR-022: Verify against real marketplace extensions

**Status**: Accepted
**Date**: 2026-11-25
**Deciders**: Real-world verification request (LLM-driven, user-approved)

### Context

Every existing gate installed the same four hand-written fixtures (`fixture-alpha`, `-bravo`, `-dormant`, `-theme`). Those fixtures are ideal for pinning protocol details — they are tiny, deterministic, and can be made ineligible on demand — but they share none of the properties that make a real investigation hard: dozens of extensions, store-signed packages, content scripts that inject on every page, service workers that start and stop, and console noise a third party owns. Nothing in the suite proved the add-on could bisect a browser that was actually broken by something it did not build.

### Decision

Add a separate, opt-in gate (`npm run agent:verify:real`) that installs 20 curated marketplace extensions plus one deliberately faulty extension and runs the complete bisect. The curated set is pinned by URL in `tests/e2e/curated-extensions.json`, fetched by `tools/download_good_extensions.py` into a gitignored `good_extensions/`, and installed from unpacked directories. The fault is a purpose-built extension in `bad_extension/` whose only job is to be reliably detectable. The gate is not part of CI: it downloads tens of megabytes from two stores on every run, depends on third-party network availability, and would make a push-to-main pipeline fail for reasons the repository cannot control.

### Consequences

**Good**: The add-on is now proven against browsers that resemble a user's real one; the 20-extension run exercises the partition loop at its realistic depth (five questions instead of one or two); third-party faults, hangs, and console noise surface as real conditions rather than as hypotheticals; the existing fixture gate stays fast and deterministic.

**Bad**: The full gate is slow and network-dependent, so nobody runs it by default; the curated list decays as extensions change owners, go MV2-only, or are delisted; downloading from the Chrome Web Store uses an unofficial endpoint; the repository now commits to owning that decay rather than a stable fixture.

**Mitigations**: `good_extensions/catalog.json` records the resolved version of every extension so drift is visible; the downloader fails loudly per entry and names the slug; `docs/RUNBOOK.md` RUN-008 documents the refresh procedure; the fixture suite remains the completion gate, so a stale curated set degrades one opt-in command rather than the whole project.

---

## ADR-023: Install unpacked directories, not store archives

**Status**: Accepted
**Date**: 2026-11-25
**Deciders**: Real-world verification request (LLM-driven, user-approved)

### Context

`tools/download_good_extensions.py` naturally produces what the stores ship: a `.crx` from the Chrome Web Store and an `.xpi` from addons.mozilla.org. Puppeteer accepts neither. Chrome's `Browser.installExtension` sends the CDP command `Extensions.loadUnpacked`; Firefox's WebDriver BiDi path sends `webExtension.install` with `extensionData: { type: 'path' }`. Both want a directory on disk.

### Decision

The downloader keeps each original archive under `good_extensions/_archives/<browser>/` and additionally unpacks it beside that archive, so the runners always point at a directory. CRX containers are unwrapped by parsing the `Cr24` header (CRX2 and CRX3 have different fixed fields) and extracting the trailing ZIP. Firefox XPIs are ZIPs already. Every extracted extension is validated before it is moved into place: `manifest.json` must exist, `manifest_version` must be 3 for Chrome and 2 or 3 for Firefox, and the Firefox gecko id is read from `browser_specific_settings` **or** the legacy `applications` key.

### Consequences

**Good**: One extraction step satisfies both engines without a Puppeteer fork or a patched launcher; the archives stay on disk, so the Firefox policy rail can install the signed XPI rather than the directory (ADR-025); validation turns a corrupt download into one named failure instead of a browser that mysteriously lacks an extension.

**Bad**: `good_extensions/` stores each extension roughly twice (archive plus unpacked tree); the CRX parsing is a small amount of binary-format code that must track any future CRX4; MV3-only enforcement means a curated entry can be rejected after it was accepted by the catalog.

**Mitigations**: The duplicated bytes live in a gitignored directory and are re-derivable; the CRX version check fails explicitly on an unknown version rather than guessing; the MV3 rejection message names the slug and suggests an MV3 alternative.

---

## ADR-024: Drive the full bisect from the fault extension's own symptom

**Status**: Accepted
**Date**: 2026-11-25
**Deciders**: Real-world verification request (LLM-driven, user-approved)

### Context

The existing E2E answers bisect questions by checking whether the known culprit's *name* appears in the trial's enabled list. That is fine when the harness owns both the fixtures and the answer key, but it is not a bisect: it reads the outcome from the add-on's own bookkeeping rather than from the browser's observable state. A real-world gate that did the same would prove only that the panel can echo a list it was given.

### Decision

`verify-real.mjs` derives every verdict from the fault extension's machine-readable symptom, and nothing else. `bad_extension/src/content.js` sets `data-bad-extension="active"` on `<html>`, adds a `<meta name="bad-extension-state">` tag, logs `[BAD_EXT_ACTIVE]`, and renders a red `Bad extension enabled` banner for a human. The runner reads the attribute after each applied batch and answers `persists` when it is present. It never inspects `culpritName` to decide an answer; that field is only asserted at the end. The same marker gives the extension its second audience: `tools/bad-extension-probe.mjs` exposes it as a CLI verdict for diagnosing a page without a browser window.

### Consequences

**Good**: The verdict depends only on what the browser actually rendered, so the run exercises the real decision path end to end; the same contract serves a human, an automated runner, and a command-line probe, so they cannot disagree about whether a page is broken; the marker answers *whether* a fault is present and deliberately refuses to answer *which* extension caused it, keeping identification the bisect's job.

**Bad**: The runner now depends on a fixed DOM contract (`data-bad-extension`, the banner id, the meta name) that any change to `content.js` can silently break; a page whose own CSP blocks the injected banner could still show the attribute, so the two signals are not perfectly equivalent; the desktop-only `matches` patterns mean the fault never appears on `file://` or extension pages.

**Mitigations**: `tests/e2e/harness.mjs` exports the marker constant and the unit test asserts `content.js` still emits all three signals; the attribute is set synchronously at `document_start`, before any CSP-restricted subresource loads, so the machine verdict survives a blocked banner; `docs/NOTES.md` records that the contract is a cross-file constant.

---

## ADR-025: Policy-install Firefox for automatic toggling

**Status**: Accepted (revised 2026-11-26: the policy build is a project-local portable Nightly, ADR-026)
**Date**: 2026-11-26
**Deciders**: Real-world verification request (LLM-driven, user-approved)

### Context

On Firefox, `management.setEnabled` refuses to touch a normal extension: it answers *"setEnabled can only be used for themes or by addons installed by enterprise policy"*. Every add-on `Browser.installExtension` installs is *temporary* (`installType: 'development'`), and a temporary add-on is permanently enabled — so the existing Firefox E2E answers every question through the assisted/manual rail and a test-mode driver, never through a real toggle. A zero-human real-world bisect is therefore impossible on Firefox without changing how the add-on itself is installed. MDN's compatibility data records the escape hatch: from Firefox 140, an add-on installed *by policy* may enable and disable any extension. A private copy of a Nightly build is not a static artifact, however: it inherits the staged update from the shared Puppeteer installation and applies it to itself, swapping the whole installation directory — `distribution/policies.json` included — and exiting with code 0 before any client attaches.

### Decision

`tests/e2e/firefox-policy.mjs` runs the automated Firefox gate on a **private, project-local** Puppeteer Firefox (ADR-026), into which it writes `<install>/distribution/policies.json`. That file `force_installed`s this add-on from a locally built XPI (so `getSelf().installType === 'admin'`) and `normal_installed`s the 20 curated extensions and the fault extension from their signed archives. `normal_installed` keeps the candidates user-disableable, so they stay eligible instead of landing in the `policy-locked` bucket. The policy also sets `DisableAppUpdate`, so the installation can never apply a staged update to itself. `launchTestBrowser({ policyInstalledSelf: true })` skips `installExtension`, because installing again over BiDi would downgrade the add-on back to temporary. Before any assertion the runner proves `installType === 'admin'` and fails with an actionable message otherwise.

### Consequences

**Good**: Firefox now runs the same automatic toggle path Chrome always had, so the real-world gate means the same thing on both browsers; the project-local browser keeps machine-wide Puppeteer caches and Firefox profiles untouched; the fault extension is policy-installed too, which is the only way the all-off baseline can hold on Firefox.

**Bad**: The rail depends on an unsigned build being installable, which only Nightly honours, so the Firefox half of the gate requires a separate ~360 MB `npm run firefox:install` download; it writes a file into a browser installation directory, which is inherently fragile across Firefox releases; it only proves the *policy* path, so the ordinary temporary-add-on path still has no automatic coverage.

**Mitigations**: The portable build is downloaded once into `.cache/puppeteer` and reused; a non-portable source is still copied into `.cache/firefox-policy/`, where a `.source` marker invalidates the copy when the Puppeteer build changes, and the copy's `application.ini` `BuildID` is compared with its source's so a copy that self-updated in place is re-created rather than reused — an update swaps the installation directory, `policies.json` included, and the browser exits with code 0 before Puppeteer attaches, which surfaces as `Failed to launch the browser process: Code: 0` with no stderr; `DisableAppUpdate` prevents that from recurring, and `policies.json` is backed up and restored in `finally`; the preflight probe converts a policy regression into one diagnostic paragraph instead of a confusing mid-search failure; the fixture suite continues to cover the assisted rail, so both paths stay exercised.

---

## ADR-026: Keep the policy rail's Nightly inside the repository

**Status**: Accepted
**Date**: 2026-11-26
**Deciders**: Global-Nightly workaround request (LLM-driven, user-approved)

### Context

The policy rail needs a Firefox that honours `xpinstall.signatures.required=false`, because the add-on's own XPI is unsigned and a policy `force_installed` add-on must be signed on stable Firefox (ADR-025). Re-investigation on 2026-11-26 confirmed that Puppeteer's pinned stable Firefox 160 cannot substitute: it does not even read `distribution/policies.json` (`about:policies` reports "The Enterprise Policies service is inactive"), so `management.getSelf()` never reports `installType: 'admin'`. The previous prerequisite, `npx puppeteer browsers install firefox@nightly`, put Nightly in the user's shared `~/.cache/puppeteer`; running it interfered with the maintainer's normal Firefox installation, which made the opt-in gate hostile to the machine it ran on.

### Decision

The policy rail runs only a **project-local portable Nightly**. `npm run firefox:install` invokes Puppeteer's installer with `PUPPETEER_CACHE_DIR=.cache/puppeteer`, so the browser lands in the repository's gitignored cache and never in the user profile. `resolveFirefoxSourceDir()` scans only that cache and accepts only `nightly` entries; it deliberately ignores stable builds and the shared Puppeteer cache. `ensurePolicyFirefox()` treats a source inside `.cache/puppeteer` as already private and writes `policies.json` into it in place, while any other source keeps the existing copy-into-`.cache/firefox-policy` path. `DisableAppUpdate` and the policy backup/restore continue to guard the installation.

### Consequences

**Good**: The opt-in real-world gate no longer requires a machine-wide Firefox download and cannot disturb the user's normal Firefox profile or the shared Puppeteer cache; deleting `.cache/` removes the browser, its policies, and every test profile completely; the portable build is launched in place, so there is no duplicate 360 MB copy; stable-only caches fail fast with an actionable message instead of reaching the policy step and reporting a misleading `installType`.

**Bad**: Every checkout downloads its own ~360 MB Nightly, and the download must be repeated when the cache is cleaned; the rail remains tied to Nightly's signature-pref behaviour; the policy is still written into a browser installation directory, which a Firefox self-update could replace.

**Mitigations**: `npm run firefox:install` reuses the cache on later runs; `.cache/` is gitignored and documented as disposable; `DisableAppUpdate` plus the `policies.json` backup/restore keep the in-place policy safe; the preflight `installType` assertion names the missing install command; the unit test covers resolution order, the stable exclusion, and the in-place decision.

