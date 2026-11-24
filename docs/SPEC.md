# Browser Extension Bisect — v1 Specification

**Status**: ready-for-agent
**Source**: [TECH_DESIGN.md](TECH_DESIGN.md), ADR-008..ADR-015 in [DECISIONS.md](DECISIONS.md)
**Vocabulary**: [GLOSSARY.md](GLOSSARY.md)
**Implementation tickets**: [ISSUES.md](ISSUES.md) (`ISS-002`..`ISS-013`)

> This spec describes the intended v1 behaviour. The repository currently contains the
> scaffold documented in [ARCH.md](ARCH.md); implementation retires it and removes
> `ISS-001` once verified. When this document and the code disagree during implementation,
> the code is the current state and this document is the intended state; update both in the
> same change.

## Problem Statement

A user installs several browser extensions, then a page breaks, slows down, fails to log
in, or shows a visual glitch. Finding the responsible extension by disabling one at a
time is linear, tedious, and error-prone. The user has to remember which extensions were
touched, keep a mental note of the current page state, and reverse every change manually.
Closing the browser or forgetting a step leaves extensions disabled.

The two target browsers behave differently. Chrome lets an extension with the
`management` permission toggle other regular extensions. Firefox rejects the same call for
normal installs, so a Chrome-only design cannot be reused unchanged. A session can also be
interrupted by the browser itself: Chrome terminates an MV3 service worker after roughly
30 seconds of idle time, and either browser can restart while the user is testing. If the
session lives only in memory, the user loses the search and may be left with a reduced
browser.

There is also no trustworthy record. A user who misclicks a verdict has no way to correct
it, and a user who wants to understand the conclusion cannot inspect the trials. The
current project only has a scaffold with placeholder settings; it does not enumerate or
toggle extensions at all (`ISS-001`).

## Solution

Ship one extension with a side panel on Chrome and a sidebar on Firefox. The side panel
runs a guided bisect:

1. Snapshot the enabled regular extensions and let the user exclude known-good ones.
2. Establish an all-off baseline so the symptom is attributed to an extension rather than
   to the browser or the site.
3. Repeatedly split the suspect pool in half, apply one half, reload the bound test tab,
   and ask the user whether the problem persists or is gone.
4. Name a culprit and leave it disabled until the user presses Restore, or report an
   honest inconclusive result when the evidence contradicts a single culprit.
5. Record every step in an append-only bisect log that survives panel closure, worker
   termination, and browser restart. The user can inspect the history, correct a verdict on
   a copy of the log, and replay the search without changing any extension.

Chrome runs the automated mode through `management.setEnabled()`. Firefox runs the
assisted mode: the add-on computes the batch, the user applies it in `about:addons`, and
the add-on verifies the result through `management` events and `getAll()`. Enterprise-policy
Firefox installs may use the automated path when the browser permits it.

The add-on requests only `storage`, `management`, and Chrome's `sidePanel`. It has no host
permissions, no `tabs` permission, no telemetry, and no remote code.

## User Stories

1. As a person whose page breaks after installing several extensions, I want the add-on to
   list my enabled extensions as candidates, so that I can start from the real suspects
   instead of remembering what I installed.
2. As a user, I want themes, apps, disabled add-ons, policy-locked add-ons, and the bisect
   add-on itself excluded from candidates, so that I never waste a trial on something that
   cannot be the cause.
3. As a user, I want each ineligible extension shown with a reason, so that I understand
   why it is not in the search.
4. As a user, I want to uncheck known-good extensions, so that I can shorten the search
   when I already have evidence.
5. As a user, I want my exclusions to persist, so that I do not repeat the selection on
   the next session.
6. As a user with many extensions, I want to search the candidate list by name, so that I
   can find one quickly in a narrow side panel.
7. As a user, I want candidates ordered deterministically, so that the trial sequence is
   stable and reproducible.
8. As a user, I want a pre-flight screen that lists exactly which extensions will be
   toggled, so that I can consent before anything changes.
9. As a user, I want the pre-flight screen to explain that the culprit stays disabled
   until I press Restore, so that I am not surprised by the end state.
10. As a user, I want to bind the open tab that reproduces the symptom as the test tab, so
    that the add-on reloads the right page after each batch.
11. As a user, I want a clear warning when no eligible extension exists, so that I do not
    start a search that cannot succeed.
12. As a user, I want the add-on to start only after an explicit button press, so that
    opening the panel never changes my browser state.
13. As a user, I want an all-off baseline before the search, so that I know whether an
    extension is responsible at all.
14. As a Chrome user, I want the add-on to disable all candidates automatically for the
    baseline, so that I do not have to toggle them by hand.
15. As a Firefox user, I want the option to verify the problem in Troubleshoot Mode and
    attest that it is gone, so that I can establish the baseline in one step.
16. As a Firefox user, I want a manual disable-all checklist with a link to the Add-ons
    Manager, so that I can establish the baseline when Troubleshoot Mode is not suitable.
17. As a Firefox user, I want the add-on to verify my manual all-off state, so that a
    missed toggle does not invalidate the baseline.
18. As a user, I want the add-on to tell me when the baseline still shows the problem, so
    that I stop blaming extensions and restore my browser.
19. As a user, I want a clear answer when exactly one candidate is eligible, so that I get
    the culprit without an unnecessary search.
20. As a Chrome user, I want each trial to enable one half of the suspects and disable the
    other half, so that I eliminate about half the candidates per answer.
21. As a user, I want a verdict of "Problem persists" or "Problem is gone", so that I can
    answer in terms of my symptom rather than abstract good or bad.
22. As a user, I want cleared extensions kept enabled during later trials, so that my
    normal environment is preserved and interactions surface early.
23. As a user, I want progress such as "Trial N of ~M · S suspects", so that I know how
    much work remains.
24. As a user, I want the add-on to run a final confirmation before naming a culprit, so
    that it does not guess from a single ambiguous result.
25. As a user, I want the culprit left disabled and clearly identified, so that I can
    verify the fix and act on it.
26. As a user, I want an inconclusive result with the remaining suspects when my answers
    contradict a single culprit, so that I am not given a false answer.
27. As a user, I want to retry a trial when the symptom is flaky, so that one bad
    observation does not derail the search.
28. As a Firefox user, I want each trial to show which extensions to enable and which to
    disable, so that I can apply the batch precisely.
29. As a Firefox user, I want a button that opens the Add-ons Manager, so that I can make
    the changes without hunting for the page.
30. As a Firefox user, I want the add-on to watch `management` events and verify my
    changes, so that the search continues as soon as the batch matches.
31. As a Firefox user, I want the verdict buttons to appear only after the batch is
    verified, so that I cannot answer against the wrong state.
32. As a Firefox user, I want a manual restore checklist with verification, so that I can
    return every touched extension to its original state.
33. As a Firefox user with an enterprise-policy install, I want the add-on to use the
    automated path when the browser permits it, so that I get the faster flow.
34. As a user, I want Restore to be visible on every screen, so that I can undo the
    session at any time.
35. As a user, I want Restore to touch only extensions the session changed, so that
    unrelated extensions are never modified.
36. As a user, I want Restore to report any extension it could not re-enable, so that I
    know what to fix manually.
37. As a user, I want a warning that uninstalling the add-on before Restore leaves
    extensions disabled, so that I do not strand my browser in a reduced state.
38. As a user, I want my session to survive closing the side panel, so that I can reopen it
    without losing progress.
39. As a Chrome user, I want my session to survive the service worker being terminated, so
    that an idle browser does not erase the search.
40. As a user, I want to resume or restore an unfinished session after a browser restart,
    so that I am never stuck with disabled extensions.
41. As a user with multiple windows, I want every side panel to show the same session, so
    that two panels cannot fork the search.
42. As a user, I want a history of the baseline, trials, batches, and verdicts, so that I
    can see how the conclusion was reached.
43. As a user, I want to correct a verdict on a copy of the log and replay the search, so
    that a misclick does not force a full rerun.
44. As a user, I want the replay to show whether the recorded batches differ from the
    recomputed ones, so that I can trust the diagnosis.
45. As a user, I want the replay to tell me when the edited log is invalid, so that I can
    fix the correction instead of guessing.
46. As a user, I want to copy the log and a human-readable report, so that I can keep or
    share the evidence.
47. As a user, I want the replay to state that it does not change installed extensions, so
    that I do not confuse diagnosis with action.
48. As a user, I want the add-on to detect when the actual extension state differs from the
    expected trial state, so that manual changes do not silently corrupt the result.
49. As a user, I want Re-sync, Undo, and Restore actions when drift is detected, so that I
    can choose the right recovery.
50. As a user, I want to undo the last verdict when the state is still consistent, so that
    a misclick does not require a new session.
51. As a user, I want a failed toggle to abort the trial and restore the previous state, so
    that my browser is not left half-changed.
52. As a Chrome user, I want a single "Enable with click" action when a re-enable needs
    user activation, so that I can complete the restore.
53. As a Chrome user, I want clear manual-recovery instructions when a greylisted or
    policy-locked extension cannot be re-enabled, so that I know where to go.
54. As a user, I want a warning when an extension is installed, updated, or removed
    mid-session, so that I know the candidate snapshot is stale.
55. As a user, I want the add-on to handle a closed test tab or a page that never settles,
    so that I can still give a verdict.
56. As a user, I want the add-on to surface storage failures instead of silently losing the
    log, so that I can trust the session.
57. As a user, I want the add-on to request only storage, extension-management, and
    side-panel access, so that it cannot read my pages or browsing history.
58. As a user, I want no telemetry, analytics, or remote code, so that my extension data
    stays in my browser.
59. As a Chrome user and a Firefox user, I want the same flow and wording, so that
    switching browsers does not mean relearning the tool.
60. As a keyboard or screen-reader user, I want a compact layout with meaningful labels and
    live announcements, so that I can complete the flow without a mouse.
61. As a user, I want extension names to be readable even when icons are unavailable, so
    that I can identify candidates.
62. As a maintainer, I want the bisect algorithm, event reducer, and replay to be pure
    functions, so that I can test edge cases deterministically without a browser.
63. As a maintainer, I want platform differences isolated behind one management port, so
    that the engine and UI stay shared across Chrome and Firefox.
64. As a maintainer, I want a fake management port and contract tests, so that adapter
    error mapping and assisted verification are verified without a real browser.
65. As a maintainer, I want the existing E2E harness to install fixture extensions and drive
    the side panel, so that the full flow is verified on both browsers.
66. As an agent or operator, I want `npm run agent:verify` to remain the completion gate, so
    that lint, typecheck, unit tests, builds, and E2E all pass before a change is
    considered done.

## Implementation Decisions

### Product shape and UI

- **Side panel only.** The WXT side panel entrypoint is the only product UI. Chrome renders
  it through the `side_panel` API and Firefox through `sidebar_action`. The popup is retired
  (ADR-009). On Chrome, the panel is configured to open when the toolbar action is clicked;
  Firefox uses the generated sidebar action.
- **Screens.** No session, candidate picker, pre-flight consent, baseline (automated,
  manual, or external), trial (automated or assisted), history, completed, inconclusive,
  replay result, drift/paused, and restore. Each screen has one primary action.
- **Narrow layout.** A single vertical column sized for a side panel. Plain hand-written CSS
  over the existing custom-property token layer (ADR-005); no UI framework and no new
  hard-coded colours or spacing values.
- **Stable selectors and accessibility.** Every meaningful node carries a stable
  `data-testid` and an accessible name. State changes are announced through `aria-live`.
- **Copy rules.** Verdict labels are exactly **"Problem persists"** and **"Problem is
  gone"**; never "good" or "bad" in user-facing UI. Progress reads "Trial N of ~M · S
  suspects". Restore is never hidden behind a menu. Extension rows prefer names over icons;
  icons from `management` may not be web-accessible across extensions, so initials are the
  fallback.

### Platform constraints

- **Chrome** allows `management.setEnabled()` for regular extensions. It usually works from
  the background service worker without a user gesture. The exception is re-enabling an
  extension whose permissions increased: that call needs user activation and returns
  `kGestureNeededForEscalationError` otherwise. Re-enabling a greylisted extension is
  rejected for extension callers; only `chrome://extensions` can do it.
- **Firefox** rejects `management.setEnabled()` for a regular extension unless the calling
  add-on itself was installed by enterprise policy. `management.getAll()` returns only
  `extension` and `theme` types. `onEnabled` / `onDisabled` are the assisted completion
  signal. The Firefox build stays Manifest V2 with the pinned gecko id (ADR-002).
- **MV3 lifecycle.** Chrome terminates the service worker after roughly 30 seconds of idle
  time. Firefox's background page is persistent, but the design treats both the same way:
  storage is canonical and no module-level session object is authoritative.

### Domain model and invariants

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

The following invariants are binding:

1. **One active session per browser profile.** A second side panel joins the existing
   session instead of starting another.
2. **The candidate snapshot is immutable.** Extensions installed or updated after the
   session starts do not join; they are reported as a warning.
3. **Every candidate is enabled at session start.** Disabled extensions are not suspects.
4. **The suspect set only shrinks.** `cleared = candidates - suspects`, and every cleared
   candidate is kept enabled during later trials.
5. **The current trial partitions the suspects.** One half is enabled, the other is
   disabled; every non-suspect is enabled.
6. **The single-culprit assumption is explicit.** A contradiction produces `inconclusive`,
   never a silent blame.
7. **Restore only touches extensions the session changed.** Untouched extensions are never
   modified.
8. **The log is append-only during a live session.** Replay edits operate on a copy, not on
   the audit log.

### Candidate eligibility and ordering

Eligibility is intrinsic and reports a reason for every extension it rejects:

```text
enabled at session start
type === "extension"
id !== self.id
mayDisable === true
```

The UI lists ineligible extensions separately with a reason: theme or app, disabled at
start, policy-locked, or this add-on. A **user exclusion** is not an eligibility failure: it
is a preference held only in `config.excludedExtensionIds`, so `eligible` is the single source
for pickable candidates and the picker renders an excluded candidate as an unchecked row
([ADR-016](DECISIONS.md)). The order is captured once at start, sorted by display name and
then id, and stored in the `session-started` event. Replay uses the stored order, so it never
depends on locale or a later `management.getAll()` order.

### Baseline check

| Mode | Target | Behaviour |
|---|---|---|
| `auto` (Chrome) | All candidates disabled. | Apply, verify, reload the test tab, ask the baseline verdict. `persists` means a host issue; restore and abort. `gone` proceeds. |
| `manual` (Firefox) | All candidates disabled by the user. | Show the checklist, verify through `management` events and `getAll()`, then ask the baseline verdict. |
| `external` (Firefox) | All extensions off outside the add-on. | The user verifies the all-off result in Troubleshoot Mode and attests that it is gone; record `external-clean` and proceed at full-enabled state. |

The external mode is recommended for Firefox because Troubleshoot Mode disables all
extensions, including this add-on, in one step. Manual disable-all remains the verifiable
fallback. The baseline is a recorded verdict, not an assumption. For `N = 1`, the baseline
is the answer: an all-off `gone` returns that candidate as the culprit, and an all-off
`persists` is a host issue. For `N = 0`, block the start with "No eligible enabled
extensions."

### Partition loop

At every trial, the target state is:

```text
all candidates outside suspects: enabled
suspects[0 .. mid-1]:             enabled
suspects[mid ..]:                 disabled
mid = floor(suspects.length / 2)
```

For `suspects.length === 1`, this yields `enabled = []` and `disabled = [suspect]`, which
is the final confirmation trial. The suspect set strictly shrinks until that point. If the
final confirmation still shows the symptom, or the suspect set becomes empty, the session
ends `inconclusive`; it never blames the last suspect.

The **disabled** half is the last `floor(n / 2)` suspects, so an odd pool gives its extra
candidate to the enabled half and `n = 3` is 2 enabled / 1 disabled. Only that reading
satisfies the worked `N = 24` example, where Trial 4 must enable 7–8 and disable 9 alone;
reading the code block above as "the first `mid` suspects are enabled" would enable 7 alone
and disable 8–9, which contradicts the trace. The trace is the authoritative test reference.

Step count:

- Baseline: 1 trial.
- Partitioning: `ceil(log2 N)` trials for `N >= 2`.
- Final confirmation: 1 extra trial when the last partition left the lone suspect
  **enabled**; no extra trial when it left the suspect disabled and the verdict was `gone`.
- Worst case: `1 + ceil(log2 N) + 1`.

The worked `N = 24` example in the technical design is the reference for tests.

### Management port and adapters

The engine, session orchestration, and UI depend on one platform-neutral port. The compact
interface below is taken from the accepted technical design:

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

`TargetState` is a map of candidate id to the desired `enabled` value for the trial, not a
full dump of every installed extension. The adapter diffs against the current
`management.getAll()` result and toggles only what changed. This keeps each round to at
most `N/2` toggles and avoids needless reloads.

**Chrome automated adapter.** Enumerate with `management.getAll()`, keep
`type === "extension"`, exclude self, and filter enabled candidates for `startSession`.
Pre-filter `mayDisable`. Apply sequential `setEnabled` calls over the diff, collect per-id
errors, then verify. Map errors:

- policy-check failure → `policy-blocked`;
- `kGestureNeededForEscalationError` → `needs-user-gesture`, retried from a side-panel
  click handler;
- `kCannotReEnableGreylistedError` → `manual-recovery-required`;
- `kNoExtensionError` → `extension-removed`;
- requirements failure → `unsupported-requirements`.

Restore applies `setEnabled` for every touched candidate whose original state differs from
the current state, reports failures, and never claims success when a re-enable failed.

**Firefox assisted adapter.** Enumerate the same way. `canAutoToggle` is true only when
`management.getSelf().installType === "admin"`; that is the enterprise-policy exception,
not the default. Assisted apply returns a `ManualBatch` with `enableIds` and `disableIds`
and does not mutate. Verify compares each candidate's `enabled` flag with the target;
`onEnabled` / `onDisabled` events debounce a re-verify, and the user can press Verify.
Restore returns a manual checklist and verifies completion; the session remains
`restore-pending` until the state matches or the user explicitly accepts the remaining
differences. If the add-on itself is policy-installed, the adapter uses the automated path
with the same diff and error handling as Chrome.

**Drift.** `verifyState` compares the expected enabled map for the current trial with
`management.getAll()`. A mismatch pauses the session with a `DriftReport` containing
expected and actual states, pending manual toggles, unexpected toggles outside the current
trial, and disappeared candidates. The UI offers Re-sync (apply the expected state again),
Undo last verdict (when the previous trial state can be restored), and Restore all.

### Storage and event log

Two versioned items are canonical:

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

`testTab.url` is nullable: without the `tabs` permission (ADR-012) neither Chrome nor Firefox
exposes `tab.url` to the add-on, so `tabs.query()`/`tabs.get()` return the id only and the
binding records `null`. The URL is stored when the browsing context happens to expose it (test
and DOM contexts) and the UI then renders `Tab #N · <url>`, otherwise `Tab #N`
([ADR-017](DECISIONS.md)).

Config falls back to `{ schemaVersion: 1, excludedExtensionIds: [], testTab: null }`; the
log falls back to `null`. The legacy scaffold keys `local:enabled`,
`local:interactionCount`, and `local:settings` are deleted on the first background start.
This is a pre-release project with no data to migrate; a future shape change gets a new
`schemaVersion` and an explicit migrator.

The event schema is:

| Event | Payload | Purpose |
|---|---|---|
| `session-started` | `{ candidateOrder, capability, baselineMode, testTab }` | Immutable snapshot and replay seed. |
| `baseline-recorded` | `{ mode, verdict }` | Host attribution. |
| `trial-started` | `{ round, enabledIds, disabledIds }` | The intended partition. |
| `trial-applied` | `{ round, errors }` | What actually happened. |
| `verdict-recorded` | `{ round, verdict }` | The oracle result. |
| `trial-retried` | `{ round, reason }` | Re-run without a verdict. |
| `verdict-undone` | `{ round }` | Live correction. |
| `session-paused` | `{ reason, drift? }` | Interruption or drift. |
| `session-resumed` | `{ reason }` | Resumption. |
| `session-completed` | `{ culpritId }` | Success. |
| `session-inconclusive` | `{ ambiguityIds, reason }` | Honest non-result. |
| `session-reset` | `{ restored, errors }` | Teardown audit. |

Events are append-only during a live session. The log is capped at 500 events; a bisect uses
a few dozen at most. If the cap is reached, the session fails closed with a storage error
rather than silently dropping audit data.

Only the background writes the log and config. Every mutating message enters a serialized
promise queue, rehydrates the log, applies the event, persists, and then responds. The side
panel never writes the log. The one exception is the Chrome permissions-escalation retry:
the side panel may call `management.setEnabled` from a click handler because user activation
does not cross a runtime message; it reports the result to the background, which records the
outcome. No handler may depend on a module-level session object; the log and config are the
canonical state, and the derived session view is recomputed from the log.

### Messaging protocol

All IPC goes through the typed messaging protocol; there is no raw `runtime.sendMessage` in
extension code.

| Message | Payload | Returns | Direction |
|---|---|---|---|
| `getCapabilities` | — | `CapabilityReport` | side panel → background |
| `listCandidates` | — | `{ eligible, ineligible }` | side panel → background |
| `getConfig` | — | `BisectConfig` | side panel → background |
| `updateConfig` | `Partial<BisectConfig>` | `BisectConfig` | side panel → background |
| `getSession` | — | `SessionView \| null` | side panel → background |
| `startSession` | `{ candidateIds, baselineMode, testTab }` | `SessionView` | side panel → background |
| `applyTrial` | — | `SessionView` or `ManualBatch` | side panel → background |
| `submitVerdict` | `{ verdict }` | `SessionView` | side panel → background |
| `retryTrial` | `{ reason? }` | `SessionView` | side panel → background |
| `undoLastVerdict` | — | `SessionView` | side panel → background |
| `resetSession` | `{ restore: boolean }` | `SessionView` | side panel → background |
| `getLog` | — | `BisectLog` | side panel → background |
| `replayLog` | `{ log }` | `ReplayResult` | side panel → background |
| `bindTestTab` | `{ tabId, url }` | `BisectConfig` | side panel → background |
| `reloadTestTab` | — | `{ ok, error? }` | side panel → background |
| `getDrift` | — | `DriftReport` | side panel → background |
| `recordEscalationResult` | `{ extensionId, ok, error? }` | `SessionView` | side panel → background |

The scaffold messages `getContentMarker`, `getContentStatus`, `getTabId`, `updateState`, and
`recordInteraction` are retired with the scaffold. The side panel watches the persisted log
(or a background `sessionChanged` broadcast) so multiple panels and windows converge on the
same session view.

### Session lifecycle

| Status | Meaning | Allowed next |
|---|---|---|
| `preparing` | Candidate picker is open; no toggles yet. | `baseline`, `aborted` |
| `baseline` | Baseline batch is being applied or the baseline question is open. | `trial`, `aborted` |
| `trial` | The next partition is being prepared. | `applying` |
| `applying` | Chrome toggles are in flight. | `awaiting-verdict`, `paused`, `aborted` |
| `awaiting-verdict` | Batch applied or verified; the user is testing. | `trial`, `completed`, `inconclusive`, `paused` |
| `awaiting-manual-toggle` | Firefox is waiting for the user to match the batch. | `awaiting-verdict`, `paused`, `aborted` |
| `paused` | Drift or interruption; needs a decision. | `trial`, `awaiting-verdict`, `aborted` |
| `completed` | Culprit isolated; culprit left disabled. | `restored`, new session |
| `inconclusive` | Ambiguity or contradiction; no culprit. | `restored`, new session |
| `aborted` | User stopped; restore is pending or declined. | `restored`, new session |
| `restored` | All touched candidates are back to their original states. | `preparing`, new session |

`restored` is a terminal audit state; starting another session creates a new log.

**Live undo.** `undoLastVerdict` is allowed only for the most recent trial and only if the
browser can return to the previous trial state without ambiguity. It verifies the current
state, appends `verdict-undone`, re-applies the previous trial's target state, and returns
the view to `awaiting-verdict`. If the state has drifted, the UI requires Re-sync or Restore
first.

**Replay.** Replay is diagnostic only; it never toggles extensions. Input is a copied log
with one or more corrected verdicts. It validates the `session-started` event and candidate
order, recomputes the baseline and each partition from the verdict sequence, ignores the
recorded `trial-started` sets as authoritative while comparing and reporting differences,
and stops at the first invalid sequence. The result reports `culpritId` or
`ambiguityIds`, recomputed trials, `batchDifferences`, and a `validationError` when the
edited log is structurally invalid. The UI explains that replay does not change installed
extensions; if the replayed culprit differs, the user can copy the report and start a new
session.

**Restore.** Every candidate is enabled at session start, so the original enabled map is the
candidate snapshot; `touchedIds` is derived from the applied baseline and trial events.
Restore computes the original state for every touched candidate, applies it on Chrome or
presents a verified checklist on Firefox, appends `session-reset` with `restored` and any
errors, and leaves untouched extensions alone. If a candidate disappeared, restore reports
it; if a new extension appeared, restore leaves it. If a re-enable fails because of the
greylist or a policy, restore reports `manual-recovery-required` and does not claim a full
restore. On success, the culprit stays disabled by design (ADR-013); Restore is the explicit
action that re-enables it. On abort, the UI asks "Restore all extensions?" and defaults to
yes. On startup with an unfinished session, the UI offers Resume or Restore.

### Test tab

The user binds the tab that reproduces the symptom. The config stores `{ tabId, url }`, where
`url` is `null` whenever the browser does not expose it (no `tabs` permission — [ADR-017](DECISIONS.md)).
After each batch: apply or verify the management state, `tabs.reload(tabId)`, wait for the
tab to reach `status === "complete"` through `tabs.onUpdated` with a timeout (for example
15 seconds), and then ask for the verdict. If the tab is gone, the UI prompts the user to
rebind or continues without automatic reload. `tabs.reload` needs no permission; only the
tab id is used, so the `tabs` permission stays off.

### Consent, privacy, and permissions

Before the first toggle, show a confirmation screen that lists the candidates that will be
toggled, explains that the culprit remains disabled until Restore, explains Firefox's manual
mode when applicable, links to Restore and the log, and requires an explicit "Start
baseline" click.

Privacy and store-policy rules:

- No telemetry, analytics, crash reporting, or remote code.
- The log stays in local storage; export is user-initiated.
- The add-on reads extension metadata and enabled state only; it does not read page content,
  URLs, history, or tabs beyond the bound test tab id.
- No host permissions, so the add-on cannot inspect the symptom itself.
- Permissions are `storage`, `management`, and Chrome's `sidePanel` only. Drop
  `<all_urls>`, the content script, and the `tabs` permission.
- The extension remains single-purpose (extension bisection) and collects no data.

### Error handling

| Condition | Detection | Behaviour |
|---|---|---|
| Host issue | Baseline verdict `persists` | Restore, abort, explain that no extension is implicated. |
| No eligible candidates | `listCandidates` returns empty | Block start. |
| One eligible candidate | Candidate count is 1 | Baseline is the answer; no partition loop. |
| Policy-locked candidate | `mayDisable === false` | Show in the ineligible list; exclude. |
| Toggle failure | `setEnabled` rejection | Abort the trial, restore the previous target, report the id and code. |
| Greylist re-enable failure | `kCannotReEnableGreylistedError` | Mark `manual-recovery-required`; link `chrome://extensions`; Restore reports incomplete. |
| Permissions escalation | `kGestureNeededForEscalationError` | Show "Enable with click"; the side panel retries; if declined, restore or inconclusive. |
| Extension removed mid-session | `kNoExtensionError` / `onUninstalled` | Pause; invalidate the current trial; offer restore or restart. |
| Extension installed mid-session | `onInstalled` | Warn; do not join the snapshot. |
| Extension updated mid-session | Version mismatch in `getAll` | Warn; pause if behaviour may have changed. |
| Manual drift | `verifyState` mismatch | Pause; show expected vs actual; Re-sync, Undo, or Restore. |
| Test tab closed | `tabs.reload` rejects or tab id missing | Prompt rebind; allow a verdict without reload. |
| Tab never settles | `tabs.onUpdated` timeout | Ask the user to reload manually; do not block the verdict. |
| Browser restart | `onStartup` plus log | Reconcile; offer Resume or Restore. |
| Panel closed | Log persisted | Reopen and resume; no state loss. |
| Multiple panels | Shared log | All panels show the same session; commands are serialized. |
| Storage write fails | Rejected write | Fail the command; keep the previous log; surface the error. |
| `management.getAll` fails | Rejection | Capabilities unavailable; block start. |
| `about:addons` cannot open | `tabs.create` rejects | Show instructions and a copyable list. |
| Final contradiction | Lone suspect disabled but symptom persists | Inconclusive with the ambiguity set; restore or restart. |
| Replay invalid log | Validator error | Show the first invalid event; no toggles. |
| User aborts | UI action | Prompt "Restore all?" (default yes); record the decision. |

### Test-mode hooks

`isTestMode()` remains a build-time gate. The scaffold's `?tabId=` handling and tab-id DOM
marker are retired with the popup and content script. The remaining test hooks are the
`[EXT_BG_ERR]` error logging contract, the `[EXT_BG_READY]` startup line, and any fixture or
manual-driver hook required by the assisted Firefox E2E. Test-only hooks must be documented
and stripped from production builds.

### Decision references

- ADR-008: split extension management behind a capability adapter.
- ADR-009: make the WXT side panel the primary UI.
- ADR-010: set bisection with a mandatory baseline.
- ADR-011: persist an event-sourced bisect log in local storage.
- ADR-012: replace the scaffold and minimize permissions.
- ADR-013: keep the culprit disabled and require explicit restore.
- ADR-014: ship human verdicts only in v1.
- ADR-015: report non-single-culprit outcomes as inconclusive.

## Testing Decisions

### What makes a good test

- Test external behaviour through a public seam, not private helpers or implementation
  details. A test should still pass if an internal module is refactored.
- Unit and component tests must be deterministic and browser-free. Real browsers belong in
  the E2E layer.
- Assert user-visible outcomes and message results, not call counts or internal event
  ordering beyond the documented contract.
- Use stable `data-testid` selectors and accessible names; never assert on CSS classes or
  layout.
- The E2E report must state which path it exercised. It must not claim to test a path it
  did not run.

### Seams

The primary seam is the **typed messaging protocol** between the side panel and the
background. Tests mount the side panel and register the real background handlers backed by
`fakeBrowser` storage plus a fake `ManagementPort`. This drives the candidate picker,
baseline, trials, verdicts, completion, restore, and replay through the same messages the
real UI uses. Prior art: the existing popup component tests, messaging round-trip tests, and
the `installMessagingBridge()` helper.

The second seam is the **pure engine, event reducer, and replay functions**. Tests cover
partitioning, transitions, step counts, edge cases, event reduction, config cleanup, and
replay validation directly. Prior art: the existing pure storage-helper tests. This seam is
new but sits at a module boundary that the design already requires; it keeps the algorithmic
edge cases fast and deterministic.

The third seam is the **`ManagementPort` fake and the injectable management surface**.
Session and adapter contract tests script candidates, toggles, errors, and events. The
Chrome adapter's error mapping and the Firefox assisted verification need an injectable
`management` surface because `fakeBrowser` does not provide a `management` API. Keep the
fake at the port boundary, not inside individual UI components.

The fourth seam is the **existing E2E harness**. It installs the add-on plus fixture
extensions, opens the side panel directly, and asserts the side panel and management state.
Chrome runs the full automated flow. Firefox runs the assisted flow either through real
`about:addons` automation or the documented test-mode driver; the report states which path
ran. The harness acts as the human oracle by observing the fixture page and clicking
verdicts; fixture extensions inject unique markers and one culprit fixture reproduces the
symptom.

### Modules to test

- Candidate eligibility, ordering, and ineligible reasons.
- Partition, transitions, step count, edge cases, retry, and completion/inconclusive states.
- Event append rules, reducer output, config fallback and legacy cleanup, log cap.
- Replay validation, recomputation, and batch differences.
- Chrome adapter diffing, error mapping, restore, and drift.
- Firefox assisted batches, verification, restore, and enterprise capability.
- Side panel screens: no session, candidate picker, pre-flight, baseline, trial, history,
  completed, inconclusive, replay, drift, restore.
- Background orchestration: serialization, rehydration, startup reconciliation.
- End-to-end automated and assisted flows.

### Test isolation and prior art

Use `fakeBrowser.reset()` per test, `messenger.removeAllListeners()`, and the existing
`installMessagingBridge()` helper. Keep fixture pages on the local fixture server; no live
third-party sites. Prior art for component and messaging tests is the existing popup suite;
prior art for E2E is the existing cross-browser harness and its fixture server.

### Quality gates

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build:all
npm run test:e2e
```

`npm run agent:verify` remains the completion gate. It must exit 0 with zero page errors and
zero `[EXT_BG_ERR]` entries on both browsers.

**Caveat:** E2E exercises test-mode builds, not production bundles. Production-only
regressions are possible; keep the test hooks thin and verify the production manifest
separately when it changes.

## Out of Scope

- An automated DOM oracle (test URL plus CSS selector) that decides verdicts without a
  human. Deferred by ADR-014; the `Verdict` boundary in the engine is the seam.
- Delta debugging (`ddmin`) and multi-culprit isolation. Deferred by ADR-015.
- Themes, hosted apps, packaged apps, and login-screen extensions. They are not candidates.
- Safari, Edge, Opera, and other Chromium derivatives as first-class targets.
- Migrating Firefox to Manifest V3. The Firefox build stays MV2 per ADR-002.
- Publishing and review automation for the Chrome Web Store or addons.mozilla.org.
- Native helpers or companion applications for Firefox.
- Any form of telemetry, analytics, or remote code.
- i18n, log import, incognito policy, and enterprise Firefox as a primary distribution
  target.
- Code, configuration, or test changes in this spec/ticket-writing task. Implementation is
  tracked in the tickets.

## Further Notes

- **Target versus as-built.** This spec and the technical design describe the intended
  state. `ARCH.md` describes the scaffold. During implementation, update `ARCH.md`,
  `CHANGELOG.md`, `GLOSSARY.md`, `ISSUES.md`, `NOTES.md`, `RUNBOOK.md`, `TECH_DEBT.md`, and
  `TOOLS.md` in the same change as the code. When the document and the code disagree after
  implementation, the code wins and `ARCH.md` is the as-built source.
- **ADR mapping.** ADR-008 covers the capability adapter, ADR-009 the side panel, ADR-010
  the set bisection, ADR-011 the event log, ADR-012 the scaffold retirement and permissions,
  ADR-013 the culprit-left-disabled policy, ADR-014 the human-only verdict, and ADR-015 the
  inconclusive outcome.
- **Implementation sequence.** The tracker slices the work into twelve vertical tickets:
  side panel and candidate picker; Chrome baseline and restore; Chrome partition loop;
  Firefox assisted baseline; Firefox assisted trials and restore; history and copy; replay;
  drift and undo; toggle failures and escalation; mid-session changes; startup and
  multi-panel; scaffold retirement. Each ticket declares its blocking edges in `ISSUES.md`.
- **Risks.** Chrome greylist re-enables can fail; policy locks can change mid-session; an
  add-on uninstall leaves disabled states behind; human misreporting is the main source of
  error; flaky symptoms need retry rather than guessing. The UI must detect and report each
  of these rather than claiming success.
- **No migration.** The project is pre-release. The placeholder scaffold keys are deleted on
  first start; no migration is invented for placeholder values.
- **No time estimates.** The ticket order and dependencies are the plan; timing is left to
  the implementer.
