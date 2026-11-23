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

Browser Extension Bisect is a WXT-built browser extension whose product goal is to find faulty installed extensions by binary search (toggling batches of extensions and observing the result). The as-built system today is the state-management scaffold for that goal: a popup UI, a typed storage and messaging layer, a per-page DOM marker, and a fully automated cross-browser verification harness. The batch-toggling engine itself is not implemented yet — `settings.batchSize` and `settings.enabledExtensions` are persisted and editable but have no runtime consumer ([ISS-001](ISSUES.md)).

| In scope | Out of scope |
|---|---|
| One TypeScript codebase targeting Chrome (MV3) and Firefox (MV2) via WXT | Firefox MV3 output (pinned to MV2 — [ADR-002](DECISIONS.md)) |
| Popup-driven extension state: enable toggle, interaction counter, batch-size setting | Enumerating/toggling other extensions (future bisect engine, ISS-001) |
| `<all_urls>` content script rendering a DOM state marker | Injected host-page panels (no `createShadowRootUi` UI yet) |
| Local automated verification (Vitest unit + Puppeteer E2E on both browsers) | CI pipelines (none configured — `DEBT-2026-003`) |
| Plain hand-written CSS over a token layer ([ADR-005](DECISIONS.md)) | CSS frameworks and UI component libraries |

---

## 2. Runtime topology

### 2.1 Extension runtime

```text
popup.html (Vue 3 page)
    │  messenger.sendMessage (runtime messages)
    ▼
background.ts (message handlers, sole storage writer)
    │  storage.defineItem ──► browser.storage.local
    ▼
storage.local (enabled | interactionCount | settings)
    │
    ├──► content script (<all_urls>, document_idle) ──watch──► DOM marker on <html>
    └──► popup (re-renders from ExtensionState round-trips)
```

| Context | Lifecycle model | Owns |
|---|---|---|
| `background.ts` (`defineBackground`) | Chrome: MV3 service worker · Firefox: MV2 background context | All message handlers; the only code that writes storage |
| `entrypoints/popup/App.vue` | Opens per browser-action click; loads state on mount | UI refs (`state`, `errorMessage`, `busy`, `batchSizeDraft`) |
| `content.ts` (`defineContentScript`) | Injected per page at `document_idle` | Marker attributes on `document.documentElement` |

### 2.2 Verification harness (Node, outside the browser)

```text
npm run agent:verify
    └──► tests/e2e/verify.mjs ──► tests/e2e/harness.mjs ──► Chrome: CDP (enableExtensions + installExtension)
                                   │                       Firefox: WebDriver BiDi (installExtension)
                                   └──► tests/e2e/fixture-server.mjs (HTTP on 127.0.0.1:0)
```

---

## 3. Primary write data flow (state update)

```text
popup button click
   ──► messenger.sendMessage('updateState', changes)
   ──► background handler ──► applyStateUpdate() (utils/state.ts)
        reads current state, merges, writes enabledItem + settingsItem
   ──► returns ExtensionState ──► popup re-renders
   └─ storage change ──► enabledItem.watch() in content script ──► DOM marker re-render
```

1. The popup is never a direct storage writer; the `busy` flag disables its buttons while a round-trip is in flight.
2. `recordInteraction` follows the same shape and writes `interactionCountItem` via `incrementInteractionCount` (non-finite or non-positive counts reset to 1).

---

## 4. Primary read paths

### 4.1 Popup state load

1. `App.vue` `onMounted` ──► `getState` message ──► `readState()` (`utils/state.ts`).
2. `readState()` resolves the three storage items in parallel (`Promise.all`) and returns the `ExtensionState` aggregate; the popup renders status text via `formatStatus`.

### 4.2 Content status resolution (no caller today)

`getContentStatus(targetTabId?)` resolves the active tab (`browser.tabs.query`) and asks that tab's content script for its `data-ext-bisect-state` value. The message and its helpers are wired into the protocol and background, but nothing sends it — popup, tests, and harness never do (see `DEBT-2026-002` in [TECH_DEBT.md](TECH_DEBT.md)).

### 4.3 E2E read path

The harness reads the DOM marker directly (`waitForAttribute`) and popup text via `data-testid` selectors; it never uses extension-internal messaging.

---

## 5. Domain model

| Entity | Identity | Key attributes |
|---|---|---|
| **ExtensionState** | value object returned by every state message | `enabled: boolean`, `interactionCount: number`, `settings: BisectSettings` |
| **BisectSettings** | persisted as `local:settings` | `batchSize: number`, `enabledExtensions: string[]` |
| **ContentStatus** | derived per tab, never persisted | `active: boolean`, `marker: string \| null` |

Relationships: `ExtensionState` 1—1 `BisectSettings` (embedded).

---

## 6. Data architecture

### 6.1 Primary store: `browser.storage.local` (typed via WXT)

| Item | Storage key | Type | Fallback |
|---|---|---|---|
| `enabledItem` (`utils/storage.ts:7`) | `local:enabled` | `boolean` | `true` |
| `interactionCountItem` | `local:interactionCount` | `number` | `0` |
| `settingsItem` | `local:settings` | `BisectSettings` | `BISECT_SETTINGS_DEFAULTS` (`batchSize: 1`, `enabledExtensions: []`) |

No `sync:`/`session:` items, no schema versioning, no migrations. Unit tests run against `fakeBrowser` (in-memory); E2E runs against real browser storage.

### 6.2 DOM contract (host pages)

| Attribute | Writer | Values | Readers |
|---|---|---|---|
| `data-ext-bisect-state` | `content.ts` `renderMarker` | `enabled` \| `disabled` | E2E harness (`waitForAttribute`), `getContentMarker` message |
| `data-ext-bisect-tab-id` | `content.ts` `publishTestTabId` (test builds only) | tab id string | Firefox E2E popup targeting (`?tabId=`) |

Attribute-name constants live in `utils/content-marker.ts` and are duplicated in `tests/e2e/harness.mjs` (`DEBT-2026-001`).

### 6.3 Build and artifact layout

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
| `entrypoints/background.ts` | Registers the five message handlers; attaches `[EXT_BG_ERR]` logging in test builds; resolves per-tab content status. |
| `entrypoints/content.ts` | Renders the DOM marker from stored state, keeps it live via `enabledItem.watch`, answers `getContentMarker`, publishes the tab-id marker in test builds. |
| `entrypoints/popup/App.vue` | Single-component popup: loads state on mount, sends `updateState`/`recordInteraction`, exposes the batch-size input, renders errors. |
| `utils/storage.ts` | The three typed storage items plus pure helpers (`createNextSettings`, `formatStatus`, `incrementInteractionCount`). |
| `utils/messaging.ts` | `ProtocolMap` (the entire message surface) and the shared `messenger`. |
| `utils/state.ts` | `readState` / `applyStateUpdate` / `recordInteraction` — shared by background handlers and unit tests. |
| `utils/content-marker.ts` | Marker attribute-name constants shared by the content script (and duplicated in the harness). |
| `utils/test-mode.ts` | `isTestMode()` gate over the `__EXT_TEST_MODE__` define and `readTabIdParam()` for `?tabId=`. |

### 7.1 Configuration

| Config | Source | Default / notes |
|---|---|---|
| Manifest | `wxt.config.ts` manifest callback | `permissions: [storage, tabs]`, `host_permissions: [<all_urls>]`; `browser_specific_settings.gecko.id` on Firefox builds only |
| Test mode | `EXT_TEST_MODE=1` env ──► Vite `define __EXT_TEST_MODE__` | `false`; `build:prod:*` strips all test hooks |
| Unit tests | `vitest.config.ts` | `vue()` plugin registered manually; `WxtVitest()`; `happy-dom`; `restoreMocks`/`clearMocks` |
| Lint/format | `biome.json` | scoped to `entrypoints/`, `utils/`, `tests/`, `scripts/`, root `*.ts`/`*.json` |

---

## 8. Messaging surface (ProtocolMap contract)

All extension IPC goes through `defineExtensionMessaging<ProtocolMap>` (`utils/messaging.ts`); there is no raw `runtime.sendMessage` anywhere.

| Message | Payload | Returns | Direction |
|---|---|---|---|
| `getState` | — | `ExtensionState` | popup ──► background |
| `updateState` | `Partial<BisectSettings> & { enabled?: boolean }` | `ExtensionState` | popup ──► background |
| `recordInteraction` | — | `ExtensionState` | popup ──► background |
| `getContentStatus` | `targetTabId?: number` | `ContentStatus` | (no sender today — `DEBT-2026-002`) |
| `getContentMarker` | — | `string \| null` | background ──► content script (tab-scoped send) |
| `getTabId` | — | `number \| null` | content script ──► background |

---

## 9. Cross-cutting concerns

### 9.1 Error handling

The popup catches every message rejection into `errorMessage` (rendered as `[data-testid="error"]`). `readContentStatus` fails soft: a messaging failure yields `{active: false, marker: null}`. No retries anywhere.

### 9.2 Concurrency and consistency

Single-writer rule: only background handlers write storage. `busy` disables popup buttons during in-flight updates; storage `watch` events are the fan-out to content scripts. `applyStateUpdate` merges onto freshly read state (last write wins).

### 9.3 Logging and observability

The background logs `[EXT_BG_READY]` at startup (the Chrome E2E gate waits for it) and `[EXT_BG_ERR]` on `error`/`unhandledrejection` in test builds only. The harness recorder keeps at most 200 entries per category, filters benign `favicon.ico` noise, and `collectErrors` derives the four error budgets asserted at the end of each E2E run.

### 9.4 Test-mode gating

`isTestMode()` compiles to `false` when `EXT_TEST_MODE` is not `1`: `?tabId=` handling, the tab-id DOM marker, and error logging disappear from production builds ([ADR-007](DECISIONS.md)).

### 9.5 Platform behavior

Chrome MV3 service worker vs Firefox MV2 background, and Puppeteer CDP vs WebDriver BiDi divergences (navigation, URL reporting, extension install, popup opening) are isolated inside `tests/e2e/harness.mjs`; the quirks are recorded in [NOTES.md](NOTES.md).

---

## 10. Extension points

| Extension | Mechanism | Rules |
|---|---|---|
| New message | extend `ProtocolMap` (`utils/messaging.ts`) + handler in `background.ts` | keep payload types in `utils/messaging.ts`/`utils/storage.ts`; cover in both unit tests and `verify.mjs` steps |
| New persisted item | `storage.defineItem` in `utils/storage.ts` | `local:` area, fallback required |
| New UI surface | WXT entrypoint under `entrypoints/` | plain CSS with tokens; `data-testid` on meaningful nodes; host-injected UI must use `createShadowRootUi` with `cssInjectionMode: 'ui'` |
| New E2E step | append to `runScenario` in `tests/e2e/verify.mjs` | stay browser-agnostic or branch on `browserName` |

---

## 11. Install and launch architecture

```text
wxt build (npm run build:chrome | build:firefox | build:prod:*)
    ├──► .output/chrome-mv3   (MV3: background service worker)
    └──► .output/firefox-mv2  (MV2: background script + gecko id)

E2E install (tests/e2e/harness.mjs):
  Chrome:  launch({ enableExtensions: true, pipe: true,
                    args: ['--enable-unsafe-extension-debugging'] })
           ──► browser.installExtension(extPath)
  Firefox: extraPrefsFirefox({ 'xpinstall.signatures.required': false,
                    'extensions.webextensions.uuids': { [geckoId]: FIXED_FIREFOX_UUID } })
           ──► installExtension(extPath) (asserted to return geckoId)

Manual dev: npm run dev / npm run dev:firefox (WXT dev server)
```

---

## 12. Testing architecture

### 12.1 Test isolation

Unit tests call `fakeBrowser.reset()` per test; popup tests stub the background by registering the same handlers through `installMessagingBridge()` (`tests/unit/helpers/messaging-bridge.ts`), which adapts `fakeBrowser`'s `sendMessage` to the promise-returning protocol `@webext-core/messaging` expects. E2E uses a fresh fixture server bound to `127.0.0.1:0` and a fresh browser profile per browser; `.agent-artifacts/` is wiped at the start of every verify run.

### 12.2 Test layers

| Layer | Files | What it covers |
|---|---|---|
| Unit (Vitest + `WxtVitest` + `fakeBrowser`) | `tests/unit/storage.test.ts` | storage fallbacks, persistence, watch notifications, pure helpers |
| Unit (messaging round-trips) | `tests/unit/messaging.test.ts` | `readState`/`applyStateUpdate`/`recordInteraction`; message round-trips mutate storage |
| Component (`@vue/test-utils` + `happy-dom`) | `tests/unit/popup.test.ts` | popup renders stored state; toggle/record/batch-size flows via messaging |
| E2E (Puppeteer; Chrome CDP + Firefox BiDi) | `tests/e2e/verify.mjs` | marker injection + default value, popup render/toggle/record/persist/batch-size, storage──►marker propagation, zero error budgets on both browsers |

### 12.3 Quality gates

```bash
npm run lint && npm run typecheck && npm run test:unit   # fast inner loop
npm run agent:verify                                     # full gate: lint, typecheck, unit, build:all, E2E both browsers
```

The completion gate is `npm run agent:verify` exiting 0 with zero `pageErrors` and zero `[EXT_BG_ERR]` entries across both browsers.

---

## 13. Maintaining this document

Update this file in the same change whenever runtime topology, messaging contracts, storage schema, DOM contract, build/install flow, or test architecture changes (rules in the maintenance guide above). Rationale belongs in [DECISIONS.md](DECISIONS.md), defects in [ISSUES.md](ISSUES.md), debt in [TECH_DEBT.md](TECH_DEBT.md), operational quirks in [NOTES.md](NOTES.md), and terms in [GLOSSARY.md](GLOSSARY.md).

