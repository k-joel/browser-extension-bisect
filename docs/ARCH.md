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

Browser Extension Bisect is a WXT-built browser extension whose product goal is to find faulty installed extensions by binary search (toggling batches of extensions and observing the result). The v1 system is complete: a side panel UI that renders the capability report and the candidate picker, the pre-flight consent screen, the all-off baseline question, the host-issue abort, the `N = 1` resolution, the half-split partition loop with its trial screen and inline trial summary, the culprit-left-disabled completion, the inconclusive outcome with its ambiguity set, the session history with its copyable log and report, diagnostic replay of a corrected log copy, drift detection with pause/re-sync/undo, toggle-failure escalation and greylist recovery, mid-session extension and test-tab changes, startup reconciliation with multi-panel convergence, and Restore; the Firefox assisted rail, which asks the user to apply each batch in the Add-ons Manager and withholds the verdict until `management.getAll()` proves the batch; a pure platform-neutral bisect engine; a typed storage and messaging layer with a versioned bisect config and an append-only bisect log; two `ManagementPort` adapters that enumerate and filter installed extensions; and a fully automated cross-browser verification harness. The side panel is the only product UI — the scaffold popup and content script are deleted (ADR-012).

| In scope | Out of scope |
|---|---|
| One TypeScript codebase targeting Chrome (MV3) and Firefox (MV2) via WXT | Firefox MV3 output (pinned to MV2 — [ADR-002](DECISIONS.md)) |
| Side panel/sidebar candidate picker: capability report, display-name search, include/exclude selection, ineligible reasons | An automated DOM oracle that decides verdicts without a human ([ADR-014](DECISIONS.md)) |
| Pre-flight consent, the automated all-off baseline, the baseline verdict, host-issue abort, `N = 1` resolution, and Restore | Multi-culprit isolation and `ddmin` ([ADR-015](DECISIONS.md)) |
| The Firefox assisted rail: the manual all-off baseline, the assisted trial batch with its two checklists, event-driven verification, and a restore that stays pending until it matches or the user accepts | Injected host-page panels (no `createShadowRootUi` UI — there is no content script) |
| The automated Chrome partition loop to a culprit or an inconclusive result, with retry and an inline trial summary | A correction that rewrites the live log (replay edits a copy only — [ADR-011](DECISIONS.md)) |
| The session history screen with the baseline, every trial, retries and the outcome, plus copyable log JSON and a human-readable report | Applying a replayed result to installed extensions (replay never toggles) |
| Diagnostic replay of an edited log copy: the culprit or ambiguity set, the recomputed trials, and the recorded batches that disagree | — |
| Drift pause with re-sync, live undo, toggle-failure and escalation handling, mid-session snapshot changes, and startup reconciliation | CSS frameworks and UI component libraries |
| `ManagementPort` enumeration with one shared eligibility filter and ordering helper, plus the automated apply/restore path and the assisted manual batch/verify/restore path | Delta debugging (`ddmin`) — out of v1 ([ADR-015](DECISIONS.md)) |
| Automated verification (Vitest unit + Puppeteer E2E on both browsers), locally and in CI | Telemetry, analytics, remote code |
| Plain hand-written CSS over a token layer ([ADR-005](DECISIONS.md)) | — |

### 1.1 Screens

The panel is a single document whose screen is derived by `resolveScreen(session, preflightOpen, historyOpen, replayOpen)`
(`entrypoints/sidepanel/presentation.ts`), so a reload re-derives the same screen from the log.

| Screen | When | Primary action |
|---|---|---|
| `picker` | No session, pre-flight closed | "Review N candidates" → pre-flight |
| `preflight` | Pre-flight open, no session | "Start baseline" (disabled with `N = 0` or without automatic toggling) |
| `baseline` | Session `awaiting-verdict` with an unrecorded `round: 0` trial | "Problem persists" / "Problem is gone" |
| `trial` | Session `awaiting-verdict` with suspects left: the next partition, or the applied batch awaiting a verdict | "Apply trial N", then "Problem persists" / "Problem is gone", plus Retry |
| `completed` | Session `completed` with a culprit (includes `N = 1`) | Restore |
| `inconclusive` | Session `inconclusive` | Restore all extensions |
| `host-issue` | Session `aborted` with `abortReason: host-issue` | "Restore all extensions" |
| `aborted` | Session `aborted` without a host-issue reason: a declined abort | "Restore all extensions" |
| `history` | Any live session with the history open (from the trial, completed, or inconclusive screen) | "Copy the bisect log" / "Copy the report" |
| `replay` | Any live session with replay open (from the history, completed, or inconclusive screen) | "Correct trial N", then "Replay the corrected copy" |
| `restored` | Session `restored` | Restore again |
| `snapshot-change` | Session `paused` with a `removed` or `updated` change | "Restore and stop" / "Restart with a fresh snapshot" |
| `toggle-failure` | Session `paused` with a per-extension toggle error | "Enable with click" (gesture failures), "Restore all extensions" |
| `paused` | Session `paused` on drift | Re-sync / Undo last verdict / Restore all |
| `progress` | Any other transient live state (`trial`/`applying`/`paused`) | — |
| `loading` / `error` | Panel load in flight or failed | — |

Restore (`RestorePanel.vue`) renders outside the screen switch, so it is present on the picker
and on every session screen; its button is disabled until the session has touched something.

---

## 2. Runtime topology

### 2.1 Extension runtime

```text
sidepanel.html (Vue 3 page, the only product surface)
    │  messenger.sendMessage
    │  getCapabilities/listCandidates/getConfig/updateConfig/
    │  getSession/startSession/applyTrial/submitVerdict/retryTrial/
    │  resetSession/bindTestTab/reloadTestTab/getLog/replayLog/
    │  getDrift/recordEscalationResult/declineEscalation/restartSession/
    │  confirmManualState/recordExternalBaseline/verifyRestore/
    │  acceptRestore/openAddonManager/getStartupReconciliation/
    │  resumeSession/resyncSession/undoLastVerdict
    ▼
background.ts (message handlers, sole writer, owns the ManagementPort and the tabs surface)
    │  storage.defineItem ──► browser.storage.local      │ browser.management  │ browser.tabs
    ▼                                                     ▼                     ▼
storage.local (bisectConfig | bisectLog | bisectStartupSignal | bisectTestDriver)
    │                                                                          installed extensions
    └──► side panel (re-renders from message round-trips + getSession on mount)
```

| Context | Lifecycle model | Owns |
|---|---|---|
| `background.ts` (`defineBackground`) | Chrome: MV3 service worker · Firefox: MV2 background context | All message handlers; the only writer of `local:bisectConfig` and `local:bisectLog`; the `ManagementPort` instance; the `TestTabSurface` (`tabs.reload` + settle poll); legacy-key cleanup; `sidePanel.setPanelBehavior` on Chrome |
| `entrypoints/sidepanel/App.vue` | Chrome side panel / Firefox sidebar document; loads on mount | UI refs (`state`, `capability`, `eligible`, `ineligible`, `config`, `session`, `query`, `errorMessage`, `busy`, `preflightOpen`, `restoreOutcome`, `reloadMessage`, `historyOpen`, `historyLog`, `copyStatus`, `replayOpen`, `replaySource`, `replayEdits`, `replayResult`, `replayCopyStatus`) |

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

### 3.2 Baseline and session writes

```text
side panel "Start baseline"
   ──► messenger.sendMessage('startSession', { candidateIds, baselineMode, testTab })
   ──► background ──► startSession() (utils/bisect/session.ts), serialized on the session queue
         append 'session-started' (candidate snapshot, capability, baselineMode, testTab) ──► write log
         append 'trial-started' round 0, target = every candidate disabled
         port.applyTargetState(target)  (chrome-port: diff vs getAll, sequential setEnabled)
         append 'trial-applied' with the per-id errors
         tabs.reload(testTab.tabId) then poll tabs.get(id).status until 'complete' or the timeout
   ──► returns SessionView ──► panel renders the baseline question
   ──► on a toggle failure the session appends 'session-reset' after restoring the touched ids
```

### 3.2.1 Partition loop writes

```text
panel "Apply trial N"
   ──► messenger.sendMessage('applyTrial')
   ──► background ──► applyTrial() serialized on the session queue
         nextTrialTarget(view): partitionSuspects(suspects) + every cleared id enabled
         append 'trial-started' { round, enabledIds, disabledIds } ──► write log
         port.applyTargetState(target) ──► append 'trial-applied' { round, errors }
         tabs.reload + settle poll
   ──► panel "Problem persists" / "Problem is gone"
   ──► messenger.sendMessage('submitVerdict', { verdict })
         append 'verdict-recorded' ──► the reducer narrows the suspect pool
         settleOutcome appends 'session-completed' { culpritId } or
         'session-inconclusive' { ambiguityIds, reason }
   ──► on a contradiction the session stops with the ambiguity set; it never blames a suspect

panel "Retry this trial"
   ──► messenger.sendMessage('retryTrial', { reason? })
         append 'trial-retried' { round } ──► re-apply the same targetState
         ──► append 'trial-applied' { round, errors }   (no verdict is recorded)
```

1. `submitVerdict` does not apply the next partition; `applyTrial` owns that, so the panel decides
   when a batch is applied and the serialized queue keeps the log consistent between the two.
2. `round` is `max(rounds) + 1`, so a retry cannot collide with an existing round.
3. The engine (`utils/bisect/engine.ts`) is the single decision point for the suspect-set update and
   the completion/inconclusive outcome; the reducer only feeds it the recorded events.

**Mid-session changes.** The snapshot in `session-started` is the seed both the live search and
every replay partition from, so no browser change may rewrite it:

```text
management onInstalled / onUninstalled
   ──► background watcher ──► snapshotChanges(session-started.candidateOrder, port.listInstalled())
         installed  ──► warning beside the unchanged snapshot, no pause, nothing written
         updated    ──► recordSnapshotPause: 'session-paused' { reason: 'snapshot-changed', changes }
         removed    ──► recordSnapshotPause (same event, the change kind is the difference)
   ──► the next applyTrial / submitVerdict / retryTrial re-derives the same comparison, writes the
       pause if the watcher has not, and refuses the command so the stale trial is not answered

panel "Restart with a fresh snapshot"
   ──► messenger.sendMessage('restartSession')
         restore the touched candidates ──► read the browser fresh ──► new session-started
```

The comparison is a report, never a merge: `snapshot.ts` reads the snapshot and the browser and
returns changes, and there is no code path from a change back into `candidateOrder`. An install is
therefore visible to the user and invisible to the search, and a removal keeps the id in
`originalEnabledIds` so restore still knows it existed. `readSessionView` decorates the reduced view
with the live comparison on every read, because the install warning must not grow the append-only
log.

### 3.2.2 Baseline session state

1. The log is the only session state; `reduceLog` derives every view, so a panel reload or a
   terminated service worker re-derives the same screen from `getSession` (ADR-011).
2. Every session command runs on the module promise queue in `session.ts`, so two panels cannot
   interleave read-modify-write on the log.
3. `submitVerdict` records `baseline-recorded`; `persists` restores the touched candidates and
   appends `session-reset`, `gone` leaves the session `awaiting-verdict` (or `completed` for
   `N = 1`). `resetSession` is the explicit Restore and reports per-extension errors.

### 3.3 Session history, replay, drift, and mid-session writes

The history, replay, drift and mid-session paths do not introduce a second writer. `getLog` and
`replayLog` only read, `undoLastVerdict`/`resyncSession`/`recordEscalationResult`/
`declineEscalation`/`restartSession` append through the same `session.ts` queue as `applyTrial`,
and `recordSnapshotPause` re-reads the log through that queue before appending `session-paused`, so
a background-driven pause can never interleave with a panel command.

---

## 4. Primary read paths

### 4.1 Side panel load (candidate picker and session screen)

1. `App.vue` `onMounted` ──► `load()` issues `getCapabilities`, `listCandidates`, `getConfig`, and `getSession` in parallel.
2. `getCapabilities` ──► `ManagementPort.getCapabilities()` ──► `management.getSelf()`; the adapter reports `canAutoToggle` (`true` on Chrome, `installType === "admin"` on Firefox) and its `sideSurface`.
3. `listCandidates` ──► `ManagementPort.listCandidates()` ──► `management.getAll()` + `getSelf()`, filtered by the shared `partitionCandidates` helper. Eligibility is intrinsic only; user exclusions live in the config ([ADR-016](DECISIONS.md)).
4. The panel builds picker rows with `buildPickerRows(eligible, excludedIds)`, which marks excluded candidates as unchecked rows, then renders both lists plus the live-region count. The "Not eligible" section renders `ineligible` as-is — every entry there is an extension the user cannot act on.
5. `getSession` ──► `reduceLog(await readBisectLog())`; `resolveScreen` then picks `baseline`, `host-issue`, `completed`, `restored`, `progress`, or the picker, so a panel reload or a restarted worker lands back on the same screen. Nothing is toggled by a read.
6. `getStartupReconciliation` ──► `reconcileStartup(deps)`, which derives the view, compares it with `getAll()`, and reports the offer without writing anything. The panel renders it above the screen only when `restarted` is true and `offers` is non-empty, so a live session is never interrupted. See [4.1.3](#413-startup-reconciliation-and-multi-panel-convergence).

### 4.1.1 History and copy (read-only)

1. Opening the history sends `getLog` and stores the returned `BisectLog` in `historyLog`; `buildHistory(session, historyLog)` then derives the baseline-first `HistoryModel`. The panel re-uses the session view it already holds, so the history and the trial screen cannot disagree.
2. Both copy actions re-send `getLog` rather than reusing the ref, so the text written is the log as it is persisted at that moment. Copy log writes `serializeBisectLog(log)`; copy report writes `renderBisectReport(buildHistory(session, log))`.
3. `copyText` (`clipboard.ts`) tries `navigator.clipboard.writeText`, then `document.execCommand('copy')` over a temporary textarea, and reports `manual` when both fail; the panel then shows `CopyStatus` with a readonly textarea holding the same text. Nothing is written to the log or the config by any of this.

### 4.1.2 Replay (read-only, pure computation)

1. Opening replay sends `getLog` and stores the returned `BisectLog` in `replaySource`. That single read is the whole input; the panel never re-reads while editing.
2. "Correct trial N" toggles the verdict for that round in `replayEdits`, a plain `Record<number, Verdict>` in panel state. `replayRounds(source, edits)` renders the recorded and copied verdicts side by side. Nothing is written to storage, so the live log stays append-only and a reload of the panel discards the edits.
3. "Replay the corrected copy" builds a **fresh plain object** with `applyReplayEdits(source, { ...edits })` — an explicit unwrap so no Vue proxy ever crosses the messaging boundary ([lesson 17](NOTES.md)) — and sends `replayLog`. The handler in `background.ts` calls `replayLog(log)` from `utils/bisect/replay.ts` directly: no queue entry, no write.
4. `replayLog` validates the session start and the candidate order, then recomputes the baseline and every partition from the verdict sequence alone, reusing `engine.ts` (`nextOutcome`, `narrowSuspects`, `clearedOf`) so a replayed search cannot partition or conclude differently from a live one. The recorded `trial-started` sets are only diffed into `batchDifferences`; they are never authoritative. The first structurally invalid event short-circuits into `validationError`.
5. The result renders the culprit or the ambiguity set, the recomputed trials, every recorded batch that disagrees, and — for an invalid copy — the first invalid event. "Copy the replay report" renders `buildReplayReportModel` through the ISS-007 `renderBisectReport` renderer with a replay header naming the differing batches, then writes through the same `copyText` chain.

### 4.1.3 Startup reconciliation and multi-panel convergence

1. `runtime.onStartup` fires only for a real browser start (never for a service-worker revival), so `recordBrowserStart()` stores a small signal naming the session id and event count it saw. Reconciliation itself is derived on demand: `getStartupReconciliation` ──► `reconcileStartup(deps)`.
2. `reconcileStartup` derives the view from the log, compares it with `getAll()`, and returns `{ restarted, offers, drift }` without writing anything. An in-flight session offers `['resume', 'restore']`; a session whose restore is still pending offers `['restore']`; a session with nothing outstanding offers `[]`. A signal that does not match the current log is stale and `restarted` is false, so a worker that merely woke up never interrupts the user.
3. The panel shows the offer above the screen only when `restarted` is true and `offers` is non-empty. Dismissing hides it for that panel only, so the user cannot lose the only way back to a browser whose extensions are still disabled.
4. **Multi-panel convergence needs no broadcast.** Every panel calls `getSession` on load and then `watchBisectLog`; each successful background mutation writes the log, the storage watch fires in every panel, and `convergeOnPersistedLog()` re-reads the derived view. Panels therefore converge through the log itself, which is the canonical state ([ADR-011](DECISIONS.md)). The panel that took the action already holds the returned view and only refreshes its log-backed screens.
5. A rejected storage write propagates: no log write means no watch event, the command rejects, and the panel shows `sidepanel-error` with the previous log untouched.

### 4.2 E2E read path

The harness navigates directly to `sidepanel.html` and reads `data-testid` nodes via `readCandidateState`; it never uses extension-internal messaging. Three reads bypass the DOM deliberately, because no rendered node can prove the claim: `readSnapshotCandidateIds` reads the persisted `session-started` candidate order (the snapshot must not move), `readBoundTestTab` reads `local:bisectConfig.testTab` after the preflight screen that displayed it is gone, and `focusTestTab` reads the active tab id from the panel with `tabs.query`/`tabs.getCurrent` (neither needs a permission; the retired content script used to publish that id through a `data-ext-bisect-tab-id` marker).

---

## 5. Domain model

The full type surface lives in `utils/bisect/domain.ts` and is owned by ISS-002; later slices fill in behaviour without reshaping it.

| Entity | Identity | Key attributes |
|---|---|---|
| **CandidateExtension** | browser extension id | `name`, `version`, `enabledAtStart`, `mayDisable`, `installType`, `type`, `icons` |
| **IneligibleExtension** | browser extension id | `reason`: `theme-or-app` \| `disabled-at-start` \| `policy-locked` \| `self` (intrinsic only; user exclusions stay in the config) |
| **CapabilityReport** | derived per runtime | `browserName`, `canAutoToggle`, `selfInstallType`, `sideSurface` |
| **BisectConfig** | `local:bisectConfig` | `schemaVersion: 1`, `excludedExtensionIds`, `testTab: { tabId, url } \| null` |
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
| `bisectLogItem` (`utils/bisect/events.ts`) | `local:bisectLog` | `BisectLog` | `null` |
| `startupSignalItem` (`utils/bisect/startup.ts`) | `local:bisectStartupSignal` | `{ sessionId, eventCount }` | `null` |
| `testDriverOverlay` (`utils/bisect/test-driver.ts`, test builds only) | `local:bisectTestDriver` | `{ enabledById, toggleErrors }` | absent |

`deleteLegacyStorageKeys()` runs once from the background startup path and removes the three scaffold keys (`local:enabled`, `local:interactionCount`, `local:settings`) that no longer have an item definition; there is no migration for placeholder values (ADR-012). `local:bisectLog` is append-only during a live session and capped at 500 events, which fails closed rather than dropping audit data. Unit tests run against `fakeBrowser` (in-memory); E2E runs against real browser storage.

### 6.2 Host-page DOM contract

There is none. The `<all_urls>` content script, the `data-ext-bisect-state` marker and the test-only `data-ext-bisect-tab-id` marker were deleted with the scaffold (ADR-012); the add-on never runs in a page context, which is what lets it ship with no host permissions.

### 6.3 Side panel selector contract

Every meaningful node carries a stable `data-testid` (ADR-005). `sidepanel-root` also carries
`data-screen` (the derived screen name) so a test can assert the screen without counting nodes.

| Selector | Node |
|---|---|
| `sidepanel-root` | `<main>`, carries `data-state` = `loading` \| `ready` \| `error` and `data-screen` |
| `sidepanel-live` | `aria-live="polite"` announcement (screen-dependent) |
| `sidepanel-loading`, `sidepanel-error` | loading status and `role="alert"` error |
| `no-session`, `culprit-warning` | no-session screen and the culprit-stays-disabled note |
| `capability-report`, `capability-browser`, `capability-toggle-mode`, `capability-surface`, `capability-install-type` | capability report |
| `candidate-picker`, `candidate-search`, `picker-start`, `picker-blocked`, `picker-mode-note` | picker section, search input, entry to pre-flight, block reason, and the mode note |
| `candidate-list`, `candidate-row` (`data-extension-id`, `data-selected`), `candidate-checkbox`, `candidate-name`, `candidate-version`, `candidate-initials`, `candidate-reason` | selectable rows (one per `eligible` candidate; `candidate-reason` reads "Excluded by you" when the id is in the config) |
| `eligible-empty`, `search-empty` | empty states |
| `ineligible-section`, `ineligible-list`, `ineligible-row` (`data-reason`), `ineligible-initials`, `ineligible-name`, `ineligible-version`, `ineligible-reason` | intrinsically ineligible extensions only |
| `preflight`, `preflight-count`, `preflight-candidates`, `preflight-candidate` (`data-extension-id`), `preflight-candidate-name`, `preflight-candidate-version`, `preflight-mode`, `preflight-culprit-note` | consent screen: exactly the candidates the baseline will disable, and the policy copy |
| `preflight-test-tab`, `preflight-test-tab-label`, `preflight-test-tab-warning`, `preflight-bind`, `preflight-blocked`, `preflight-start`, `preflight-cancel` | test-tab binding and the explicit start |
| `baseline-screen`, `baseline-question`, `baseline-detail`, `verdict-persists`, `verdict-gone`, `baseline-reload`, `baseline-reload-status` | baseline question with the exact verdict labels |
| `trial-screen`, `trial-progress`, `trial-question`, `trial-plan`, `trial-plan-enabled`, `trial-plan-disabled`, `trial-apply` | the planned next partition |
| `trial-applied-state`, `trial-enabled`, `trial-disabled`, `trial-retry`, `trial-retry-note`, `trial-reload`, `trial-reload-status`, `trial-ambiguity` | the applied batch and its verdict actions (`verdict-persists` / `verdict-gone` are shared with the baseline screen) |
| `trial-history`, `trial-history-list`, `trial-history-row` (`data-round`), `trial-history-round`, `trial-history-enabled`, `trial-history-disabled`, `trial-history-verdict` | inline trial summary |
| `trial-undo-verdict` (`data-eligible`), `trial-undo-blocked`, `trial-undo-note` | the undo action on the plan screen, its disabled reason, and its note |
| `trial-history-open` | entry to the session history from the trial screen |
| `history-screen`, `history-session-id`, `history-candidates`, `history-baseline-mode`, `history-list` | session history header |
| `history-entry` (`data-round`, `data-kind` = `baseline` \| `trial`), `history-entry-round`, `history-entry-enabled`, `history-entry-disabled`, `history-entry-verdict`, `history-entry-retry` (`data-retries`), `history-entry-note`, `history-entry-baseline` | one history row per baseline check and per trial, in round order |
| `history-outcome` (`data-outcome` = `culprit` \| `inconclusive` \| `aborted` \| `restored` \| `in-progress`), `history-outcome-label`, `history-outcome-names`, `history-outcome-name`, `history-outcome-note` | the session outcome |
| `history-copy-log`, `history-copy-report`, `history-back`, `history-replay`, `history-replay-note` | the two copy actions, the back action, and the entry to replay |
| `replay-screen`, `replay-diagnostic-notice`, `replay-source-note`, `replay-empty`, `replay-rounds`, `replay-round` (`data-round`, `data-corrected`), `replay-round-label`, `replay-round-original`, `replay-round-edited`, `replay-correct-N`, `replay-correction-count`, `replay-run`, `replay-reset-edits`, `replay-back` | the replay editor: the recorded verdict and the copied one per round, the correction actions, and the diagnostic notice |
| `replay-result` (`data-outcome` = `culprit` \| `inconclusive` \| `invalid`), `replay-outcome`, `replay-trials-count`, `replay-trials`, `replay-trial` (`data-round`), `replay-trial-round`, `replay-trial-enabled`, `replay-trial-disabled` | the replay result and its recomputed trials |
| `replay-differences-status` (`data-differences` = `none` \| `present`), `replay-differences`, `replay-difference` (`data-round`), `replay-difference-label`, `replay-difference-enabled`, `replay-difference-disabled`, `replay-difference-recomputed-enabled`, `replay-difference-recomputed-disabled` | the recorded batches that disagree with the verdicts |
| `replay-invalid-message`, `replay-invalid-event`, `replay-invalid-note`, `replay-copy-report` | the invalid-copy error path and the copy action |
| `copy-status` (`data-status` = `copied` \| `error` \| `idle`), `copy-status-message`, `copy-fallback`, `copy-fallback-text` | the `aria-live="polite"` copy result and the selectable-text fallback |
| `completed-history`, `completed-replay`, `completed-replay-note`, `inconclusive-history`, `inconclusive-replay`, `inconclusive-replay-note` | the terminal screens' links to the history and to replay |
| `inconclusive-screen`, `inconclusive-reason`, `inconclusive-explanation`, `inconclusive-ambiguity-label`, `inconclusive-ambiguity`, `inconclusive-ambiguity-entry`, `inconclusive-ambiguity-name`, `inconclusive-restore`, `inconclusive-restore-summary` | inconclusive outcome with the ambiguity set |
| `host-issue-screen`, `host-issue-explanation`, `host-issue-guidance`, `host-issue-restore`, `host-issue-restore-summary` | host-issue abort |
| `aborted-screen`, `aborted-explanation`, `aborted-guidance`, `aborted-restore`, `aborted-restore-summary` | the state a declined abort lands in |
| `abort-panel`, `abort-session`, `abort-note`, `abort-question`, `abort-detail`, `abort-restore` (`data-default="true"`), `abort-leave`, `abort-cancel` | the abort action on every live session screen and, once pressed, its "Restore all extensions?" question |
| `new-session` (`data-blocked`), `new-session-policy`, `new-session-note`, `new-session-start` | the way out of a finished session, rendered by the completed, inconclusive, host-issue, aborted and restored screens |
| `completed-screen`, `culprit-name`, `culprit-detail`, `completed-restore`, `completed-restore-summary` | completed state, including the `N = 1` resolution |
| `restored-screen` (`data-complete`), `restored-explanation`, `restored-summary` (`data-complete`), `restored-detail`, `restored-leftovers`, `restored-leftover` (`data-extension-id`, `data-kind`), `restored-leftover-name`, `restored-leftover-kind`, `restored-leftover-state`, `restored-next-step`, `restored-restore` | restored audit state and the extensions still left over |
| `session-progress`, `progress-status`, `progress-count`, `progress-trial`, `progress-enabled`, `progress-disabled`, `progress-note` | interim in-session screen |
| `restore-panel`, `restore-policy`, `restore-summary` (`data-complete`), `restore-button`, `restore-failures`, `restore-failure` (`data-extension-id`, `data-code`), `restore-failure-name`, `restore-failure-code`, `restore-failure-guidance`, `restore-failure-message`, `restore-manager-url` | Restore, present on every screen |
| `snapshot-change`, `snapshot-change-cause`, `snapshot-change-note`, `snapshot-change-rows`, `snapshot-change-row` (`data-extension-id`, `data-kind`), `snapshot-change-name`, `snapshot-change-kind`, `snapshot-change-detail`, `snapshot-change-actions`, `snapshot-change-restore`, `snapshot-change-restart`, `snapshot-change-restart-note`, `snapshot-change-no-decision` | the mid-session change pause and its restore-or-restart choice |
| `snapshot-warning` (`data-count`, `aria-live="polite"`), `snapshot-warning-headline`, `snapshot-warning-row` (`data-extension-id`, `data-kind`), `snapshot-warning-name`, `snapshot-warning-kind`, `snapshot-warning-detail`, `snapshot-warning-dismiss` | the install-only warning banner, rendered above whatever screen shows |
| `startup-reconciliation` (`data-restarted`, `data-status`, `aria-live="polite"`), `startup-reconciliation-headline`, `startup-reconciliation-detail`, `startup-reconciliation-difference` (`data-differs`), `startup-reconciliation-actions`, `startup-resume`, `startup-restore`, `startup-dismiss` | the restart offer shown above whatever screen is open |
| `paused-screen`, `paused-cause`, `paused-trial`, `paused-no-comparison`, `paused-actions`, `paused-resync`, `paused-undo` (`data-eligible`), `paused-undo-blocked`, `paused-undo-note`, `paused-restore` | the paused-on-drift screen and its recovery actions |
| `drift-comparison`, `drift-row` (`data-extension-id`, `data-differs`), `drift-row-name`, `drift-row-state`, `drift-categories`, `drift-category-<pending\|unexpected\|missing>` (`data-category`, `data-count`), `drift-category-label`, `drift-category-detail`, `drift-category-entry` (`data-extension-id`), `drift-category-name`, `drift-category-none` | the expected-versus-actual comparison and the per-category drift groups |
| `toggle-failure`, `toggle-failure-explanation`, `toggle-failure-rows`, `toggle-failure-row` (`data-extension-id`, `data-code`), `toggle-failure-name`, `toggle-failure-code`, `toggle-failure-guidance`, `toggle-failure-message`, `toggle-failure-manager` (`data-manager-url`), `toggle-failure-restore` | the toggle-failure pause and its per-extension errors |
| `escalation-actions` (`data-extension-id`), `escalation-enable`, `escalation-note`, `escalation-decline`, `manual-recovery-note`, `manual-recovery-url` | the gesture-bound escalation and the manual-recovery guidance |
| `assisted-baseline`, `assisted-explanation`, `assisted-external`, `assisted-external-instruction`, `assisted-attest`, `assisted-manual`, `assisted-manual-instruction`, `assisted-open-addons`, `assisted-verify`, `assisted-addons-message`, `assisted-progress` (`aria-live="polite"`), `assisted-checklist`, `assisted-checklist-row` (`data-extension-id`, `data-state`), `assisted-checklist-name`, `assisted-checklist-target`, `assisted-checklist-done` (`data-done`), `assisted-copy`, `assisted-reload`, `assisted-restore-note` | the assisted all-off baseline: attestation, manual checklist and progress |
| `assisted-trial`, `assisted-trial-explanation`, `assisted-trial-instruction`, `assisted-trial-open-addons`, `assisted-trial-verify`, `assisted-trial-addons-message`, `assisted-trial-progress` (`data-matched`, `aria-live="polite"`), `assisted-trial-enable-list`, `assisted-trial-enable-row` (`data-extension-id`), `assisted-trial-enable-name`, `assisted-trial-enable-state` (`data-done`), `assisted-trial-disable-list`, `assisted-trial-disable-row` (`data-extension-id`), `assisted-trial-disable-name`, `assisted-trial-disable-state` (`data-done`), `assisted-trial-copy`, `assisted-trial-reload`, `assisted-trial-verdict-note` | the assisted trial batch: the two checklists, the matched progress and the gated verdict note |
| `assisted-restore`, `assisted-restore-policy`, `assisted-restore-summary` (`data-complete`), `assisted-restore-errors`, `assisted-restore-checklist`, `assisted-restore-row` (`data-extension-id`, `data-done`), `assisted-restore-name`, `assisted-restore-state`, `assisted-restore-open-addons`, `assisted-restore-verify`, `assisted-restore-accept`, `assisted-restore-accepted` | the assisted restore checklist and the explicit accept |
| `test-tab-prompt` (`data-kind` = `closed` \| `unsettled`, `data-tab-id`), `test-tab-prompt-headline`, `test-tab-prompt-detail`, `test-tab-prompt-action`, `test-tab-prompt-verdict-note` | the rebind / manual-reload hint inside the trial screen |

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
| `entrypoints/background.ts` | Registers the 27 product message handlers, builds the platform `ManagementPort` and the `tabs` test-tab surface, delegates every session command to `utils/bisect/session.ts`, computes `replayLog` inline because it writes nothing, deletes legacy keys at startup, attaches `[EXT_BG_ERR]` logging in test builds, and opens the Chrome side panel from the toolbar action. |
| `entrypoints/sidepanel/App.vue` | Side panel shell and router: loads capability/candidates/config/session, derives the active screen with `resolveScreen`, owns search query, busy and error state, sends every session command, renders the live region and the always-visible Restore panel. |
| `entrypoints/sidepanel/components/CapabilityReport.vue` | Renders `browserName`, toggle mode wording, surface, and install type. |
| `entrypoints/sidepanel/components/CandidatePicker.vue` | Search input, filtered rows, empty states, the ineligible list, and the "Review N candidates" entry to pre-flight. |
| `entrypoints/sidepanel/components/CandidateRow.vue` | Selectable row: checkbox, initials, name, version, exclusion reason. |
| `entrypoints/sidepanel/components/IneligibleList.vue` | "Not eligible" list with a reason chip per entry. |
| `entrypoints/sidepanel/components/NoSession.vue` | No-session screen and the culprit-left-disabled note. |
| `entrypoints/sidepanel/components/PreflightConsent.vue` | Consent screen: the exact candidates the baseline will disable, the culprit/restore policy, the test-tab binding and rebind, and the explicit "Start baseline" action. |
| `entrypoints/sidepanel/components/BaselineScreen.vue` | The baseline question with the labels "Problem persists"/"Problem is gone" plus a manual test-tab reload. |
| `entrypoints/sidepanel/components/TrialScreen.vue` | The partition trial in both of its states: plan the next partition ("Apply trial N"), or answer the applied batch with the exact verdict labels, Retry, and a test-tab reload. The applied state also renders the rebind prompt or the manual-reload hint the recorded `test-tab` outcome asks for, beside the verdict buttons and never in place of them. |
| `entrypoints/sidepanel/components/DriftScreen.vue` | The paused-on-drift screen: the cause, one row per candidate with its expected-versus-actual state (`formatSyncState`), one entry per drift category (`drift-category-<pending\|unexpected\|missing>` with `data-count` and the affected names), and the three recovery actions Re-sync, Undo last verdict (disabled with its reason when `undoEligibilityOf` refuses) and Restore all. |
| `entrypoints/sidepanel/components/ToggleFailurePanel.vue` | The pause a refused toggle or a refused escalation opened: one row per failed id with the mapped `ToggleErrorCode`, the browser's own message and the recovery its code asks for, the extension manager named when that is the only fix, and — for a `needs-user-gesture` failure — the single "Enable with click" escalation beside a decline that ends in a restore. |
| `entrypoints/sidepanel/components/StartupReconciliation.vue` | The offer a browser restart raises above whatever screen shows: whether the browser restarted, the headline and the resume/restore wording (`describeStartupOffer`), the browser-versus-log difference (`describeStartupDifference`), Resume, Restore and a per-panel Dismiss. |
| `entrypoints/sidepanel/components/AbortPanel.vue` | SPEC §Error handling `User aborts`: the "Stop this session" action on every live session screen and, once pressed, the "Restore all extensions?" question with the restore answer marked `data-default="true"` and primary, the keep-them-as-they-are answer, and a cancel back to the session. |
| `entrypoints/sidepanel/components/AbortedScreen.vue` | The state a declined abort lands in: says the extensions the session changed are still where the session left them, offers Restore, and carries the new-session action in its blocked form. |
| `entrypoints/sidepanel/components/NewSessionAction.vue` | The way out of a finished session: the policy note, the reason the action is held back when a restore is still owed, and the Start over / Start a new session button. Rendered by the completed, inconclusive, host-issue, aborted and restored screens. |
| `entrypoints/sidepanel/components/TestTabPrompt.vue` | The closed-tab rebind and the unsettled-tab manual-reload hint: headline, detail, one action, and the note that the verdict can still be answered. |
| `entrypoints/sidepanel/components/SnapshotChangeScreen.vue` | The mid-session change pause: one row per change with its kind and detail, and the Restore-or-Restart choice. An install-only pause renders no choice, because nothing about the search changed. |
| `entrypoints/sidepanel/components/SnapshotWarning.vue` | The install-only warning banner, rendered above whatever screen is showing: an `aria-live` region listing each change and a dismiss action, so a warning is visible without being written down. |
| `entrypoints/sidepanel/components/AssistedTrial.vue` | The assisted partition batch: separate "keep on" and "turn off" checklists, an Open Add-ons Manager action with a copyable fallback, "n of m matched" progress, and Verify. It renders no verdict button: the panel reaches `awaiting-verdict` only after the background proved the batch. |
| `entrypoints/sidepanel/components/AssistedBaseline.vue` | The assisted all-off baseline: Troubleshoot-Mode attestation, the manual disable-all checklist with Add-ons Manager and Verify, "n of m done" progress, and a test-tab reload. |
| `entrypoints/sidepanel/components/AssistedRestore.vue` | The assisted restore checklist: every touched candidate with its original state, Verify, and an explicit "Accept the remaining differences" that is only offered while something remains. |
| `entrypoints/sidepanel/components/TrialHistory.vue` | Inline trial summary shown on the trial screen: every answered round with its enabled batch, disabled batch, and verdict. |
| `entrypoints/sidepanel/components/HistoryScreen.vue` | The session history: the baseline check first, then every trial in round order with its enabled and disabled batches, verdict, retry marker, and the outcome block; plus the two copy actions, the back action and the entry to replay. |
| `entrypoints/sidepanel/components/ReplayScreen.vue` | The replay editor and its result: the diagnostic notice, one row per recorded verdict with the copied verdict beside it, the correction and discard actions, then the culprit or ambiguity set, the recomputed trials, the recorded batches that disagree, the first invalid event for a broken copy, and the copy-report action. |
| `entrypoints/sidepanel/replay.ts` | Pure replay UI layer: `recordedVerdicts`, `replayRounds`, `correctionCount`, `toggleEdit`, `applyReplayEdits` (builds the plain corrected copy), `buildReplayReportModel`, `renderReplayReport`. No browser APIs, so it is unit-tested directly. |
| `entrypoints/sidepanel/components/CopyStatus.vue` | The `aria-live` copy result: a confirmation on success, an error plus a selectable textarea when the clipboard is unavailable. |
| `entrypoints/sidepanel/history.ts` | Pure history/report layer: `buildHistory(view, log)` derives the `HistoryModel` (baseline first, trials in round order, retry counts from `trial-retried`, outcome from the session view and the last `session-reset`), `renderBisectReport(model)` renders the human-readable summary, and `serializeBisectLog(log)` renders the copy-log JSON. No browser APIs, so it is unit-tested directly. |
| `entrypoints/sidepanel/clipboard.ts` | `copyText` writes through `navigator.clipboard`, falls back to `execCommand` over a temporary textarea, and reports `manual` when both fail so the caller can reveal the selectable textarea. |
| `entrypoints/sidepanel/components/InconclusiveScreen.vue` | Inconclusive outcome: the reason and the ambiguity set, with Restore, and links to the history and to replay. |
| `entrypoints/sidepanel/components/HostIssueScreen.vue` | Abort screen for a persisting baseline: explains that no extension is implicated and offers Restore. |
| `entrypoints/sidepanel/components/CompletedScreen.vue` | Completed state: names the culprit (also the `N = 1` resolution), states it is still disabled, and links to the history and to replay. |
| `entrypoints/sidepanel/components/RestoredScreen.vue` | Post-restore audit state with the restore summary and a repeat action. |
| `entrypoints/sidepanel/components/SessionProgress.vue` | Transient in-session screen (`trial`/`applying`/`paused` before the question is answerable): status, progress and the current batch. |
| `entrypoints/sidepanel/components/RestorePanel.vue` | Restore, rendered on every screen: policy note, per-extension failures, and a button disabled until a session has touched something. |
| `entrypoints/sidepanel/presentation.ts` | Pure UI helpers: reason labels, mode wording, initials, search matching, row building and ordering, screen resolution, test-tab and progress wording, restore summarization. |
| `entrypoints/sidepanel/style.css` | Token layer (light/dark via `light-dark()`) and side panel layout. |
| `utils/bisect/domain.ts` | The complete owned type surface: entities, events, results, error codes, `ManagementPort`. |
| `utils/bisect/engine.ts` | Pure platform-neutral search: `partitionSuspects`, `buildTargetState`, `narrowSuspects`, `clearedOf`, `estimateTrials`/`worstCaseTrials`, `nextOutcome` (completion vs inconclusive with the ambiguity set), `SESSION_TRANSITIONS`/`canTransition`. The disabled half is the tail of the pool so an odd pool's extra candidate is enabled ([ADR-018](DECISIONS.md)). No browser APIs, so it is unit-tested directly. |
| `utils/bisect/config.ts` | `local:bisectConfig` item, normalization, serialized `updateBisectConfig`, watcher, legacy-key deletion. |
| `utils/bisect/events.ts` | `local:bisectLog` item, normalization, `appendEvent` with the 500-event cap, and the pure `reduceLog` reducer that derives `SessionView` (it delegates the suspect-set update and the outcome decision to `engine.ts`). |
| `utils/bisect/replay.ts` | The pure replay function: `replayLog(log)` validates the session start and candidate order, recomputes the baseline and every partition from the verdict sequence through `engine.ts`, diffs the recomputed batches against the recorded ones into `batchDifferences`, and returns the culprit or ambiguity set plus the first `validationError`. It never toggles and never mutates its input. No browser APIs, so it is unit-tested directly. |
| `utils/bisect/session.ts` | Session orchestration: `startSession`, `getSession`, `readSessionView`, `applyTrial`, `retryTrial`, `submitVerdict`, `resetSession`, `resyncSession`, `undoLastVerdict`, `recordEscalationResult`, `declineEscalation`, `restartSession`, `bindTestTab`, `reloadTestTab`, `verifyManualState`, `confirmManualState`, `recordExternalBaseline`, `verifyRestore`, `acceptRestore`, `createManualStateWatcher`, `createSnapshotWatcher`, `recordSnapshotPause`, all serialized on one promise queue over the log. `nextTrialTarget` derives the batch from the reducer's suspect pool; `settleOutcome` appends the terminal audit event; `reloadAfterApply` records only the actionable test-tab outcomes. `SessionDependencies` injects the port, the `TestTabSurface`, the clock and the session-id factory. |
| `utils/bisect/snapshot.ts` | The pure snapshot comparison: `snapshotChanges(snapshot, installed)` reports `installed`/`updated`/`removed` against the immutable `session-started` order, `isPausingChange`/`pausingChanges` split the warning case from the invalidating ones, and `describeSnapshotChanges` renders the wording. Nothing here can write to the snapshot. |
| `utils/bisect/management-port.ts` | Injectable `ManagementSurface`, the shared eligibility filter (intrinsic reasons only) and ordering helper, the shared apply/verify/restore implementations, and `isManualBatch`. |
| `utils/bisect/chrome-port.ts` | Automated adapter: `canAutoToggle: true`, `sideSurface: 'side-panel'`. |
| `utils/bisect/firefox-port.ts` | Assisted adapter: `canAutoToggle` only for `installType === 'admin'`, `sideSurface: 'sidebar'`. Below that threshold `applyTargetState` returns a `ManualBatch` residual diff, `verifyState` splits a mismatch into pending vs unexpected, `restore` returns a manual checklist, and `watchEvents` debounces `onEnabled`/`onDisabled` into one re-verify signal. |
| `utils/bisect/startup.ts` | `local:bisectStartupSignal` item, `raiseStartupSignal` (records the session id and event count a real browser start saw), and `readStartupSignal`; reconciliation itself is derived, never stored. |
| `utils/bisect/manual-state.ts` | The assisted-progress publisher (ISS-020): the `local:bisectManualState` item holding `{ sessionId, round, drift, at }`, `normalizeManualState`, `readManualState`/`writeManualState`/`clearManualState`, and `watchManualState`. A *report*, never state — the expected map comes from the log's own trial and the actual one from `management.getAll()` — so it is a cache the panel converges on rather than a second source of truth. `background.ts` is its only writer, from the debounced watcher it owns. |
| `utils/bisect/test-driver.ts` | Test builds only: the storage-backed `ManagementSurface` overlay (`enabledById`, `toggleErrors`) merged into the adapter's `getAll`/`setEnabled`, the `__extBisectTestDriver` page global, and `withTestDriverOverlay`. Never referenced by a production code path. |
| `utils/messaging.ts` | `ProtocolMap` (the entire message surface) and the shared `messenger`. |
| `utils/test-mode.ts` | `isTestMode()` gate over the `__EXT_TEST_MODE__` define, plus `TEST_MODE_ENABLED` so a call site can be a foldable ternary. |

### 7.1 Configuration

| Config | Source | Default / notes |
|---|---|---|
| Manifest | `wxt.config.ts` manifest callback | `permissions: ['storage', 'management']` (WXT adds Chrome's `sidePanel` from the sidepanel entrypoint, so the effective Chrome list is exactly `storage`, `management`, `sidePanel`); no `host_permissions`, no `tabs`; `browser_specific_settings.gecko.{id, data_collection_permissions}` on Firefox builds only (`required: ['none']` — the add-on transmits no data); `action.default_title` on Chrome only |
| Side panel manifest slot | `entrypoints/sidepanel/index.html` `<meta name="manifest.type" content="sidepanel">` | WXT emits `side_panel.default_path` + the `sidePanel` permission on Chrome MV3 and `sidebar_action.default_panel` on Firefox |
| Panel metadata | `<meta name="manifest.default_title">`, `<meta name="manifest.default_icon">` | `Extension Bisect` and `public/icon/{16,32,48,128}.png` |
| Toolbar action | `background.ts` `openPanelOnActionClick()` | Chrome only: `sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`, so the action opens the panel now that no popup exists |
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
| `getSession` | — | `SessionView \| null` | side panel ──► background |
| `getStartupReconciliation` | — | `StartupReconciliation \| null` | side panel ──► background (pure: writes nothing) |
| `resumeSession` | — | `SessionMutationResult` | side panel ──► background |
| `getLog` | — | `BisectLog \| null` | side panel ──► background |
| `replayLog` | `{ log }` | `ReplayResult` | side panel ──► background (pure: writes nothing) |
| `startSession` | `{ candidateIds, baselineMode, testTab }` | `SessionView` | side panel ──► background |
| `applyTrial` | — | `SessionView` | side panel ──► background |
| `submitVerdict` | `{ verdict }` | `SessionMutationResult` | side panel ──► background |
| `retryTrial` | `{ reason? }` | `SessionMutationResult` | side panel ──► background |
| `resetSession` | `{ restore: boolean }` | `SessionMutationResult` | side panel ──► background |
| `abortSession` | `{ restore: boolean }` | `SessionMutationResult` | side panel ──► background |
| `startNewSession` | — | `SessionView \| null` | side panel ──► background |
| `resyncSession` | — | `SessionMutationResult` | side panel ──► background |
| `undoLastVerdict` | — | `SessionMutationResult` | side panel ──► background |
| `recordEscalationResult` | `{ extensionId, ok, error? }` | `SessionMutationResult` | side panel ──► background |
| `declineEscalation` | — | `SessionMutationResult` | side panel ──► background |
| `restartSession` | — | `SessionMutationResult` | side panel ──► background |
| `bindTestTab` | `{ tabId? }` | `BisectConfig` | side panel ──► background |
| `reloadTestTab` | — | `{ ok, error? }` | side panel ──► background |
| `getDrift` | — | `DriftReport` | side panel ──► background |
| `confirmManualState` | — | `SessionView` | side panel ──► background |
| `recordExternalBaseline` | — | `SessionView` | side panel ──► background |
| `verifyRestore` | — | `RestoreResult` | side panel ──► background |
| `acceptRestore` | — | `SessionView` | side panel ──► background |
| `openAddonManager` | — | `AddonManagerResult` | side panel ──► background |

`SessionMutationResult` is `{ session: SessionView; restore: { restored, errors, manualIds, declined } | null }`.
The `restore` envelope carries the outcome of the `session-reset` event the command appended, if it
appended one: `SessionView` has no restore errors, so without it the panel could not distinguish a
complete restore from a partial one (SPEC §Restore). `declined` is the abort answer: `true` means the
user chose to keep the extensions as the session left them, which is a decision rather than a
failure, and neither the panel nor `restorePending` may read it as a restore.

`bindTestTab` takes only an optional tab id — the panel never sends a URL because the add-on
cannot see one without the `tabs` permission; the background resolves the active tab when the
id is omitted ([ADR-017](DECISIONS.md)).

The surface is complete: the original seventeen spec messages plus the startup-reconciliation pair
(`getStartupReconciliation`, `resumeSession`), the drift/undo pair (`resyncSession`,
`undoLastVerdict`), the assisted-rail five (`getDrift`, `confirmManualState`,
`recordExternalBaseline`, `verifyRestore`, `acceptRestore`), the mid-session pair
(`restartSession`, `declineEscalation`) and the two ways out of a session: `abortSession` for a live
one and `startNewSession` for a finished one. The scaffold messages (`getState`, `updateState`,
`recordInteraction`, `getContentStatus`, `getContentMarker`, `getTabId`) were deleted with the popup
and content script (ADR-012).

`abortSession` is the SPEC §Error handling `User aborts` row. It refuses a session that already
reached a terminal audit state. With `restore: true` it runs the ordinary restore and reports what it
actually managed; with `restore: false` it re-enables nothing and appends
`session-reset { restored: false, declined: true }`, which lands the session on `aborted` and leaves
`restorePending` true.

`startNewSession` replaces a terminal session's log with an empty one, which is the only route from a
finished session back to the picker. It deliberately toggles nothing, so it is refused while a restore
is still pending: the replacement log starts from "every candidate is enabled" and nothing else would
re-enable what the old session left off.

`getLog` is a read, not a write: it enters the same serialized queue as the mutating commands so
a copy taken while a verdict is being recorded sees either the old log or the new one, and it
returns the persisted `BisectLog` unchanged. The history screen, the copy actions and the replay
screen consume it; the panel never derives the log from a Vue ref, so the copy is always exactly
what is stored.

`replayLog` is pure: it takes the caller's copy, computes, and returns. It deliberately bypasses the
serialized queue, because it reads nothing and writes nothing, and the live log is therefore
untouchable by a replay.

The assisted rail needs five commands that have no automated counterpart. `getDrift` and
`confirmManualState` are the verify pair: the first is a read used for the progress counter and
the second is the gate that appends `session-resumed`. `recordExternalBaseline` records the
Troubleshoot-Mode attestation. `verifyRestore` and `acceptRestore` split "check the checklist" from
"record that the user accepts what is left" — only the latter appends `session-reset`, and it keeps
`restored: false` when differences remain so the audit never claims a restore that did not happen.

---

## 9. Cross-cutting concerns

### 9.1 Error handling

The side panel catches every message rejection into `errorMessage` (`role="alert"`, `data-testid="sidepanel-error"`), so a failing `management.getAll` shows a readable message instead of an empty picker; on a load failure it also flips `data-state` to `error`. A rejected command after load keeps the last good screen and shows the alert, so a failed Restore never silently reverts the UI. `reloadTestTab` returns `{ ok: false, error }` rather than throwing, and a baseline that never settles still asks for the verdict. A baseline that `persists` aborts as a host issue rather than blaming an extension. A contradiction in the search — an empty suspect set or a final confirmation that still shows the symptom — ends `inconclusive` with the ambiguity set and a reason, never a silent blame ([ADR-015](DECISIONS.md)). `applyTrial` rejects a terminal session with `SessionError`, and `retryTrial` rejects a session with no open partition trial. A candidate removed or re-versioned under the session pauses it and refuses the command that would have answered the stale trial; the pause is written before the throw, so the refusal rehydrates into the `snapshot-change` screen rather than a bare error string (same pattern as the drift pause, see 9.2). No retries anywhere.

**Test tab.** The reload is best-effort by construction: `tabs.reload` needs no permission, so a tab the user closed rejects and the session treats that as a hint, not a failure. `reloadAndSettle` classifies the attempt into `reloaded` / `unsettled` / `closed` / `unbound`, `reloadAfterApply` writes the two actionable outcomes onto the batch's own `trial-applied` as `testTab`, and the panel turns them into a rebind prompt or a manual-reload hint beside the verdict buttons. The verdict path never consults the test tab, which is what guarantees neither case can block an answer.

### 9.2 Concurrency and consistency

Single-writer rules: only background handlers write storage, and only `updateBisectConfig` writes
the config and only `utils/bisect/session.ts` writes the log. Both serialize read-modify-write on
a module-level promise queue, so concurrent `updateConfig` messages cannot lose a field and
concurrent session commands cannot lose an event. `reduceLog` is pure, so every reader derives the
same view from the same log. Storage `watch` events are the fan-out to the open panels.

### 9.3 Logging and observability

The background logs `[EXT_BG_READY]` at startup (the Chrome E2E gate waits for it) and `[EXT_BG_ERR]` on `error`/`unhandledrejection` in test builds only. The harness recorder keeps at most 200 entries per category, filters benign `favicon.ico` noise, and `collectErrors` derives the four error budgets asserted at the end of each E2E run.

### 9.4 Test-mode gating

`isTestMode()` compiles to `false` when `EXT_TEST_MODE` is not `1`, so `[EXT_BG_ERR]` logging and the assisted Firefox test-mode driver disappear from production builds ([ADR-007](DECISIONS.md)). The only test hooks left are that error-logging contract, the `[EXT_BG_READY]` startup line, and the `utils/bisect/test-driver.ts` overlay the assisted E2E drives.

### 9.5 Platform behavior

Chrome MV3 service worker vs Firefox MV2 background, and Puppeteer CDP vs WebDriver BiDi divergences (navigation, URL reporting, extension install, side panel opening) are isolated inside `tests/e2e/harness.mjs`; the quirks are recorded in [NOTES.md](NOTES.md). `management.setEnabled` works from a Chrome extension page but is rejected for Firefox extensions that are not policy-installed, which is why the adapters split into automated and assisted.

---

## 10. Extension points

| Extension | Mechanism | Rules |
|---|---|---|
| New message | extend `ProtocolMap` (`utils/messaging.ts`) + handler in `background.ts` | keep payload types in `utils/bisect/domain.ts`; cover in unit tests and `verify.mjs` steps |
| New persisted item | `storage.defineItem` in `utils/bisect/config.ts` (or a new `utils/bisect/*` module) | `local:` area, fallback required, versioned shape |
| Port behaviour | extend the method in `utils/bisect/management-port.ts` (shared) or in `utils/bisect/chrome-port.ts` / `firefox-port.ts` (platform-specific) | keep `domain.ts` signatures stable; reuse the shared filter/ordering helpers |
| New UI surface | WXT entrypoint under `entrypoints/` | plain CSS with tokens; `data-testid` on meaningful nodes; host-injected UI must use `createShadowRootUi` with `cssInjectionMode: 'ui'` |
| New E2E step | append to the scenario runner in `tests/e2e/verify.mjs` | stay browser-agnostic or branch on `browserName`; keep CDP-only calls inside `harness.mjs` |
| New E2E scenario | add a `run<Name>Scenario` in `tests/e2e/verify.mjs`, register it in `SCENARIOS` and dispatch it in `runScenarioForBrowser` | the default Chrome run must execute every scenario; `--scenario=<name>` runs one; make every `waitFor` target an unambiguous screen state |
| New fixture extension | add a directory under `tests/e2e/fixtures/extensions/<browser>/` and register it in `fixtures/fixtures.mjs` | per-browser manifests; Firefox fixtures need a `browser_specific_settings.gecko.id` |

---

## 11. Install and launch architecture

```text
wxt build (npm run build:chrome | build:firefox | build:prod:*)
    ├──► .output/chrome-mv3   (MV3: background service worker, side_panel, action that opens the panel)
    │      permissions: storage, management, sidePanel; no host_permissions
    └──► .output/firefox-mv2  (MV2: background script + gecko id + data_collection_permissions + sidebar_action)
           permissions: storage, management

E2E install (tests/e2e/harness.mjs):
  Chrome:  launch({ enableExtensions: true, pipe: true,
                    args: ['--enable-unsafe-extension-debugging'] })
           ──► browser.installExtension(extPath)
           ──► browser.installExtension(<each fixture>)   (installFixtures)
  Firefox: launch({ env: { MOZ_REMOTE_ALLOW_SYSTEM_ACCESS: '1' },
                    extraPrefsFirefox({ 'xpinstall.signatures.required': false,
                    'extensions.webextensions.uuids': { [geckoId]: FIXED_FIREFOX_UUID } }) })
           ──► installExtension(extPath) (asserted to return geckoId)
           ──► installExtension(<each fixture>)

  Firefox 160+ gates BiDi navigation to the privileged `moz-extension:` scheme behind
  `RemoteAgent.allowSystemAccess`, which only the environment variable above sets; without
  it the panel never leaves `about:blank` (NOTES.md §e2e-harness).

Surface opening:
  openSurface() ──► Chrome:  chrome-extension://<id>/sidepanel.html
               └──► Firefox: moz-extension://<uuid>/sidepanel.html  (gotoExtensionPage)

  gotoExtensionPage()/reloadExtensionPage() choose `waitUntil` from `page.browser().protocol`
  (`domcontentloaded` over CDP, `commit` over WebDriver BiDi) — never by probing `commit`
  with a reload, which fires the navigation before it validates and leaves an ERR_ABORTED.

Test tab id:
  focusTestTab() ──► panel page evaluates tabs.query({active:true}) + tabs.getCurrent()
                     (no `tabs` permission needed; only url/title are gated)

Manual dev: npm run dev / npm run dev:firefox (WXT dev server)
```

---

## 12. Testing architecture

### 12.1 Test isolation

Unit tests call `fakeBrowser.reset()` per test; component and messaging tests register the real background handlers through `registerBackgroundHandlers({ managementPort })` and route sends through `installMessagingBridge()` (`tests/unit/helpers/messaging-bridge.ts`). `fakeBrowser` has no `management` API, so adapter tests inject a fake management surface (`tests/unit/helpers/fake-management.ts`). E2E uses a fresh fixture server bound to `127.0.0.1:0` and a fresh browser profile per browser; `.agent-artifacts/` is wiped at the start of every verify run.

### 12.2 Test layers

| Layer | Files | What it covers |
|---|---|---|
| Unit (domain surface) | `tests/unit/bisect-domain.test.ts` | the owned type surface: 12 event types, 11 session statuses, 5 reasons, 5 error codes, nullable `testTab.url`, 7-method port |
| Unit (config) | `tests/unit/bisect-config.test.ts` | fallback, normalization, serialized persistence, watcher, legacy-key deletion |
| Unit (eligibility) | `tests/unit/candidate-eligibility.test.ts` | every exclusion reason, reason precedence, deterministic name-then-id ordering |
| Unit (adapters) | `tests/unit/management-adapters.test.ts` | both adapters against the fake surface: listing, capability report, the `watchEvents` subscription; plus the enterprise-policy contract that makes Chrome and an `admin` Firefox install behave identically (automated diff, per-id errors, automated restore) |
| Unit (Chrome toggling) | `tests/unit/chrome-port-toggling.test.ts` | the automated rail's per-id behaviour: the sequential `setEnabled` diff against `getAll()` and that it skips an id already in the target state, its `ToggleResult` on a partial failure, the drift comparison it returns from `verifyState`, and the restore diff that only touches ids whose state differs |
| Unit (error mapping) | `tests/unit/management-error-mapping.test.ts` | `mapToggleError` for every documented pattern and its precedence — a greylisted extension is refused "for policy" too, so the specific cause must win — plus a non-`Error` rejection, reachability of all five codes, the mapping reaching the adapters' `ToggleResult`/`RestoreResult`, the greylisted restore that never claims success, and `rollbackTarget` inverting only what the failed apply moved |
| Unit (Firefox assisted adapter) | `tests/unit/firefox-port-assisted.test.ts` | the manual batch residual diff, pending-vs-unexpected verification, missing ids, the debounced `onEnabled`/`onDisabled` signal, the assisted restore checklist, and the `admin` routing |
| Unit (assisted sessions) | `tests/unit/bisect-assisted-session.test.ts` | the manual baseline and its gated transition, the assisted trial batch contents, the gated move to `awaiting-verdict`, the watcher's debounce, suspect-shrink parity with the automated flow, the whole assisted loop to a known culprit, restore-pending and explicit accept, and `admin` routing |
| Unit (messaging) | `tests/unit/bisect-messaging.test.ts` | `getCapabilities`/`listCandidates`/`getConfig`/`updateConfig` round-trips, exclusion→reason propagation, concurrent updates, startup cleanup; plus the session surface: `getSession`, `startSession`, `applyTrial`, `submitVerdict`, `resetSession`, `bindTestTab`, `reloadTestTab`, and the `SessionMutationResult` restore envelope |
| Unit (engine) | `tests/unit/bisect-engine.test.ts` | the pure search: the mandated `N = 24` worked example batch for batch (culprit #8) and the #7 variant that needs a sixth trial, `N = 2`, `N = 3`, partition and step counts, cleared-stays-enabled, both contradictions, and the documented transition table |
| Unit (event log / reducer) | `tests/unit/bisect-events.test.ts` | the 12 event types, the `reduceLog` derivation of every status, the baseline/host-issue/`N = 1` outcomes, the 500-event cap |
| Unit (session orchestration) | `tests/unit/bisect-session.test.ts` | `startSession` consent and eligibility, the baseline outcomes, the full partition loop against a fake port (culprit found, sixth trial, culprit left disabled), retry, inconclusive, restore and its partial failures, rehydration, serialization, test-tab bind/reload/settle |
| Component (`@vue/test-utils` + `happy-dom`) | `tests/unit/sidepanel.test.ts` | loading, ready, error, no-session, capability report, rows, initials, empty states, ineligible reasons, search filtering, live region, persistence across remount |
| Component (session screens) | `tests/unit/sidepanel-session.test.ts` | pre-flight consent, the baseline question and its exact labels, the trial screen (plan, exact labels, progress string, retry), the inline trial history, host-issue abort, culprit-left-disabled completion including the final confirmation, inconclusive with the ambiguity set, `N = 1` resolution, Restore including a failing re-enable, and rehydration after a panel reopen — all mounted with the real background handlers and the fake management port |
| Unit (presentation) | `tests/unit/sidepanel-presentation.test.ts` | reason labels, mode wording, initials, search matching, row building/ordering, assisted screen routing, history screen routing, and the assisted checklists |
| Unit (history/report) | `tests/unit/sidepanel-history.test.ts` | baseline-first ordering, per-entry batches and exact verdict labels, per-round retry counts, every outcome kind including the external baseline without a recorded round, report renderer purity, and log serialization |
| Unit (replay) | `tests/unit/bisect-replay.test.ts` | the `N = 24` trace replaying to the recorded culprit batch for batch, a corrected verdict changing the outcome, the recorded batches being ignored as authoritative (tampered and nonexistent ids still replay), the `batchDifferences` against the recorded log, `validationError` for eleven invalid-copy shapes with the first invalid event, an unfinished copy, the contradiction, the host-issue abort, the `N = 1` baseline, and the input log never being mutated |
| Component (replay) | `tests/unit/sidepanel-replay.test.ts` | reachability from the completed, inconclusive and history screens, the diagnostic notice, the recorded/copied verdict pair, the edit leaving the persisted log byte-identical, the replayed culprit and ambiguity set, the recomputed trials, the marked batch differences, the invalid-copy error path, the copied replay report and its clipboard fallback |
| Component (history and copy) | `tests/unit/sidepanel-history-screen.test.ts` | the clipboard fallback chain, history ordering/content/retry markers, the outcome block, copy log against the persisted log, copy report against the rendered summary, the `aria-live` confirmation, the error state with the selectable textarea, and the links from the completed and inconclusive screens |
| Component (assisted screens) | `tests/unit/sidepanel-assisted.test.ts` | assisted mode detection, the manual baseline checklist with a gated verify, the assisted trial screen (two checklists, "n of m matched", Open Add-ons Manager and its failure fallback, verdict buttons absent before verification and present after), the whole assisted loop, and restore-pending with the explicit accept |
| Unit (test-mode driver) | `tests/unit/test-driver.test.ts` | the storage overlay's `getAll`/`setEnabled` merge, the armed toggle error and its clearing, the driver global, and the production no-op |
| Unit (startup) | `tests/unit/bisect-startup.test.ts` | the stored start signal, the derived resume/restore offers, a stale signal, and the offer never writing |
| Unit (drift, toggle failures, undo) | `tests/unit/bisect-drift.test.ts`, `bisect-drift-session.test.ts`, `bisect-toggle-failure.test.ts`, `bisect-undo.test.ts` | verifyState split into pending/unexpected, the pause that refuses a command, re-sync, the mapped error codes and rollback, escalation and decline, and reopening the last answered trial |
| Unit (storage failure) | `tests/unit/bisect-storage-failure.test.ts` | a rejected log write failing the command and leaving the previous log intact |
| Unit (mid-session changes) | `tests/unit/bisect-snapshot.test.ts` | the pure snapshot diff for install/update/removal; an install warning that leaves the suspects, cleared pool and candidate order untouched and never pauses; an update and a removal that pause through `session-paused` with `snapshot-changed`; a removal that records no verdict for the dead trial and keeps the snapshot for restore; the watcher reporting only the pausing kinds; `recordSnapshotPause` refusing a second pause; and `restartSession` restoring first and re-reading the browser |
| Unit (test tab) | `tests/unit/bisect-test-tab.test.ts` | a closed tab and an unsettled tab recorded on the trial, a verdict accepted in both cases, the hint surviving a remount, the search continuing and completing afterwards, retry re-recording the hint, and an ordinary reload recording nothing |
| Component (mid-session change and test tab) | `tests/unit/sidepanel-snapshot-change.test.ts` | the rebind prompt and the manual-reload hint beside live verdict buttons, the snapshot-change screen with restore/restart and its install-only no-decision state, the warning banner as a dismissable live region, the removal routing through the real background handlers, the restart writing a new session, and the install warning appearing without a pause |
| Component (drift and escalation) | `tests/unit/sidepanel-drift.test.ts`, `sidepanel-escalation.test.ts` | the paused screen with expected-vs-actual rows and categories, re-sync and the blocked undo, the gesture-bound "Enable with click" calling `management` itself, the mapped error panel, and the declined escalation ending in a restore |
| Component (startup, multi-panel, storage failure) | `tests/unit/sidepanel-startup.test.ts`, `sidepanel-multi-panel.test.ts`, `sidepanel-storage-failure.test.ts` | the resume/restore offer above the screen, two panels converging on one log, and a rejected write surfacing `sidepanel-error` with the previous log intact |
| Unit + component (user abort) | `tests/unit/bisect-abort.test.ts` | SPEC §Error handling `User aborts`, both answers: yes runs the restore and records what it managed, no re-enables nothing and records `declined: true`, the decision survives a reopen, `restorePending` stays true so a new session stays blocked, and the panel asks the question with the restore marked as the default before either answer |
| Unit + component (new session) | `tests/unit/bisect-new-session.test.ts` | `startNewSession` refusing a live session and a pending restore, replacing the log from a terminal one while toggling nothing, and the terminal screens offering the action blocked-then-unblocked until a restore lands on the picker with a fresh log |
| E2E (Puppeteer; Chrome CDP + Firefox BiDi) | `tests/e2e/verify.mjs` | Chrome runs seven scenarios: `candidate-picker` (candidate list, search, exclusion persistence), `session-baseline` (pre-flight, all-off baseline, non-candidates untouched, test-tab reload, `gone` advance to the first trial, `persists` host-issue abort, Restore of only touched ids, then the abort action in both of its answers: cancel, "no" landing on the aborted screen with the touched extensions untouched and `session-reset { declined: true }` in the log, and "yes" restoring them), `partition-loop` (the harness is the human oracle: full search to the known fixture culprit, including the final confirmation trial, culprit left disabled, cleared candidate enabled, non-candidates untouched, the new-session action blocked while the restore is pending and unblocked after it, a click on it landing on the picker with a new empty log and a second session that records exactly one `session-started` and reaches its own baseline, the session history with the ordered baseline and trials, both copy actions, diagnostic replay of one corrected verdict with the new culprit and the differing recorded batch, the persisted log and the extension states unchanged across the replay, Restore re-enabling the culprit), `drift` (a fixture toggled behind the panel, the pause, re-sync, undo, and a restore that re-enables only touched candidates), `toggle-failure` (policy-blocked, gesture escalation, declined escalation and greylist recovery across three sessions), `startup-convergence` (a recorded restart, the resume offer, the resumption, and two live panels converging), and `mid-session-changes` (the bound tab is closed, the applied trial records `testTab: { status: "closed" }`, the trial screen shows the rebind prompt with the verdict buttons live, the verdict reaches the log with no tab, a real `uninstallExtension` then pauses the session through `snapshot-changed` with one `removed` row, records no verdict for the dead trial, leaves the persisted snapshot identical, and a restart writes one `session-started` whose order is the surviving candidate alone). Firefox runs four: `candidate-picker`, `assisted-baseline` and `assisted-external` (all reporting a `firefoxPath`), and `assisted-trials`, which runs the assisted loop to the known culprit through the driver, asserting the verdict buttons are absent before each Verify and present after, and that the culprit is left disabled. |

### 12.3 Quality gates

```bash
npm run lint && npm run typecheck && npm run test:unit   # fast inner loop
npm run agent:verify                                     # full gate: lint, typecheck, unit, build:all, E2E both browsers
```

The completion gate is `npm run agent:verify` exiting 0 with zero `pageErrors` and zero `[EXT_BG_ERR]` entries across both browsers. CI (`.github/workflows/ci.yml`) runs that same gate on Ubuntu for every push and pull request, after installing the puppeteer-pinned Chrome and Firefox with `npx puppeteer browsers install chrome --install-deps` / `firefox --install-deps`.

---

## 13. Maintaining this document

Update this file in the same change whenever runtime topology, messaging contracts, storage schema, DOM contract, build/install flow, or test architecture changes (rules in the maintenance guide above). Rationale belongs in [DECISIONS.md](DECISIONS.md), defects in [ISSUES.md](ISSUES.md), debt in [TECH_DEBT.md](TECH_DEBT.md), operational quirks in [NOTES.md](NOTES.md), and terms in [GLOSSARY.md](GLOSSARY.md).

