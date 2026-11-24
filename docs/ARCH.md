# Architecture

This is the live, as-built architecture reference. It describes the code as it
exists today, not planned or historical designs. When this document and the code
disagree, the code wins — update this document in the same change. Canonical
terms live in [`GLOSSARY.md`](GLOSSARY.md), rationale in
[`DECISIONS.md`](DECISIONS.md), open defects in [`ISSUES.md`](ISSUES.md),
structural debt in [`TECH_DEBT.md`](TECH_DEBT.md), and operational gotchas
in [`NOTES.md`](NOTES.md).

<!--
ARCH.md MAINTENANCE GUIDE (FOR AGENTS & CONTRIBUTORS)

PURPOSE & SCOPE
- Audience: Engineers and LLM agents needing an accurate map of the codebase.
- Purpose: Authoritative as-built reference of system structure, boundaries,
  runtime topology, data/control flows, schemas, contracts, cross-cutting
  mechanisms, extension points, deployment, and test/quality gates.
- Code-First Rule: Derive every claim directly from source, config, build, and
  CI files (package manifests, entry points, schemas, routes, tests). Never
  document theoretical patterns or unimplemented plans.

UPDATE TRIGGERS
Update docs/ARCH.md whenever a change alters any of the following:
- Process/runtime topology, concurrency model, or lifecycle ownership.
- External API, CLI, RPC, or MCP tool surface and payload contracts.
- Configuration sources, discovery precedence, or environment overrides.
- Database schemas, migrations, identity/invalidation keys, or vector/cache layouts.
- Core data, ingestion, or query/read-path pipelines.
- Cross-cutting boundaries (auth, error handling, logging, security, OS behavior).
- Plugin/extension contracts, deployment/install layout, or test/CI quality gates.
- Any spotted mismatch between this file and actual code.

INCLUSION / EXCLUSION CRITERIA
- INCLUDE:
  - Verified stack, architectural style/hybrids, and explicit In-Scope vs.
    Out-of-Scope boundaries.
  - Runtime topology, process/thread ownership, and dependency direction rules.
  - Component inventory, internal abstractions, interaction protocols, and
    concrete extension mechanisms.
  - Data architecture: domain entities, relationships, actual DDL/schemas,
    consistency/caching/invalidation rules, and filesystem layout.
  - Cross-cutting implementation patterns (auth/secrets, error/retry/fallback,
    logging/observability, input validation, config precedence).
  - Deployment/install topology and test layers + runnable quality-gate commands.
- EXCLUDE (ROUTE ELSEWHERE OR OMIT):
  - Why a choice was made / alternatives considered -> DECISIONS.md
  - Functional bugs or regressions -> ISSUES.md
  - Structural debt, layer violations, or smells -> TECH_DEBT.md
  - Operational quirks or debugging tips -> NOTES.md
  - Standalone term definitions -> GLOSSARY.md
  - Speculative roadmaps, exhaustive line-by-line code dumps, or boilerplate
    sections for technology stacks not detected in the codebase.

STRUCTURE & FORMATTING
- Top-level sections: Numbered H2 headings (`1. Purpose and scope` .. `13. ...`)
  separated by `---` horizontal rules on their own lines.
- Subsections: Numbered H3 headings (`2.1 ...`, `6.1 ...`). Omit unused optional
  subsections; never leave empty "TBD" sections.
- Canonical section order (adapt domain-specific titles to the codebase):
  1. Purpose and scope
  2. Runtime topology
  3. Primary write / ingestion data flow
  4. Primary read / query paths
  5. Domain model
  6. Data architecture
  7. Component design
  8. External interface / API contracts
  9. Cross-cutting concerns
  10. Extension points
  11. Install and launch architecture
  12. Testing architecture
  13. Maintaining this document
- Tables: Use compact Markdown tables for inventories, configs, and schemas.
- Diagrams: Use fenced ASCII diagrams with Unicode arrows (`→`, `──►`, `▼`).
  Never use `-->` inside HTML comments or diagrams that could break parsers.
- Code blocks: Always specify a language tag (`sql`, `json`, `bash`, `text`).

QUALITY & STYLE RULES
- Tense & Tone: Present tense, declarative, terse, and high-signal. No filler.
- Verification: Inspect actual files before writing; cite exact module paths,
  symbol names, config keys, and CLI commands in backticks.
- Consistency: Match canonical vocabulary in GLOSSARY.md and link ADRs inline
  (e.g., `(ADR-005)` or `[ADR-015](DECISIONS.md#...)`) without duplicating rationale.
- Privacy/Safety: Never embed real secrets, tokens, or personal local paths in
  examples; use placeholders (`<workspace>`, `~/.app/`).

LIFECYCLE & WORKFLOW
1. Inspect diff/codebase: Detect active stack, entry points, schemas, and configs.
2. Add: Insert new components/endpoints/tables into the matching numbered section.
3. Modify: Update flows, config tables, and schemas in place to match the code.
4. Retire: Delete removed components, flags, and endpoints from ARCH.md (history
   belongs in git and DECISIONS.md, not stale sections here).
5. Reconcile: If an existing section contradicts the code, fix ARCH.md immediately.

ANTI-PATTERNS
- Documenting planned features, aspirational clean layers, or unverified memory.
- Mixing ADRs, bug lists, or tech-debt commentary into ARCH.md.
- Leaving stale DDL, obsolete CLI flags, or dead module names after refactors.
- Including framework sections (e.g., React/Java/.NET) not present in the repo.
- Using vague qualifiers ("probably", "usually", "various helpers").

EXAMPLE LAYOUT (4-SPACE INDENTED)

    ---

    ## 1. Purpose and scope

    | In scope | Out of scope |
    |---|---|
    | `<core capability>` | `<explicit boundary>` |

    ---

    ## 2. Runtime topology

    ### 2.1 Default mode (`mode: <name>`)

    ```text
    caller ──► <entry-point> ──► <worker/store>
    ```

    | Process / thread | Role | Owns |
    |---|---|---|
    | `<process>` | `<role>` | `<resources>` |

    ---

    ## 3. <Write / ingestion> data flow

    ```text
    input event → filter/debounce → bounded queue → <unit_of_work>() → store
    ```

    ### 3.1 Reconciliation backstops

    1. **Startup reconcile** — `<initial catch-up behavior>`.

    ---

    ## 4. <Read / query> paths

    ### 4.1 <Query path name>

    1. `<Step 1: parse/validate>`
    2. `<Step 2: query store and rank/merge>`

    ---

    ## 5. Domain model

    | Entity | Identity | Key attributes |
    |---|---|---|
    | **<Entity>** | `<unique key>` | `<core fields>` |

    Relationships: `<EntityA> 1—* <EntityB>`.

    ---

    ## 6. Data architecture

    ### 6.1 Primary store (`<path-or-engine>`)

    ```sql
    CREATE TABLE <entity> (id INTEGER PRIMARY KEY, key TEXT NOT NULL UNIQUE);
    ```

    ### 6.2 Secondary / index store

    - `<Engine>`: `<key structure, consistency, and identity binding rules>`.

    ### 6.3 Filesystem layout

    ```text
    <root>/
      <data-dir>/
        <db-file>
        log/<role>.log
    ```

    ---

    ## 7. Component design

    | Module | Responsibility |
    |---|---|
    | `src/<pkg>/<mod>.py` | `<single-sentence role>` |

    ### 7.1 Configuration

    | Config key | Environment | Default |
    |---|---|---|
    | `<section.key>` | `<ENV_VAR>` | `<default>` |

    ---

    ## 8. <Interface / API> surface

    ### 8.1 `<operation_name>`

    | Input | Type | Default | Notes |
    |---|---|---|---|
    | `<param>` | string | required | `<constraint>` |

    ```json
    {"status": "ok", "results": []}
    ```

    ---

    ## 9. Cross-cutting concerns

    ### 9.1 Error handling
    `<Exception hierarchy and fail-soft vs. fatal boundaries.>`

    ### 9.2 Concurrency and consistency
    `<Locks, leases, read-only isolation, and ordering guarantees.>`

    ### 9.3 Logging and observability
    `<Log destinations, levels, redaction rules, and status signals.>`

    ### 9.4 Security boundaries
    `<Auth tokens, file permissions, and non-sandbox boundaries.>`

    ### 9.5 Platform behavior
    `<OS-specific watchers, locks, sockets/pipes, or process flags.>`

    ---

    ## 10. Extension points

    | Extension | Mechanism | Rules |
    |---|---|---|
    | `<plugin type>` | `<discovery path>` | `<override/validation rules>` |

    ---

    ## 11. Install and launch architecture

    ```text
    source ──<installer>──► runtime copy ──► <launcher> ──► entrypoint
    ```

    ---

    ## 12. Testing architecture

    ### 12.1 Test isolation
    `<Env overrides and fixtures isolating tests from user/global state.>`

    ### 12.2 Test layers

    | Layer | What it covers |
    |---|---|
    | Unit | `<isolated modules>` |
    | Integration | `<end-to-end flows with real/stubbed boundaries>` |

    ### 12.3 Quality gates

    ```bash
    <lint / typecheck / test commands>
    ```

    ---

    ## 13. Maintaining this document

    Update triggers and companion-doc split (`ARCH.md`, `DECISIONS.md`,
    `ISSUES.md`, `TECH_DEBT.md`, `NOTES.md`, `GLOSSARY.md`).
-->

---

## 1. Purpose and scope

Browser Extension Bisect is a WXT-built browser extension whose product goal is to find faulty installed extensions by binary search (toggling batches of extensions and observing the result). The as-built system today is the watching skeleton for that goal: a side panel UI that renders the capability report and the candidate picker, a typed storage and messaging layer with a versioned bisect config, two `ManagementPort` adapters that enumerate and filter installed extensions, the legacy popup and content script, and a fully automated cross-browser verification harness. Extension toggling, the bisect log, and the trial loop are not implemented yet — `applyTargetState`, `verifyState`, `restore`, and `watchEvents` throw `not implemented`, and `settings.batchSize` still has no runtime consumer ([ISS-001](ISSUES.md)).

| In scope | Out of scope |
|---|---|
| One TypeScript codebase targeting Chrome (MV3) and Firefox (MV2) via WXT | Firefox MV3 output (pinned to MV2 — [ADR-002](DECISIONS.md)) |
| Side panel/sidebar candidate picker: capability report, display-name search, include/exclude selection, ineligible reasons | Baseline, trial, verdict, history, replay, drift, and restore screens (ISS-003..ISS-009) |
| `ManagementPort` enumeration with one shared eligibility filter and ordering helper | Toggling other extensions (`applyTargetState` and friends are stubs — [ISS-001](ISSUES.md)) |
| Legacy popup scaffold (enable toggle, interaction counter, batch size) and `<all_urls>` content script — retired in ISS-013 | Injected host-page panels (no `createShadowRootUi` UI yet) |
| Local automated verification (Vitest unit + Puppeteer E2E on both browsers) | CI pipelines (none configured — `DEBT-2026-003`) |
| Plain hand-written CSS over a token layer ([ADR-005](DECISIONS.md)) | CSS frameworks and UI component libraries |

---

## 2. Runtime topology

### 2.1 Extension runtime

```text
sidepanel.html (Vue 3 page)                 popup.html (legacy Vue 3 page)
    │  messenger.sendMessage                    │  messenger.sendMessage
    │  getCapabilities/listCandidates/           │  getState/updateState/
    │  getConfig/updateConfig                    │  recordInteraction
    ▼                                            ▼
background.ts (message handlers, sole config writer, owns the ManagementPort)
    │  storage.defineItem ──► browser.storage.local      │ browser.management
    ▼                                                     ▼
storage.local (bisectConfig | enabled | interactionCount | settings)   installed extensions
    │
    ├──► content script (<all_urls>, document_idle) ──watch──► DOM marker on <html>
    └──► side panel (re-renders from message round-trips)
```

| Context | Lifecycle model | Owns |
|---|---|---|
| `background.ts` (`defineBackground`) | Chrome: MV3 service worker · Firefox: MV2 background context | All message handlers; the only writer of `local:bisectConfig`; the `ManagementPort` instance; legacy-key cleanup |
| `entrypoints/sidepanel/App.vue` | Chrome side panel / Firefox sidebar document; loads on mount | UI refs (`state`, `capability`, `eligible`, `ineligible`, `config`, `query`, `errorMessage`) |
| `entrypoints/popup/App.vue` | Opens per browser-action click; loads state on mount | UI refs (`state`, `errorMessage`, `busy`, `batchSizeDraft`) |
| `content.ts` (`defineContentScript`) | Injected per page at `document_idle` | Marker attributes on `document.documentElement` |

### 2.2 Verification harness (Node, outside the browser)

```text
npm run agent:verify
    └──► tests/e2e/verify.mjs ──► tests/e2e/harness.mjs ──► Chrome: CDP (enableExtensions + installExtension)
                                   │                       Firefox: WebDriver BiDi (installExtension)
                                   ├──► tests/e2e/fixtures/extensions/{chrome,firefox}/* (fixture extensions)
                                   └──► tests/e2e/fixture-server.mjs (HTTP on 127.0.0.1:0)
```

---

## 3. Primary write data flow

### 3.1 Candidate exclusion (bisect config)

```text
side panel checkbox change
   ──► messenger.sendMessage('updateConfig', { excludedExtensionIds })
   ──► background handler ──► updateBisectConfig() (utils/bisect/config.ts)
        serialized on the module write queue: read → merge → normalize → write
   ──► returns BisectConfig ──► side panel re-renders
   ──► messenger.sendMessage('listCandidates') ──► eligible/ineligible split changes
```

1. The side panel is never a direct config writer; the background is the only writer (ADR-011).
2. `updateBisectConfig` reads and writes on a promise queue, so two concurrent updates cannot drop a field.
3. `normalizeBisectConfig` forces `schemaVersion: 1`, drops blank and duplicate excluded ids, and repairs a missing `testTab`.

### 3.2 Legacy scaffold state update

```text
popup button click
   ──► messenger.sendMessage('updateState', changes)
   ──► background handler ──► applyStateUpdate() (utils/state.ts)
        reads current state, merges, writes enabledItem + settingsItem
   ──► returns ExtensionState ──► popup re-renders
   └─ storage change ──► enabledItem.watch() in content script ──► DOM marker re-render
```

`recordInteraction` follows the same shape and writes `interactionCountItem` via `incrementInteractionCount`.

---

## 4. Primary read paths

### 4.1 Side panel load (candidate picker)

1. `App.vue` `onMounted` ──► `load()` issues `getCapabilities`, `listCandidates`, and `getConfig` in parallel.
2. `getCapabilities` ──► `ManagementPort.getCapabilities()` ──► `management.getSelf()`; the adapter reports `canAutoToggle` (`true` on Chrome, `installType === "admin"` on Firefox) and its `sideSurface`.
3. `listCandidates` ──► `ManagementPort.listCandidates()` ──► `management.getAll()` + `getSelf()`, filtered by the shared `partitionCandidates` helper. Eligibility is intrinsic only; user exclusions live in the config ([ADR-016](DECISIONS.md)).
4. The panel builds picker rows with `buildPickerRows(eligible, excludedIds)`, which marks excluded candidates as unchecked rows, then renders both lists plus the live-region count. The "Not eligible" section renders `ineligible` as-is — every entry there is an extension the user cannot act on.

### 4.2 Popup state load (legacy)

1. `App.vue` `onMounted` ──► `getState` message ──► `readState()` (`utils/state.ts`).
2. `readState()` resolves the three legacy storage items in parallel and returns the `ExtensionState` aggregate.

### 4.3 Content status resolution (no caller today)

`getContentStatus(targetTabId?)` resolves the active tab (`browser.tabs.query`) and asks that tab's content script for its `data-ext-bisect-state` value. The message is wired into the protocol and background, but nothing sends it (see `DEBT-2026-002` in [TECH_DEBT.md](TECH_DEBT.md)).

### 4.4 E2E read path

The harness navigates directly to `sidepanel.html` and reads `data-testid` nodes via `readCandidateState`; it never uses extension-internal messaging.

---

## 5. Domain model

The full type surface lives in `utils/bisect/domain.ts` and is owned by ISS-002; later slices fill in behaviour without reshaping it.

| Entity | Identity | Key attributes |
|---|---|---|
| **CandidateExtension** | browser extension id | `name`, `version`, `enabledAtStart`, `mayDisable`, `installType`, `type`, `icons` |
| **IneligibleExtension** | browser extension id | `reason`: `theme-or-app` \| `disabled-at-start` \| `policy-locked` \| `self` (intrinsic only; user exclusions stay in the config) |
| **CapabilityReport** | derived per runtime | `browserName`, `canAutoToggle`, `selfInstallType`, `sideSurface` |
| **BisectConfig** | `local:bisectConfig` | `schemaVersion: 1`, `excludedExtensionIds`, `testTab: { tabId, url } \| null`, optional `lastCandidateIds` |
| **TargetState** | per trial | `enabled[]`, `disabled[]`, `allOutsideSuspectsEnabled` |
| **ToggleError / ToggleResult** | per extension id | error codes `policy-blocked`, `needs-user-gesture`, `manual-recovery-required`, `extension-removed`, `unsupported-requirements` |
| **BisectEvent / BisectLog** | monotonic sequence | 12 event types with payloads; log in `local:bisectLog` |
| **Trial / SessionView** | `round` within a session | `enabledIds`, `disabledIds`, `targetState`, `verdict`, `errors`; 11 `SessionStatus` values |
| **ReplayResult**, **DriftReport**, **RestoreResult**, **ManualBatch**, **ManagementEvent**, **EnabledStateMap** | derived or per-call | see `utils/bisect/domain.ts` |

Relationships: `SessionView` 1—* `Trial`; `Trial` 0..1 `Verdict`; `BisectLog` 1—* `BisectEvent`.

---

## 6. Data architecture

### 6.1 Primary store: `browser.storage.local` (typed via WXT)

| Item | Storage key | Type | Fallback |
|---|---|---|---|
| `bisectConfigItem` (`utils/bisect/config.ts`) | `local:bisectConfig` | `BisectConfig` | `{ schemaVersion: 1, excludedExtensionIds: [], testTab: null }` |
| `enabledItem` (`utils/storage.ts`) | `local:enabled` | `boolean` | `true` — legacy, deleted on first start |
| `interactionCountItem` | `local:interactionCount` | `number` | `0` — legacy, deleted on first start |
| `settingsItem` | `local:settings` | `BisectSettings` | `BISECT_SETTINGS_DEFAULTS` — legacy, deleted on first start |

`deleteLegacyStorageKeys()` runs once from the background startup path and removes the three legacy keys; there is no migration for placeholder values (ADR-012). `local:bisectLog` is reserved for ISS-003. Unit tests run against `fakeBrowser` (in-memory); E2E runs against real browser storage.

### 6.2 DOM contract (host pages)

| Attribute | Writer | Values | Readers |
|---|---|---|---|
| `data-ext-bisect-state` | `content.ts` `renderMarker` | `enabled` \| `disabled` | `getContentMarker` message |
| `data-ext-bisect-tab-id` | `content.ts` `publishTestTabId` (test builds only) | tab id string | Firefox E2E popup targeting (`?tabId=`) |

Both are retired with the content script in ISS-013. Attribute-name constants live in `utils/content-marker.ts` and are duplicated in `tests/e2e/harness.mjs` (`DEBT-2026-001`).

### 6.3 Side panel selector contract

Every meaningful node carries a stable `data-testid` (ADR-005). The candidate picker surface is:

| Selector | Node |
|---|---|
| `sidepanel-root` | `<main>`, carries `data-state` = `loading` \| `ready` \| `error` |
| `sidepanel-live` | `aria-live="polite"` announcement (`"N of M candidates shown"`) |
| `sidepanel-loading`, `sidepanel-error` | loading status and `role="alert"` error |
| `no-session`, `culprit-warning` | no-session screen and the culprit-stays-disabled note |
| `capability-report`, `capability-browser`, `capability-toggle-mode`, `capability-surface`, `capability-install-type` | capability report |
| `candidate-picker`, `candidate-search` | picker section and search input |
| `candidate-list`, `candidate-row` (`data-extension-id`, `data-selected`), `candidate-checkbox`, `candidate-name`, `candidate-version`, `candidate-initials`, `candidate-reason` | selectable rows (one per `eligible` candidate; `candidate-reason` reads "Excluded by you" when the id is in the config) |
| `eligible-empty`, `search-empty` | empty states |
| `ineligible-section`, `ineligible-list`, `ineligible-row` (`data-reason`), `ineligible-name`, `ineligible-reason` | intrinsically ineligible extensions only |

### 6.4 Build and artifact layout

```text
.output/chrome-mv3/     WXT Chrome MV3 build (test-mode and production)
.output/firefox-mv2/   WXT Firefox MV2 build (test-mode and production)
.agent-artifacts/      E2E failure screenshots (wiped at each verify run)
.wxt/                  generated types for typecheck
```

---

## 7. Component design

| Module | Responsibility |
|---|---|
| `entrypoints/background.ts` | Registers the nine message handlers, builds the platform `ManagementPort`, deletes legacy keys at startup, attaches `[EXT_BG_ERR]` logging in test builds, resolves per-tab content status. |
| `entrypoints/sidepanel/App.vue` | Side panel shell: loads capability/candidates/config, owns search query and error state, sends `updateConfig`, renders the live region. |
| `entrypoints/sidepanel/components/CapabilityReport.vue` | Renders `browserName`, toggle mode wording, surface, and install type. |
| `entrypoints/sidepanel/components/CandidatePicker.vue` | Search input, filtered rows, and empty states; renders the ineligible list. |
| `entrypoints/sidepanel/components/CandidateRow.vue` | Selectable row: checkbox, initials, name, version, exclusion reason. |
| `entrypoints/sidepanel/components/IneligibleList.vue` | "Not eligible" list with a reason chip per entry. |
| `entrypoints/sidepanel/components/NoSession.vue` | No-session screen and the culprit-left-disabled note. |
| `entrypoints/sidepanel/presentation.ts` | Pure UI helpers: reason labels, mode wording, initials, search matching, row building and ordering. |
| `entrypoints/sidepanel/style.css` | Token layer (light/dark via `light-dark()`) and side panel layout. |
| `entrypoints/content.ts` | Renders the DOM marker from stored state, keeps it live, answers `getContentMarker`, publishes the tab-id marker in test builds. |
| `entrypoints/popup/App.vue` | Legacy popup: loads state, sends `updateState`/`recordInteraction`, exposes the batch-size input. |
| `utils/bisect/domain.ts` | The complete owned type surface: entities, events, results, error codes, `ManagementPort`. |
| `utils/bisect/config.ts` | `local:bisectConfig` item, normalization, serialized `updateBisectConfig`, watcher, legacy-key deletion. |
| `utils/bisect/management-port.ts` | Injectable `ManagementSurface`, the shared eligibility filter (intrinsic reasons only) and ordering helper, and the `not implemented` stubs. |
| `utils/bisect/chrome-port.ts` | Automated adapter: `canAutoToggle: true`, `sideSurface: 'side-panel'`. |
| `utils/bisect/firefox-port.ts` | Assisted adapter: `canAutoToggle` only for `installType === 'admin'`, `sideSurface: 'sidebar'`. |
| `utils/messaging.ts` | `ProtocolMap` (the entire message surface) and the shared `messenger`. |
| `utils/storage.ts`, `utils/state.ts`, `utils/content-marker.ts` | Legacy scaffold items/helpers, retired in ISS-013. |
| `utils/test-mode.ts` | `isTestMode()` gate over the `__EXT_TEST_MODE__` define and `readTabIdParam()` for `?tabId=`. |

### 7.1 Configuration

| Config | Source | Default / notes |
|---|---|---|
| Manifest | `wxt.config.ts` manifest callback | `permissions: [storage, tabs, management, sidePanel]`, `host_permissions: [<all_urls>]` (both narrowed in ISS-013); `browser_specific_settings.gecko.id` on Firefox builds only |
| Side panel manifest slot | `entrypoints/sidepanel/index.html` `<meta name="manifest.type" content="sidepanel">` | WXT emits `side_panel.default_path` + the `sidePanel` permission on Chrome MV3 and `sidebar_action.default_panel` on Firefox |
| Panel metadata | `<meta name="manifest.default_title">`, `<meta name="manifest.default_icon">` | `Extension Bisect` and `public/icon/{16,32,48,128}.png` |
| Test mode | `EXT_TEST_MODE=1` env ──► Vite `define __EXT_TEST_MODE__` | `false`; `build:prod:*` strips all test hooks |
| Unit tests | `vitest.config.ts` | `vue()` plugin registered manually; `WxtVitest()`; `happy-dom`; `restoreMocks`/`clearMocks` |
| Lint/format | `biome.json` | scoped to `entrypoints/`, `utils/`, `tests/`, `scripts/`, root `*.ts`/`*.json` |

---

## 8. Messaging surface (ProtocolMap contract)

All extension IPC goes through `defineExtensionMessaging<ProtocolMap>` (`utils/messaging.ts`); there is no raw `runtime.sendMessage` anywhere.

| Message | Payload | Returns | Direction |
|---|---|---|---|
| `getCapabilities` | — | `CapabilityReport` | side panel ──► background |
| `listCandidates` | — | `{ eligible, ineligible }` | side panel ──► background |
| `getConfig` | — | `BisectConfig` | side panel ──► background |
| `updateConfig` | `Partial<BisectConfig>` | `BisectConfig` | side panel ──► background |
| `getState` | — | `ExtensionState` | popup ──► background (legacy) |
| `updateState` | `Partial<BisectSettings> & { enabled?: boolean }` | `ExtensionState` | popup ──► background (legacy) |
| `recordInteraction` | — | `ExtensionState` | popup ──► background (legacy) |
| `getContentStatus` | `targetTabId?: number` | `ContentStatus` | (no sender today — `DEBT-2026-002`) |
| `getContentMarker` | — | `string \| null` | background ──► content script (tab-scoped send) |
| `getTabId` | — | `number \| null` | content script ──► background |

The `getState`..`getTabId` rows retire with the scaffold in ISS-013; the remaining nine messages of the target surface (sessions, trials, verdicts, replay, drift) arrive with ISS-003..ISS-009.

---

## 9. Cross-cutting concerns

### 9.1 Error handling

The side panel catches every message rejection into `errorMessage` (`role="alert"`, `data-testid="sidepanel-error"`) and flips `data-state` to `error`, so a failing `management.getAll` shows a readable message instead of an empty picker. The legacy popup does the same. `readContentStatus` fails soft: a messaging failure yields `{active: false, marker: null}`. `ManagementPort.applyTargetState`/`verifyState`/`restore`/`watchEvents` currently throw `new Error('not implemented')`. No retries anywhere.

### 9.2 Concurrency and consistency

Single-writer rules: only background handlers write storage, and only `updateBisectConfig` writes the config. Its module-level promise queue serializes read-modify-write, so concurrent `updateConfig` messages cannot lose a field. The legacy `applyStateUpdate` merges onto freshly read state (last write wins). Storage `watch` events are the fan-out to content scripts.

### 9.3 Logging and observability

The background logs `[EXT_BG_READY]` at startup (the Chrome E2E gate waits for it) and `[EXT_BG_ERR]` on `error`/`unhandledrejection` in test builds only. The harness recorder keeps at most 200 entries per category, filters benign `favicon.ico` noise, and `collectErrors` derives the four error budgets asserted at the end of each E2E run.

### 9.4 Test-mode gating

`isTestMode()` compiles to `false` when `EXT_TEST_MODE` is not `1`: `?tabId=` handling, the tab-id DOM marker, and error logging disappear from production builds ([ADR-007](DECISIONS.md)).

### 9.5 Platform behavior

Chrome MV3 service worker vs Firefox MV2 background, and Puppeteer CDP vs WebDriver BiDi divergences (navigation, URL reporting, extension install, popup and side panel opening) are isolated inside `tests/e2e/harness.mjs`; the quirks are recorded in [NOTES.md](NOTES.md). `management.setEnabled` works from a Chrome extension page but is rejected for Firefox extensions that are not policy-installed, which is why the adapters split into automated and assisted.

---

## 10. Extension points

| Extension | Mechanism | Rules |
|---|---|---|
| New message | extend `ProtocolMap` (`utils/messaging.ts`) + handler in `background.ts` | keep payload types in `utils/bisect/domain.ts`; cover in unit tests and `verify.mjs` steps |
| New persisted item | `storage.defineItem` in `utils/bisect/config.ts` (or a new `utils/bisect/*` module) | `local:` area, fallback required, versioned shape |
| Port behaviour | implement a `not implemented` method in `utils/bisect/chrome-port.ts` / `firefox-port.ts` | keep `domain.ts` signatures stable; reuse the shared filter/ordering helpers |
| New UI surface | WXT entrypoint under `entrypoints/` | plain CSS with tokens; `data-testid` on meaningful nodes; host-injected UI must use `createShadowRootUi` with `cssInjectionMode: 'ui'` |
| New E2E step | append to `runScenario` in `tests/e2e/verify.mjs` | stay browser-agnostic or branch on `browserName`; keep CDP-only calls inside `harness.mjs` |
| New fixture extension | add a directory under `tests/e2e/fixtures/extensions/<browser>/` and register it in `fixtures/fixtures.mjs` | per-browser manifests; Firefox fixtures need a `browser_specific_settings.gecko.id` |

---

## 11. Install and launch architecture

```text
wxt build (npm run build:chrome | build:firefox | build:prod:*)
    ├──► .output/chrome-mv3   (MV3: background service worker, side_panel, popup action)
    └──► .output/firefox-mv2  (MV2: background script + gecko id + sidebar_action)

E2E install (tests/e2e/harness.mjs):
  Chrome:  launch({ enableExtensions: true, pipe: true,
                    args: ['--enable-unsafe-extension-debugging'] })
           ──► browser.installExtension(extPath)
           ──► browser.installExtension(<each fixture>)   (installFixtures)
  Firefox: extraPrefsFirefox({ 'xpinstall.signatures.required': false,
                    'extensions.webextensions.uuids': { [geckoId]: FIXED_FIREFOX_UUID } })
           ──► installExtension(extPath) (asserted to return geckoId)
           ──► installExtension(<each fixture>)

Surface opening:
  openSurface() ──► Chrome:  chrome-extension://<id>/sidepanel.html
               └──► Firefox: moz-extension://<uuid>/sidepanel.html  (gotoExtensionPage)

Manual dev: npm run dev / npm run dev:firefox (WXT dev server)
```

---

## 12. Testing architecture

### 12.1 Test isolation

Unit tests call `fakeBrowser.reset()` per test; component and messaging tests register the real background handlers through `registerBackgroundHandlers({ managementPort })` and route sends through `installMessagingBridge()` (`tests/unit/helpers/messaging-bridge.ts`). `fakeBrowser` has no `management` API, so adapter tests inject a fake management surface (`tests/unit/helpers/fake-management.ts`). E2E uses a fresh fixture server bound to `127.0.0.1:0` and a fresh browser profile per browser; `.agent-artifacts/` is wiped at the start of every verify run.

### 12.2 Test layers

| Layer | Files | What it covers |
|---|---|---|
| Unit (domain surface) | `tests/unit/bisect-domain.test.ts` | the owned type surface: 12 event types, 11 session statuses, 5 reasons, 5 error codes, nullable `testTab.url`, 6-method port |
| Unit (config) | `tests/unit/bisect-config.test.ts` | fallback, normalization, serialized persistence, watcher, legacy-key deletion |
| Unit (eligibility) | `tests/unit/candidate-eligibility.test.ts` | every exclusion reason, reason precedence, deterministic name-then-id ordering |
| Unit (adapters) | `tests/unit/management-adapters.test.ts` | both adapters against the fake surface: listing, capability report, `not implemented` stubs |
| Unit (messaging) | `tests/unit/bisect-messaging.test.ts` | `getCapabilities`/`listCandidates`/`getConfig`/`updateConfig` round-trips, exclusion→reason propagation, concurrent updates, startup cleanup |
| Component (`@vue/test-utils` + `happy-dom`) | `tests/unit/sidepanel.test.ts` | loading, ready, error, no-session, capability report, rows, initials, empty states, ineligible reasons, search filtering, live region, persistence across remount |
| Unit (presentation) | `tests/unit/sidepanel-presentation.test.ts` | reason labels, mode wording, initials, search matching, row merging/ordering |
| Unit (legacy scaffold) | `tests/unit/storage.test.ts`, `messaging.test.ts`, `popup.test.ts` | the popup scaffold — retired in ISS-013 |
| E2E (Puppeteer; Chrome CDP + Firefox BiDi) | `tests/e2e/verify.mjs` | all above, plus fixture extensions (enabled, disabled-at-start, theme) and the candidate list on both browsers |

### 12.3 Quality gates

```bash
npm run lint && npm run typecheck && npm run test:unit   # fast inner loop
npm run agent:verify                                     # full gate: lint, typecheck, unit, build:all, E2E both browsers
```

The completion gate is `npm run agent:verify` exiting 0 with zero `pageErrors` and zero `[EXT_BG_ERR]` entries across both browsers.

---

## 13. Maintaining this document

Update this file in the same change whenever runtime topology, messaging contracts, storage schema, DOM contract, build/install flow, or test architecture changes (rules in the maintenance guide above). Rationale belongs in [DECISIONS.md](DECISIONS.md), defects in [ISSUES.md](ISSUES.md), debt in [TECH_DEBT.md](TECH_DEBT.md), operational quirks in [NOTES.md](NOTES.md), and terms in [GLOSSARY.md](GLOSSARY.md).

