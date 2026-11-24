# Browser Extension Bisect — Technical Design

**Status**: Accepted design; implementation not started
**Date**: 2026-11-24
**Audience**: Implementers, reviewers, and future agent sessions
**Related**: [`ARCH.md`](ARCH.md) (as-built), [`DECISIONS.md`](DECISIONS.md) (ADR-008..ADR-015), [`GLOSSARY.md`](GLOSSARY.md), [`ISSUES.md`](ISSUES.md) (`ISS-001`)

> This is a **target design**, not an as-built description. The repository still
> contains the scaffold documented in `ARCH.md`: a popup toggle, an interaction
> counter, `batchSize`/`enabledExtensions`, and a content marker. Implementing this
> design retires that scaffold and closes `ISS-001`. When this document and the
> code disagree during implementation, treat the code as the current state and
> this document as the intended state; update both in the same change.

---

## 1. Purpose and scope

Browser Extension Bisect helps a user identify which installed browser extension
causes an observable symptom (a broken page, slow loading, failed login, visual
glitch, and so on) by binary-searching the enabled extensions instead of toggling
them one at a time. Each trial disables roughly half of the remaining suspects; a
binary human verdict eliminates that half or the other, isolating one culprit in
`O(log N)` trials.

The product is one extension built from one TypeScript codebase with two runtime
capabilities:

| Target | Capability | Why |
|---|---|---|
| Chrome (MV3) | **Automated mode**: the add-on enumerates and toggles other extensions through `chrome.management`. | Chrome permits programmatic enable/disable for regular extensions. |
| Firefox (MV2) | **Assisted mode**: the add-on computes each batch, the user toggles that batch in `about:addons`, and the add-on verifies the resulting state through `browser.management`. | Firefox's `management.setEnabled()` rejects regular extensions; only themes and enterprise-policy-installed callers may use it. |

### 1.1 In scope

- A side panel (Chrome) / sidebar (Firefox) wizard for the whole flow.
- Candidate pre-filtering before a session starts.
- An all-off baseline check (automatic, manual, or externally attested).
- Automated half-splitting and batch application on Chrome.
- Assisted half-splitting and state verification on Firefox.
- A bound test tab that is reloaded after each batch.
- Human verdicts (`Problem persists` / `Problem is gone`).
- A durable, append-only bisect log with in-UI editing and deterministic replay.
- Guaranteed restore of every extension the session touched.
- Clear inconclusive outcomes for interaction bugs, multiple culprits, or
  contradictory verdicts.

### 1.2 Out of scope

- An automated DOM oracle (test URL + CSS selector) that decides verdicts without
  a human. Deferred by ADR-014; the protocol leaves a seam for it.
- Delta debugging (`ddmin`) and multi-culprit isolation. Deferred by ADR-015.
- Themes, hosted apps, packaged apps, and login-screen extensions. They are not
  candidates.
- Safari, Edge, Opera, and other Chromium derivatives as first-class targets.
- Migrating Firefox to Manifest V3. The Firefox build stays MV2 per ADR-002.
- Publishing/review automation for the Chrome Web Store or addons.mozilla.org.
- Native helpers or companion applications for Firefox.
- Any form of telemetry, analytics, or remote code.

---

## 2. Goals and success criteria

| ID | Goal | Success criterion |
|---|---|---|
| G1 | Correct isolation under the single-culprit assumption | A known culprit in an E2E fixture set is the reported culprit. |
| G2 | Logarithmic effort | `N` candidates take about `ceil(log2 N)` partition trials, plus the baseline and possibly one final confirmation. |
| G3 | Safe state management | Every candidate whose state the session changed can be restored; no silent or unreported state change. |
| G4 | Cross-browser parity | One domain model, engine, log, and UI; platform differences live only in the management adapter and manifest. |
| G5 | Durability | A session survives MV3 worker termination, side-panel close, and browser restart; state is never memory-only. |
| G6 | Auditability | The log is append-only during a session, human-readable, and replayable after a corrected verdict. |
| G7 | Privacy and least privilege | No host permissions, no `tabs` permission, no data leaves the browser, no remote code. |
| G8 | Low cognitive load | Verdict labels describe the symptom, not abstract "good/bad"; progress and the current batch are always visible. |

Non-goals for correctness: the tool cannot know whether the user's symptom is
real, reproducible, or caused by the browser itself. The baseline check rules out
the browser as the sole cause; the rest is a human oracle.

---

## 3. Constraints and verified facts

These facts are load-bearing. Each is cited in §19.

### 3.1 Platform capability matrix

| Capability | Chrome MV3 | Firefox MV2 | Design consequence |
|---|---|---|---|
| Enumerate installed add-ons | `management.getAll()` includes enabled, disabled, and terminated extensions; component extensions are hidden. | `management.getAll()` returns only `extension` and `theme` types; system and legacy non-WebExtension add-ons are filtered. | Filter to enabled `type: "extension"` on both. |
| Toggle a regular extension | `management.setEnabled(id, enabled)` works. | **Rejected** unless the caller is enterprise-policy-installed (`extension.isInstalledByEnterprisePolicy`). | Chrome automated; Firefox assisted. |
| Toggle a theme | Works. | Works. | Themes are out of scope; do not include them. |
| Detect external toggles | `management.onEnabled` / `onDisabled` / `onInstalled` / `onUninstalled`. | Same events, filtered to allowed types. | Drift detection and assisted completion. |
| Eligibility flag | `mayDisable` (`MustRemainEnabled`) and policy checks. | `mayDisable` (`PERM_CAN_DISABLE`). | Pre-filter; still handle per-call failures. |
| Persistent background | MV3 service worker, terminated after ~30 s idle. | MV2 background page, persistent. | Storage is canonical on both; no memory-only state. |
| Side surface | `sidePanel` API, Chrome 114+, `sidePanel` permission. | `sidebar_action` manifest key; `default_panel` is required. | One WXT `entrypoints/sidepanel/` app for both. |
| Reload a tab | `tabs.reload()` needs no permission. | `tabs.reload()` needs no permission. | Test-tab refresh without the `tabs` permission. |

### 3.2 Chrome toggle semantics

The public reference says `management.setEnabled()` "must usually be called in the
context of a user gesture" and "may present the user with a native confirmation
UI". The Chromium implementation is narrower:

- `ManagementSetEnabledFunction::Run()` checks `ExtensionMayModifySettings`, no-ops
  when the target is already in the requested state, and then either disables or
  enables.
- Disabling uses `DISABLE_BY_ANOTHER_EXTENSION` (or `DISABLE_BLOCKED_BY_POLICY`
  for policy targets), so the disabled state persists across browser restarts and
  the user can re-enable the extension manually.
- Enabling checks requirements, then permissions escalation. A gesture is required
  only when the extension's permissions increased; that path shows the native
  prompt and returns `kGestureNeededForEscalationError` without a gesture.
- Re-enabling a greylisted extension is rejected for extension callers; only the
  `chrome://extensions` WebUI may do it for those extensions.

Design consequences:

1. Normal batch toggles can run in the background service worker; no per-toggle
   click is needed.
2. The one exception is re-enabling an extension whose permissions escalated. The
   side panel must offer a **single** "Enable with click" action; the call must
   originate in the side panel page's click handler to carry user activation.
3. The app must handle per-extension failures and must never claim a full restore
   when a greylisted or policy-locked extension could not be re-enabled.

### 3.3 Firefox toggle semantics

The Firefox implementation (`toolkit/components/extensions/parent/ext-management.js`)
throws unless the target is a theme **or** the calling add-on is installed by
enterprise policy:

```js
if (addon.type !== "theme" && !extension.isInstalledByEnterprisePolicy) {
  throw new ExtensionError(
    "setEnabled can only be used for themes or by addons installed by enterprise policy"
  );
}
```

`getAll()` is restricted to `theme` and `extension` types and filters system and
legacy non-WebExtension add-ons. `mayDisable` maps to `PERM_CAN_DISABLE`. The
`onEnabled` / `onDisabled` events are available to an add-on with the `management`
permission and are the assisted flow's completion signal.

Design consequence: the Firefox adapter is **assisted** for normal installs. If
`management.getSelf().installType === "admin"` (the add-on itself was installed by
enterprise policy), the adapter may use the automated path; this is a documented
exception, not the default.

### 3.4 Runtime lifecycle

Chrome terminates an MV3 service worker after ~30 seconds of inactivity. Global
variables are lost. Every session mutation must be persisted before the handler
returns, and every read must rehydrate from `storage.local`. The side panel is an
extension page that can close at any time; it is a view, not the source of truth.
Firefox's persistent background page is treated the same way so both targets share
one reliability model.

### 3.5 Permissions and store policy

| Permission | Purpose | Warning |
|---|---|---|
| `storage` | Persist the config, log, and derived session state. | None. |
| `management` | Enumerate and (Chrome) toggle other extensions. | **"Manage your apps, extensions, and themes."** |
| `sidePanel` (Chrome only) | Open and configure the side panel. | None. |

The design deliberately drops:

- `<all_urls>` and the content script/marker, which are not needed to manage
  extensions and would add the broad host-access warning.
- The `tabs` permission: `tabs.query()` exposes the tab id without it, and
  `tabs.reload()` needs no permission.
- Any `scripting`, `notifications`, `alarms`, or native-messaging permission.

This matches the Chrome Web Store "narrowest permissions" policy and Mozilla's
"only request permissions necessary" rule. The extension remains single-purpose
(extension bisection), uses no remote code, and collects no data.

### 3.6 Reference behavior: VS Code extension bisect

VS Code's reference flow establishes an all-off baseline, disables half of the
remaining suspects, re-enables the cleared half, and asks `Good now` / `This is
bad`. It reports roughly `log2(N) + 1` steps including the baseline. This design
adopts the invariant and the re-enable-cleared behavior, but replaces the labels
with symptom-oriented wording and adds durability, restore, and replay.

### 3.7 Side panel availability

- Chrome's side panel requires Chrome 114+ and the `sidePanel` permission. The
  panel stays open across tab navigation when configured globally.
- Firefox's `sidebar_action` accepts a `default_panel` HTML file and is available
  in MV2. The sidebar persists while the user navigates to `about:addons`.
- WXT maps a single `entrypoints/sidepanel/` entrypoint to Chrome's `side_panel`
  and Firefox's `sidebar_action`, so the Vue app and its CSS are shared.

---

## 4. Decisions at a glance

| ADR | Decision |
|---|---|
| [ADR-008](DECISIONS.md#adr-008-split-extension-management-behind-a-capability-adapter) | Split extension management behind a capability adapter: automated Chrome, assisted Firefox. |
| [ADR-009](DECISIONS.md#adr-009-make-the-wxt-side-panel-the-primary-ui) | Make the WXT side panel/sidebar the primary UI; retire the popup. |
| [ADR-010](DECISIONS.md#adr-010-use-set-bisection-with-a-mandatory-baseline) | Use set bisection with a mandatory baseline and the re-enable-cleared invariant. |
| [ADR-011](DECISIONS.md#adr-011-persist-an-event-sourced-bisect-log-in-local-storage) | Persist an event-sourced bisect log in `storage.local`; derive sessions by pure reduction. |
| [ADR-012](DECISIONS.md#adr-012-replace-the-scaffold-and-minimize-permissions) | Replace the scaffold and minimize permissions to `storage`, `management`, and `sidePanel`. |
| [ADR-013](DECISIONS.md#adr-013-keep-the-culprit-disabled-and-require-explicit-restore) | Keep the culprit disabled and require explicit restore. |
| [ADR-014](DECISIONS.md#adr-014-ship-human-verdicts-only-in-v1) | Ship human verdicts only in v1; defer the automated oracle. |
| [ADR-015](DECISIONS.md#adr-015-report-non-single-culprit-outcomes-as-inconclusive) | Report non-single-culprit outcomes as inconclusive; defer ddmin. |

---

## 5. Domain model

| Entity | Identity | Key attributes |
|---|---|---|
| **BisectSession** | `sessionId`, created once per start | `status`, `capability`, `candidateOrder`, `originalEnabledIds`, `suspects`, `cleared`, `currentTrial`, `culpritId`, `ambiguityIds`, `testTab`, timestamps |
| **CandidateExtension** | Browser extension id | `name`, `version`, `enabledAtStart`, `mayDisable`, `installType`, `type`, icon metadata |
| **Trial** | `round` within a session | `enabledIds`, `disabledIds`, `targetState`, `verdict`, `appliedAt`, `errors` |
| **Verdict** | Value on a trial | `persists` or `gone` |
| **BisectEvent** | Monotonic sequence in the log | `type`, `at`, `payload`, `schemaVersion` |
| **ReplayResult** | Derived from an edited log | `culpritId` or `ambiguityIds`, recomputed trials, validation error, batch differences |
| **CapabilityReport** | Derived per runtime | `browserName`, `canAutoToggle`, `selfInstallType`, `sideSurface` |
| **DriftReport** | Derived on demand | expected vs actual enabled states, unexpected management events, affected candidates |

Relationships: `BisectSession` 1—* `Trial`; `Trial` 0..1 `Verdict`; `BisectSession`
1—* `BisectEvent`; `BisectSession` 1—* `CandidateExtension` (snapshot).

### 5.1 Invariants

1. **One active session per browser profile.** A second side panel joins the
   existing session instead of starting another.
2. **The candidate snapshot is immutable.** Extensions installed or updated after
   the session starts do not join; they are reported as a warning.
3. **Every candidate is enabled at session start.** Disabled extensions are not
   suspects.
4. **The suspect set only shrinks.** `cleared = candidates - suspects` and every
   cleared candidate is kept enabled during later trials.
5. **The current trial partitions the suspects.** One half is enabled, the other
   is disabled; every non-suspect is enabled.
6. **The single-culprit assumption is explicit.** A contradiction produces
   `inconclusive`, never a silent blame.
7. **Restore only touches extensions the session changed.** Untouched extensions
   are never modified.
8. **The log is append-only during a live session.** Replay edits operate on a
   copy, not the audit log.

The canonical terms and their rejected synonyms live in `GLOSSARY.md`.

---

## 6. Bisect algorithm

### 6.1 Candidate eligibility

A candidate must satisfy all of:

```text
enabled at session start
type === "extension"
id !== self.id
mayDisable === true
id is not in config.excludedExtensionIds
```

The UI lists ineligible extensions separately with a reason: theme/app, disabled at
start, policy-locked (`mayDisable === false`), this add-on, or user-excluded.

The order is captured once at start. Sort by a deterministic key (display name,
then id) and store the resulting array in the `session-started` event. Replay uses
the stored order, so it never depends on locale or a later `getAll()` order.

### 6.2 Baseline check

The baseline attributes the symptom to an extension rather than the browser/host.

| Mode | Target | Behavior |
|---|---|---|
| `auto` (Chrome) | All candidates disabled. | Apply, verify, reload the test tab, ask the baseline verdict. `persists` → host issue; restore and abort. `gone` → proceed. |
| `manual` (Firefox) | All candidates disabled by the user. | Show the checklist, verify through `management` events/`getAll`, then ask the baseline verdict. |
| `external` (Firefox) | All extensions off outside the add-on. | The user verifies the all-off result in Firefox Troubleshoot Mode, then attests "it's gone"; record `external-clean` and proceed at full-enabled state. |

The external mode is recommended for Firefox because Troubleshoot Mode disables
all extensions (including this add-on) in one step. Manual disable-all remains the
verifiable fallback. The baseline is a recorded verdict, not an assumption.

### 6.3 Partition loop

At every trial, the target state is:

```text
all candidates outside suspects: enabled
suspects[0 .. mid-1]:             enabled
suspects[mid ..]:                 disabled
mid = floor(suspects.length / 2)
```

For `suspects.length === 1`, this yields `enabled = []`, `disabled = [suspect]`,
which is the final confirmation trial.

For `N = 1`, the baseline already materializes the only candidate: a `gone`
baseline returns that candidate directly, and a `persists` baseline is a host
issue. The loop below assumes `N >= 2`.

```ts
type Verdict = 'persists' | 'gone';

let suspects = session.candidateOrder.map((candidate) => candidate.id);
let lastVerdict: Verdict | null = null;
let lastDisabled: string[] = [];

while (true) {
  if (
    suspects.length === 1 &&
    lastVerdict === 'gone' &&
    lastDisabled.length === 1 &&
    lastDisabled[0] === suspects[0]
  ) {
    return { culpritId: suspects[0] };
  }

  const mid = Math.floor(suspects.length / 2);
  const enabled = suspects.slice(0, mid);
  const disabled = suspects.slice(mid);

  await applyTargetState({ enabled, disabled, allOutsideSuspectsEnabled: true });
  const verdict = await askUser();

  lastVerdict = verdict;
  lastDisabled = disabled;

  suspects = verdict === 'persists' ? enabled : disabled;

  if (suspects.length === 0) {
    return { inconclusive: true, reason: 'verdict-contradiction' };
  }
}
```

The loop terminates because the suspect set strictly shrinks until the final
confirmation. If `applyTargetState` fails, or the final confirmation still shows
the symptom, the session ends inconclusive; it never blames the last suspect.

### 6.4 Step count

- Baseline: 1 trial.
- Partitioning: `ceil(log2 N)` trials for `N >= 2`.
- Final confirmation: 1 extra trial when the last partition left the lone suspect
  **enabled**; no extra trial when it left the suspect disabled and the verdict was
  `gone`.
- Worst case: `1 + ceil(log2 N) + 1`. For `N = 24`, 6–7 trials.

This is still logarithmic; the extra confirmation is the price of not guessing.

### 6.5 Worked example (`N = 24`, culprit #8)

| Step | State | Verdict | Suspects |
|---|---|---|---|
| Baseline | all 24 disabled | gone | 1–24 |
| Trial 1 | 1–12 enabled, 13–24 disabled | persists | 1–12 |
| Trial 2 | 1–6 enabled, 7–12 disabled, 13–24 enabled | gone | 7–12 |
| Trial 3 | 7–9 enabled, 10–12 disabled, others enabled | persists | 7–9 |
| Trial 4 | 7–8 enabled, 9 disabled, others enabled | persists | 7–8 |
| Trial 5 | 7 enabled, 8 disabled, others enabled | gone | 8 |
| Final | 8 is the lone disabled suspect | gone | culprit 8 |

If the culprit were #7, Trial 5 would return `persists`; a sixth trial would
disable #7 alone and confirm it.

### 6.6 Edge cases

| Case | Behavior |
|---|---|
| `N = 0` | Block start: "No eligible enabled extensions." |
| `N = 1` | The baseline is the answer: all-off `gone` → that candidate is the culprit; all-off `persists` → host issue. |
| Baseline `persists` | Host/browser issue: restore, abort, explain that no extension is implicated. |
| Final confirmation `persists` | Inconclusive: interaction, multiple culprits, or a misreported verdict. Show the remaining set. |
| `suspects` becomes empty | Inconclusive with `verdict-contradiction`; restore. |
| Toggle failure | Abort the trial, restore the previous target state, report the failing extension. |
| Candidate disappears mid-session | Pause; the trial is invalid; offer restore or restart with a fresh snapshot. |
| New extension installed mid-session | Warn; it is not a candidate; no state change. |
| Candidate version changes mid-session | Warn; pause if the change could alter behavior; offer restart. |

---

## 7. Runtime architecture

```text
┌─────────────────────────────────────────────────────────────┐
│ Side panel / Firefox sidebar (Vue 3)                        │
│  candidate picker · baseline · trial · verdict · history    │
└──────────────────────────────┬──────────────────────────────┘
                               │ typed messenger (ProtocolMap)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Background (Chrome MV3 service worker / Firefox MV2 page)   │
│                                                             │
│  session orchestration ──► engine (pure)                    │
│         │                    │                              │
│         │                    ├── partition / transitions    │
│         │                    └── replay (pure)              │
│         ├── event log append / derived view                 │
│         ├── management port                                 │
│         │      ├── Chrome adapter (automated)               │
│         │      └── Firefox adapter (assisted / enterprise)  │
│         └── test-tab reloader (tabs.reload)                 │
└───────────────┬───────────────────────────────┬─────────────┘
                │                               │
                ▼                               ▼
   browser.management (other add-ons)     storage.local
   onEnabled / onDisabled / onInstalled   bisectConfig
   onUninstalled                          bisectLog
```

| Module | Responsibility |
|---|---|
| `utils/bisect/domain.ts` | Shared types: candidate, verdict, trial, session view, capability, drift. |
| `utils/bisect/engine.ts` | Pure partitioning and transitions; no browser APIs. |
| `utils/bisect/events.ts` | Event schema, append rules, reducer that derives the session view. |
| `utils/bisect/replay.ts` | Pure replay/validation of an edited log. |
| `utils/bisect/management-port.ts` | `ManagementPort` interface, shared eligibility filter, error codes. |
| `utils/bisect/chrome-port.ts` | Chrome `management` adapter, diffing, error mapping, escalation handling. |
| `utils/bisect/firefox-port.ts` | Firefox adapter: assisted batches, event-driven verification, manual restore. |
| `utils/bisect/session.ts` | Background orchestration: start/apply/verdict/retry/undo/reset, serialized mutation queue. |
| `utils/bisect/config.ts` | Versioned `BisectConfig` storage item and legacy-key cleanup. |
| `utils/messaging.ts` | The typed `ProtocolMap` and shared messenger. |
| `entrypoints/background.ts` | Message handlers, management listeners, side-panel behavior, startup reconciliation. |
| `entrypoints/sidepanel/` | Vue app, screens, plain CSS over the existing token layer. |
| `utils/test-mode.ts` | `isTestMode()` for `[EXT_BG_ERR]` and test-only fixture hooks. |

### 7.1 Single writer and serialized mutations

Only the background writes the session log and config. Every mutating message
enters a promise queue, rehydrates the log, applies the event, persists, and then
responds. The side panel never writes the log. The one exception is the Chrome
permissions-escalation retry: the side panel may call `management.setEnabled` from
a click handler, because user activation does not cross a runtime message. It
reports the result to the background, which records the outcome.

### 7.2 No memory-only state

The service worker may die between any two messages. A handler must not depend on a
module-level session object. The log and config are the canonical state; the
derived view is recomputed from the log. A short-lived cache may exist only inside
a single serialized mutation.

### 7.3 Test tab

The user binds the tab that reproduces the symptom. The config stores
`{ tabId, url }`. After each batch:

1. Apply/verify the management state.
2. `tabs.reload(tabId)`.
3. Wait for the tab to reach `status === "complete"` via `tabs.onUpdated`, with a
   timeout (e.g., 15 s) and a fallback message if the page does not settle.
4. Ask for the verdict.

If the tab is gone, the UI prompts the user to rebind or continues without
automatic reload. `tabs.reload` needs no permission; only the tab id is used, so
the `tabs` permission stays off.

---

## 8. Messaging protocol

All IPC goes through `defineExtensionMessaging<ProtocolMap>`; there is no raw
`runtime.sendMessage` call in extension code.

| Message | Payload | Returns | Direction |
|---|---|---|---|
| `getCapabilities` | — | `CapabilityReport` | side panel → background |
| `listCandidates` | — | `{ eligible, ineligible }` | side panel → background |
| `getConfig` | — | `BisectConfig` | side panel → background |
| `updateConfig` | `Partial<BisectConfig>` | `BisectConfig` | side panel → background |
| `getSession` | — | `SessionView \| null` | side panel → background |
| `startSession` | `{ candidateIds, baselineMode, testTab }` | `SessionView` | side panel → background |
| `applyTrial` | — | `SessionView` (Chrome) or `ManualBatch` (Firefox assisted) | side panel → background |
| `submitVerdict` | `{ verdict: "persists" \| "gone" }` | `SessionView` | side panel → background |
| `retryTrial` | `{ reason? }` | `SessionView` | side panel → background |
| `undoLastVerdict` | — | `SessionView` | side panel → background |
| `resetSession` | `{ restore: boolean }` | `SessionView` | side panel → background |
| `getLog` | — | `BisectLog` | side panel → background |
| `replayLog` | `{ log: BisectLog }` | `ReplayResult` | side panel → background |
| `bindTestTab` | `{ tabId, url }` | `BisectConfig` | side panel → background |
| `reloadTestTab` | — | `{ ok: boolean; error?: string }` | side panel → background |
| `getDrift` | — | `DriftReport` | side panel → background |
| `recordEscalationResult` | `{ extensionId, ok, error? }` | `SessionView` | side panel → background (the side panel performs the gesture-bound `setEnabled` call) |

Retired messages: `getContentMarker`, `getContentStatus`, `getTabId`,
`updateState`, `recordInteraction`. The old `ExtensionState` aggregate is retired
with the scaffold.

The side panel watches the persisted log item (or a background
`sessionChanged` broadcast) so multiple panels and windows converge on the same
session view.

---

## 9. Storage and the event log

### 9.1 Items

| Item | Key | Shape | Fallback |
|---|---|---|---|
| Config | `local:bisectConfig` | `BisectConfig` | `{ schemaVersion: 1, excludedExtensionIds: [], testTab: null }` |
| Log | `local:bisectLog` | `BisectLog` | `null` |

```ts
interface BisectConfig {
  schemaVersion: 1;
  excludedExtensionIds: string[];
  testTab: { tabId: number; url: string | null } | null;
  lastCandidateIds?: string[];
}

interface BisectLog {
  schemaVersion: 1;
  sessionId: string;
  events: BisectEvent[];
}
```

`testTab.url` is nullable because the add-on requests no `tabs` permission (ADR-012), so
neither Chrome nor Firefox exposes `tab.url` to it: `tabs.query()` and `tabs.get()` return the
id and status only. The binding stores `url` when the browsing context happens to expose one
and stores `null` otherwise; the panel renders `Tab #N` in that case
([ADR-017](DECISIONS.md)).

The legacy scaffold keys `local:enabled`, `local:interactionCount`, and
`local:settings` are deleted on the first background start. This is a pre-release
project with no data to migrate; do not invent a migration for placeholder values.
If a future shape change is needed, add a new `schemaVersion` and an explicit
migrator.

### 9.2 Event schema

| Event | Payload | Purpose |
|---|---|---|
| `session-started` | `{ candidateOrder, capability, baselineMode, testTab }` | Immutable snapshot and replay seed. |
| `baseline-recorded` | `{ mode: "auto" \| "manual" \| "external", verdict }` | Host attribution. |
| `trial-started` | `{ round, enabledIds, disabledIds }` | The intended partition. |
| `trial-applied` | `{ round, errors: ToggleError[] }` | What actually happened. |
| `verdict-recorded` | `{ round, verdict }` | The oracle result. |
| `trial-retried` | `{ round, reason }` | Re-run without a verdict. |
| `verdict-undone` | `{ round }` | Live correction. |
| `session-paused` | `{ reason, drift? }` | Interruption/drift. |
| `session-resumed` | `{ reason }` | Resumption. |
| `session-completed` | `{ culpritId }` | Success. |
| `session-inconclusive` | `{ ambiguityIds, reason }` | Honest non-result. |
| `session-reset` | `{ restored: boolean, errors: RestoreError[] }` | Teardown audit. |

Events are append-only during a live session. The log is capped at 500 events; a
bisect uses a few dozen at most. If the cap is reached, the session fails closed
with a storage error rather than silently dropping audit data.

### 9.3 Replay copies

Editing a verdict for replay creates a **copy** of the log with the corrected
verdict. The live log remains the audit trail. The copy is not persisted as the
session; it is an input to the pure replay function. The UI shows the recomputed
result and whether the recorded trial batches differ from the recomputed ones.

---

## 10. Platform capability adapter

```ts
interface ManagementPort {
  getCapabilities(): Promise<CapabilityReport>;
  listCandidates(): Promise<{ eligible: CandidateExtension[]; ineligible: IneligibleExtension[] }>;
  applyTargetState(target: TargetState): Promise<ToggleResult>;
  verifyState(expected: TargetState): Promise<DriftReport>;
  restore(original: EnabledStateMap): Promise<RestoreResult>;
  watchEvents(listener: (event: ManagementEvent) => void): () => void;
}
```

`TargetState` is a map of candidate id → desired `enabled` value for the trial,
not a full dump of every installed extension. The adapter computes the diff against
the current `management.getAll()` result and toggles only what changed. This keeps
each round to at most `N/2` toggles and avoids needless reloads.

### 10.1 Chrome automated adapter

- Enumerate: `management.getAll()`, keep `type === "extension"`, exclude self,
  filter to enabled candidates for `startSession`.
- Pre-filter: `mayDisable`; keep policy-locked extensions in the ineligible list.
- Apply: sequential `setEnabled` calls over the diff; collect per-id errors; then
  `verifyState`.
- Error mapping:
  - `ExtensionMayModifySettings` failure (the policy check behind `mayDisable`) →
    `policy-blocked`.
  - `kGestureNeededForEscalationError` → `needs-user-gesture`; the UI retries the
    single enable from a click handler.
  - `kCannotReEnableGreylistedError` → `manual-recovery-required`; tell the user to
    re-enable it in `chrome://extensions`.
  - `kNoExtensionError` → `extension-removed`.
  - Requirements failure → `unsupported-requirements`.
- Restore: apply `setEnabled` for every candidate in `touchedIds` whose original
  state differs from the current state. Report failures; do not claim success.

### 10.2 Firefox assisted adapter

- Enumerate: `management.getAll()`, keep `type === "extension"`, exclude self,
  filter to enabled candidates.
- `canAutoToggle`: true only if `management.getSelf().installType === "admin"`.
  Otherwise the adapter is assisted.
- Assisted apply: return a `ManualBatch` with `enableIds` and `disableIds`; do not
  mutate. The UI shows two checklists and an "Open Add-ons Manager" action.
- Verify: call `getAll()` and compare each candidate's `enabled` flag with the
  target. The `onEnabled`/`onDisabled` events debounce a re-verify; the user can
  also press "Verify".
- Restore: return a manual restore list; verify completion. The session remains
  `restore-pending` until the state matches or the user explicitly accepts the
  remaining differences.
- Enterprise exception: if the add-on itself is policy-installed, use the
  automated path with the same Chrome-style diff and error handling; the platform
  capability report says `auto`.

### 10.3 Drift detection

`verifyState` compares the expected enabled map for the **current trial** with
`management.getAll()`. A mismatch means the user or another tool changed a
candidate. The session pauses with a `DriftReport`:

- `expected` / `actual` per candidate;
- expected toggles that are still pending (assisted mode);
- unexpected toggles outside the current trial;
- candidates that disappeared.

The UI offers **Re-sync** (apply the expected state again), **Undo last verdict**
(if the previous trial state can be restored), or **Restore all**.

---

## 11. Session lifecycle, log, and replay

### 11.1 Statuses

| Status | Meaning | Allowed next |
|---|---|---|
| `preparing` | Candidate picker is open; no toggles yet. | `baseline`, `aborted` |
| `baseline` | Baseline batch is being applied or the baseline question is open. | `trial`, `aborted` |
| `trial` | The next partition is being prepared. | `applying` |
| `applying` | Chrome toggles are in flight. | `awaiting-verdict`, `paused`, `aborted` |
| `awaiting-verdict` | Batch applied/verified; the user is testing. | `trial`, `completed`, `inconclusive`, `paused` |
| `awaiting-manual-toggle` | Firefox is waiting for the user to match the batch. | `awaiting-verdict`, `paused`, `aborted` |
| `paused` | Drift or interruption; needs a decision. | `trial`, `awaiting-verdict`, `aborted` |
| `completed` | Culprit isolated; culprit left disabled. | `restored`, `trial` (new session) |
| `inconclusive` | Ambiguity or contradiction; no culprit. | `restored`, `trial` (new session) |
| `aborted` | User stopped; restore is pending or declined. | `restored`, `trial` (new session) |
| `restored` | All touched candidates are back to their original states. | `preparing`, `trial` |

`restored` is a terminal audit state; starting another session creates a new log.

### 11.2 Live undo

`undoLastVerdict` is allowed only for the most recent trial and only if the
browser can return to the previous trial state without ambiguity. It:

1. verifies the current state;
2. appends `verdict-undone`;
3. re-applies the previous trial's target state;
4. returns the view to `awaiting-verdict`.

If the state has drifted, the UI requires Re-sync or Restore first. Undo is the
in-session correction path; full log editing is for paused/completed/aborted
sessions.

### 11.3 Replay

Replay is **diagnostic only**. It never toggles extensions.

Input: a copied log with one or more corrected verdicts.

Steps:

1. Validate the `session-started` event and its candidate order.
2. Recompute the baseline and each partition from the verdict sequence. Ignore the
   recorded `trial-started` sets as authoritative; compare them and report
   differences.
3. Stop at the first invalid sequence (a verdict without a trial, a trial after a
   terminal event, or an empty suspect set).
4. Output `ReplayResult`:
   - `culpritId` or `ambiguityIds`;
   - recomputed trials with enabled/disabled sets;
   - `batchDifferences` against the recorded log;
   - `validationError` if the edited log is structurally invalid.

The UI explains: "Replay recomputes the result. It does not change installed
extensions." If the replayed culprit differs from the live result, the user can
copy the report and start a new session with the corrected log.

### 11.4 Restore semantics

Every candidate is enabled at session start, so the original enabled map is the
candidate snapshot; `touchedIds` is derived from the applied baseline/trial events.
Restore:

1. Computes the original state for every touched candidate.
2. Applies it on Chrome, or presents a verified checklist on Firefox.
3. Appends `session-reset` with `restored` and any errors.
4. Leaves untouched extensions alone.
5. If a candidate disappeared, reports it; if a new extension appeared, leaves it.
6. If a re-enable fails (greylist, policy), reports `manual-recovery-required` and
   does not claim a full restore.

On success, the culprit stays disabled by design (ADR-013). Restore is the explicit
action that re-enables it. On abort, the UI asks "Restore all extensions?" and
defaults to yes. On startup with an unfinished session, the UI offers Resume or
Restore.

---

## 12. UX flows and side-panel screens

The side panel is narrow; screens are a vertical stack with one primary action.
All interactive nodes carry stable `data-testid` attributes and accessible names.
State changes are announced through `aria-live`.

### 12.1 No session

```text
┌ Extension Bisect ──────────────┐
│ Find the extension causing a   │
│ problem.                       │
│                                │
│ [ Choose candidates ]          │
│ [ Resume last session ]        │
│                                │
│ The culprit stays disabled     │
│ until you press Restore.       │
└────────────────────────────────┘
```

### 12.2 Candidate picker

```text
┌ 1. Choose candidates ──────────┐
│ Search: [...................]  │
│ ☑ uBlock Origin        1.2.3   │
│ ☑ Dark Reader          4.9.0   │
│ ☐ Known-good ext       ...     │
│ ────────────────────────────── │
│ Not eligible: 2 themes, 1 app, │
│ 1 policy-locked, 1 disabled    │
│ 8 of 9 selected                │
│ [ Continue ]                   │
└────────────────────────────────┘
```

### 12.3 Pre-flight

```text
┌ 2. Before you start ───────────┐
│ Test tab: example.com/broken   │
│ [ Use current tab ]            │
│                                │
│ 8 extensions will be toggled.  │
│ Restore is always available.   │
│ [ Start baseline ]             │
└────────────────────────────────┘
```

### 12.4 Baseline

Chrome:

```text
┌ Baseline ──────────────────────┐
│ All 8 candidates are disabled. │
│ Reload the test page and check │
│ the problem.                   │
│ [ Reload test tab ]            │
│ Problem persists?              │
│ [ Yes ]   [ No, it's gone ]    │
└────────────────────────────────┘
```

Firefox:

```text
┌ Baseline ──────────────────────┐
│ Recommended: restart in        │
│ Troubleshoot Mode and check    │
│ whether the problem is gone.   │
│ [ I checked: it's gone ]       │
│                                │
│ Or disable all 8 manually:     │
│ ☐ uBlock Origin  [about:addons]│
│ ☐ Dark Reader                  │
│ State: 6/8 off                 │
│ [ Verify manual state ]        │
└────────────────────────────────┘
```

### 12.5 Trial

Chrome:

```text
┌ Trial 2 of ~4 ─────────────────┐
│ 4 enabled · 4 disabled         │
│ [ Reload test tab ]            │
│ Does the problem persist?      │
│ [ Yes ]   [ No, it's gone ]    │
│ [ Undo last verdict ]          │
└────────────────────────────────┘
```

Firefox assisted:

```text
┌ Trial 2 of ~4 ─────────────────┐
│ Enable these:                  │
│ ☑ A   ☑ B   ☑ C   ☑ D          │
│ Disable these:                 │
│ ☐ E   ☐ F   ☐ G   ☐ H          │
│ [ Open Add-ons Manager ]       │
│ State: 6/8 done                │
│ [ Verify ]                     │
│ ── verdict buttons appear ──   │
└────────────────────────────────┘
```

### 12.6 History and log

```text
┌ History ───────────────────────┐
│ 0 Baseline  all off    gone    │
│ 1 Trial     A–D on     persists│
│ 2 Trial     A–B on     gone    │
│ 3 Trial     A on       persists│
│ [ Edit verdict ] [ Replay ]    │
│ [ Copy log JSON ]              │
└────────────────────────────────┘
```

### 12.7 Completed

```text
┌ Culprit found ─────────────────┐
│ Dark Reader 4.9.0              │
│ Left disabled.                 │
│ [ Restore all ]                │
│ [ Copy report ]                │
│ [ Replay log ]                 │
└────────────────────────────────┘
```

### 12.8 Inconclusive

```text
┌ Inconclusive ──────────────────┐
│ The final check still showed   │
│ the problem. Possible causes:  │
│ interaction, multiple culprits,│
│ or a misreported verdict.      │
│ Remaining: A, B                │
│ [ Restore all ] [ Start over ] │
└────────────────────────────────┘
```

### 12.9 Replay result

```text
┌ Replay ────────────────────────┐
│ Edited verdict at trial 2.     │
│ Recomputed culprit: B          │
│ Recorded batches differed at   │
│ trial 3.                       │
│ (No extensions were changed.)  │
│ [ Copy report ]   [ Close ]    │
└────────────────────────────────┘
```

### 12.10 Copy rules

- Verdict labels are exactly **"Problem persists"** and **"Problem is gone"**;
  never "good" / "bad" in user-facing UI.
- Progress reads "Trial N of ~M · S suspects".
- The candidate list always shows the current state (enabled/disabled) when the
  platform exposes it.
- Restore is never hidden behind a menu.
- Reuse the CSS custom-property token values from `entrypoints/popup/style.css`
  in the new `entrypoints/sidepanel/style.css`; do not add a UI framework.
- Prefer names over icons for extension rows; icon URLs from `management` may not
  be web-accessible across extensions. Use initials as a fallback.

---

## 13. Safety, privacy, and permissions

### 13.1 Consent

Before the first toggle, show a confirmation screen that:

1. lists the candidates that will be toggled;
2. explains that the culprit remains disabled until Restore;
3. explains Firefox's manual mode (if applicable);
4. links to the restore action and the log;
5. requires an explicit "Start baseline" click.

### 13.2 Privacy

- No telemetry, analytics, crash reporting, or remote code.
- The log stays in `storage.local`; export is user-initiated.
- The extension reads extension metadata and enabled state only; it does not read
  page content, URLs, history, or tabs beyond the bound test tab id.
- No host permissions, so the add-on cannot inspect the symptom itself.

### 13.3 Store-policy mapping

| Policy | How the design complies |
|---|---|
| Narrowest permissions (Chrome Web Store) | `storage`, `management`, `sidePanel` only; no `<all_urls>`, no `tabs`. |
| Single purpose | The add-on exists to bisect extensions. |
| No remote code | All code ships in the package. |
| No unexpected features | No analytics, no search changes, no page modification. |
| Firefox "only necessary permissions" | Same minimal set; `management` is the core capability. |
| Firefox data collection | No data collection; declare none when publishing. |

### 13.4 Known risks

- **Chrome greylist re-enable failure.** A greylisted extension can be disabled but
  not re-enabled by an extension. The UI must detect the failure and tell the user
  to use `chrome://extensions`. This is rare but must not be hidden.
- **Policy-locked extensions.** Excluded up front; if a policy changes mid-session,
  the toggle fails and the trial aborts.
- **Add-on uninstalled mid-session.** The disabled states persist in the browser.
  The design cannot restore them after uninstall; onboarding and the store listing
  must warn the user to press Restore before removing the add-on.
- **Human misreport.** The log/replay path exists to correct it; the UI warns that
  replay is diagnostic and does not change extension states.
- **Flaky symptoms.** Retry the trial rather than guessing; after repeated
  inconclusive trials, recommend restore and a fresh session.

---

## 14. Error handling and edge cases

| Condition | Detection | Behavior |
|---|---|---|
| Host issue (baseline persists) | Baseline verdict `persists` | Restore, abort, explain "not caused by an extension". |
| No eligible candidates | `listCandidates` returns empty | Block start. |
| One eligible candidate | Candidate count = 1 | Baseline is the answer; no partition. |
| Policy-locked candidate | `mayDisable === false` | Show in ineligible list; exclude. |
| Toggle fails | `setEnabled` rejection | Abort trial, restore previous target, report the id and code. |
| Greylist re-enable fails | `kCannotReEnableGreylistedError` | Mark `manual-recovery-required`; link `chrome://extensions`; Restore reports incomplete. |
| Permissions escalation | `kGestureNeededForEscalationError` | Show "Enable with click"; side panel retries; if declined, restore/inconclusive. |
| Extension removed mid-session | `kNoExtensionError` / `onUninstalled` | Pause; invalidate the current trial; offer restore/restart. |
| Extension installed mid-session | `onInstalled` | Warn; do not join. |
| Extension updated mid-session | Version mismatch in `getAll` | Warn; pause if behavior may have changed. |
| Manual drift | `verifyState` mismatch | Pause; show expected vs actual; Re-sync/Undo/Restore. |
| Test tab closed | `tabs.reload` rejects / tab id missing | Prompt rebind; allow verdict without reload. |
| Tab never settles | `tabs.onUpdated` timeout | Ask the user to reload manually; do not block the verdict. |
| Browser restart | `onStartup` + log | Reconcile; offer Resume or Restore. |
| Panel closed | Log persisted | Reopen and resume; no state loss. |
| Multiple panels | Shared log | All panels show the same session; commands are serialized. |
| Storage write fails | Rejected `setValue` | Fail the command; keep the previous log; surface the error. |
| `management.getAll` fails | Rejection | Capabilities unavailable; block start. |
| Firefox `about:addons` cannot open | `tabs.create` rejects | Show instructions and a copyable list. |
| Final contradiction | Lone suspect disabled but symptom persists | Inconclusive with ambiguity set; restore/restart. |
| Replay invalid log | Validator error | Show the first invalid event; no toggles. |
| User aborts | UI action | Prompt "Restore all?" (default yes); record the decision. |

---

## 15. Testing strategy

### 15.1 Layers

| Layer | Covers |
|---|---|
| Pure unit (Vitest) | Eligibility, partition, transitions, step count, edge cases, event reducer, replay validation, config cleanup. |
| Adapter unit | `ManagementPort` fake: scripted candidates, toggles, errors, events; Chrome error mapping; Firefox assisted verification; drift. |
| Component (`@vue/test-utils` + `happy-dom`) | Candidate picker, baseline, trial, verdict, history, completed, inconclusive, restore, replay; stable `data-testid` selectors. |
| E2E Chrome (Puppeteer) | Install the add-on plus N minimal fixture extensions; run the full automated flow; assert the culprit, the culprit-left-disabled state, Restore, and Replay. |
| E2E Firefox (Puppeteer/BiDi) | Assisted flow with real `management.getAll()` and events; toggle fixtures via `about:addons` where automatable; fall back to a test-mode manual-toggle driver if the privileged UI is too brittle. |

### 15.2 Fixture extensions

E2E needs more than one installed extension. Each fixture is a minimal MV3/MV2
extension with:

- a unique id/name;
- a content script that injects a unique marker on the fixture page;
- a "culprit" fixture that injects a symptom marker (for example, hides the
  fixture page's title);
- no permissions beyond the fixture page.

The Chrome harness installs the add-on and all fixtures with
`browser.installExtension()` after launch. The fixture set is generated under
`.agent-artifacts/` or checked in under `tests/e2e/fixtures/`; either way, the
harness knows the culprit id and asserts the UI's result.

### 15.3 Firefox assisted E2E

The Firefox add-on cannot toggle fixtures. The harness has two honest options:

1. **Real `about:addons` automation**: navigate the privileged page, toggle the
   fixture rows, and let the add-on's `management` events verify. This exercises
   the real assisted path but is sensitive to Firefox's shadow-DOM UI.
2. **Test-mode manual driver**: a test-only hook reports the "manual" state so the
   harness can drive the assisted state machine without a real toggle; the real
   `management.getAll()`/event path is covered by a smaller smoke test.

The design permits either, provided the test report states which path ran. The
assisted state machine itself is fully unit-tested; E2E must not pretend to test a
path it did not exercise.

### 15.4 Quality gates

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build:all
npm run test:e2e
```

`npm run agent:verify` remains the completion gate. The E2E harness is updated to
open `sidepanel.html` directly (both browsers), install fixtures, and assert the
side panel and management state instead of the retired content marker. The
`[EXT_BG_READY]` and `[EXT_BG_ERR]` contracts stay.

---

## 16. Migration and file changes

### 16.1 Target file tree

```text
entrypoints/
  background.ts
  sidepanel/
    index.html
    main.ts
    App.vue
    style.css
    components/
utils/
  bisect/
    domain.ts
    engine.ts
    events.ts
    replay.ts
    management-port.ts
    chrome-port.ts
    firefox-port.ts
    session.ts
    config.ts
  messaging.ts
  test-mode.ts
```

### 16.2 Retired

- `entrypoints/popup/**` (replaced by the side panel).
- `entrypoints/content.ts` (no host access).
- `utils/content-marker.ts`, `utils/state.ts`, and the old `utils/storage.ts`
  items/helpers.
- `getContentMarker`, `getContentStatus`, `getTabId`, `updateState`,
  `recordInteraction`.
- Popup/content-marker unit and E2E assertions.
- `enabled`, `interactionCount`, `settings` storage keys (deleted on first start).

### 16.3 Updated

- `wxt.config.ts`: `permissions: ["storage", "management", "sidePanel"]`;
  no `host_permissions`; keep the Firefox gecko id and MV2 target. WXT's
  sidepanel entrypoint supplies the `side_panel` / `sidebar_action` manifest keys;
  verify the generated manifest includes the Chrome `action` key needed by
  `sidePanel.setPanelBehavior`.
- `tests/e2e/harness.mjs`: direct side-panel navigation, multi-extension install,
  no content marker.
- `tests/unit/*`: new engine/reducer/replay tests; keep the messaging bridge.
- `docs/ARCH.md` on implementation: replace the scaffold description with the
  as-built architecture.
- `docs/ISSUES.md` on implementation: delete `ISS-001` once verified.
- `docs/CHANGELOG.md` on implementation: user-facing entry.
- `docs/GLOSSARY.md` on implementation: retire the scaffold entries
  (`ExtensionState`, `BisectSettings`, `Content marker`, `Tab-id marker`,
  `Interaction count`, `Batch size`), and update `Test mode` to the reduced
  `[EXT_BG_ERR]`-only hook set.

No code or test files change in this design-only task.

---

## 17. Implementation phases

| Phase | Work |
|---|---|
| 0 | This design document, ADRs, and glossary. |
| 1 | Domain types, pure engine, partition/transition tests, replay validator. |
| 2 | Event log, config cleanup, background protocol, side-panel shell. |
| 3 | Chrome adapter, candidate picker, baseline, automated trials, verdicts. |
| 4 | Firefox assisted adapter, manual checklist, event-driven verification. |
| 5 | Restore, drift, log editing/replay, completion/inconclusive screens. |
| 6 | Multi-fixture E2E, Firefox assisted E2E, retire scaffold, update `ARCH.md`/`CHANGELOG.md`, run `agent:verify`. |

No time estimates are implied; each phase is independently reviewable.

---

## 18. Open questions and future work

- **Automated oracle:** a test URL + CSS selector mode. It needs page-inspection
  permissions or `activeTab`, and a protocol for flaky/async conditions. Deferred
  by ADR-014; the `Verdict` boundary in the engine is the seam.
- **ddmin / multiple culprits:** a delta-debugging fallback for interaction bugs.
  Deferred by ADR-015; the inconclusive result already reports the ambiguity set.
- **Themes and apps:** currently excluded. A future scope decision could add them.
- **Firefox MV3:** migrating the Firefox target changes the background model and
  may change side-panel tooling; ADR-002 still pins MV2.
- **i18n:** the side panel currently assumes English; use Firefox's and Chrome's
  i18n mechanisms if translated.
- **Log import/export:** v1 supports in-UI edit and copy; importing a log file is a
  natural next step.
- **Enterprise Firefox:** the automated Firefox path when the add-on itself is
  policy-installed is designed but not a primary distribution target.
- **Incognito:** side-panel and extension-management behavior in incognito needs a
  separate policy decision; out of scope.

---

## 19. References

Fetched 2026-11-24. Re-verify before implementation if browser versions or store
policies have moved.

| Topic | URL and section |
|---|---|
| Chrome `management` API | https://developer.chrome.com/docs/extensions/reference/api/management — "Permissions", "Methods → `setEnabled()`", "Events" |
| Chromium `management` implementation | https://raw.githubusercontent.com/chromium/chromium/main/extensions/browser/api/management/management_api.cc — `ManagementSetEnabledFunction::Run`, `CheckPermissionsIncrease`, `ManagementEventRouter` |
| Firefox `management` API | https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/management — "Functions", "Events" |
| Firefox `management.setEnabled()` | https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/management/setEnabled — "Description" |
| Firefox `management` implementation | https://raw.githubusercontent.com/mozilla/gecko-dev/master/toolkit/components/extensions/parent/ext-management.js — `setEnabled`, `getAll`, `ManagementAddonListener` |
| Chrome service-worker lifecycle | https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle — "Idle and shutdown", "Persist data rather than using global variables" |
| Chrome permissions list | https://developer.chrome.com/docs/extensions/reference/permissions-list — `management`, `sidePanel`, `tabs` |
| Chrome Tabs API | https://developer.chrome.com/docs/extensions/reference/api/tabs — "Permissions" |
| Firefox `tabs.reload()` | https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/reload — "Syntax" |
| Chrome Side Panel API | https://developer.chrome.com/docs/extensions/reference/api/sidePanel — "Permissions", "Open the side panel by clicking the toolbar icon", "`setPanelBehavior()`" |
| Firefox `sidebar_action` | https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/sidebar_action — "Syntax" |
| WXT entrypoints | https://wxt.dev/guide/essentials/entrypoints.html — "Side Panel" |
| VS Code extension bisect | https://code.visualstudio.com/blogs/2021/02/16/extension-bisect — "Welcome extension bisect", "Troubleshoot faster" |
| Chrome Web Store permission policy | https://developer.chrome.com/docs/webstore/program-policies/permissions — "Use of permissions" |
| Mozilla add-on policies | https://extensionworkshop.com/documentation/publish/add-on-policies/ — "No Surprises", "Development Practices" |

---

## 20. Maintaining this document

This is a target-design document. Update it when the design changes, and move
as-built details into `ARCH.md` when implementation lands. Keep the ADR links and
the references current. When this document and the code disagree **after**
implementation, the code wins and `ARCH.md` is the as-built source; record the
deviation here or supersede the affected ADR.
