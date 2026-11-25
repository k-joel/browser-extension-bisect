# Issues

Ongoing issue tracker for open bugs, defects, and gaps found while working on
this repository — by humans or by LLM sessions.

<!--
ISSUES.md MAINTENANCE GUIDE (FOR AGENTS & CONTRIBUTORS)

PURPOSE & SCOPE
- Role: Single local-markdown tracker of currently OPEN bugs, defects, and
  actionable codebase, test, tooling, or documentation gaps.
- Audience: Humans and LLM agents working in this repository.
- Not for: Operational gotchas or non-defect notes (put those in NOTES.md),
  feature brainstorms/specs, or an archive of resolved issues.
- Implementation tickets live under `## Tickets`; they are feature slices, not
  defects.

UPDATE TRIGGERS
- Add an entry whenever a bug, defect, or gap is flagged during a session —
  however small, and even if only mentioned in passing in a summary.
- Update an existing entry in place if its cause or fix changes while open.
- Delete an entry immediately once its fix is completed and verified.
- Check this file before ending a session if any defect was found or fixed.

INCLUSION / EXCLUSION CRITERIA
- Include: Verified or directly observed defects, failing checks, and gaps.
- Exclude:
  - Operational gotchas and non-defect tips (move to NOTES.md).
  - Fixed or obsolete issues (delete rather than marking done).
  - Unverified guesses (inspect relevant files before recording).

STRUCTURE & FORMATTING
- Top-level sections: `# Issues`, short preamble, this guide, `## Open`, then
  `## Tickets`.
- Always keep `## Open` present, even when empty (leave no entries beneath it).
  Never create a `## Closed` or `## Resolved` section.
- ID scheme: `ISS-NNN` using the next free positive integer across both sections
  (highest existing ID + 1, or `1` if none exist). Never reuse an ID referenced
  in open work.
- Entry order: Ascending `ISS-NNN` under `## Open`, then ascending `ISS-NNN`
  under `## Tickets`.
- Ticket entries use the ticket template: `Spec`, `What to build`, `Blocked by`,
  `Status`, then acceptance checkboxes. They are not subject to the four-bullet
  defect schema below.
- Required fields per entry (exact order, four bullets):
  - `Symptom`: Observable error, failing command, or broken behavior.
  - `Where flagged`: `YYYY-MM-DD, <session or task context>`.
  - `Cause`: Backticked `path/to/file:line` and concise root cause
    (write `Unknown (not yet inspected)` only if uninvestigated).
  - `Suggested fix`: Concrete command, code change, or doc update.
- Formatting: Use ISO dates (`YYYY-MM-DD`) and backticks for file paths,
  line references (`file:line`), commands, and symbols.

QUALITY & STYLE RULES
- Be brief, factual, and direct; keep each bullet to 1–2 short sentences.
- Inspect `docs/ISSUES.md` and the affected files before editing. Never guess
  `file:line` locations, symptoms, or fixes.
- Make surgical edits only: preserve unrelated open entries verbatim.

LIFECYCLE & WORKFLOW
- Read first: Check existing entries in both sections to avoid duplicates and
  compute the next `ISS-NNN`.
- Reference & link: Refer to entries by `ISS-NNN` in commits or PRs (do not
  use GitHub `#<n>` syntax).
- Close by deleting: Local-markdown entries do NOT auto-close on PR merge.
  Delete the entire `### ISS-NNN` heading and its bullets once fixed (either
  in the fixing commit/PR or manually afterward). Apply the same deletion to
  completed tickets.
- Verify: Re-read the diff after editing to confirm schema compliance and
  that no unrelated lines changed.

ANTI-PATTERNS
- Marking an entry done, struck through, or moved to `## Closed` instead of
  deleting it.
- Logging operational gotchas or workarounds here instead of `NOTES.md`.
- Assuming GitHub tracker behavior (`#<n>` references or PR auto-closing).
- Omitting required bullets, writing long narratives, or guessing `file:line`.
- Reordering or reformatting existing open entries without cause.

EXAMPLE LAYOUT (4-SPACE INDENTED)
    ## Open

    ### ISS-NNN: <short, specific summary>

    - **Symptom**: `<command or action>` fails with `<brief observed error>`.
    - **Where flagged**: YYYY-MM-DD, <task or check where discovered>.
    - **Cause**: `<path/to/file>:<line>` <concise explanation of defect>.
    - **Suggested fix**: <exact command or minimal change>, then re-run
      `<verification command>`.
-->

---

## Open

### ISS-001: Bisect engine is unimplemented — settings have no runtime consumer

- **Symptom**: The product goal (binary-search faulty installed extensions) has no implementation; `BisectSettings.enabledExtensions` and `batchSize` are persisted, editable, and displayed by the popup, but no code enumerates or toggles other extensions.
- **Where flagged**: 2026-11-23, docs initialization session reviewing storage consumers.
- **Cause**: `utils/storage.ts:11-21` defines the settings scaffold; the only writers are `utils/state.ts:27` and the popup input, and nothing reads them to drive extension management.
- **Suggested fix**: Implement batch toggling in `entrypoints/background.ts` via the `management` API (adding the `management` permission in `wxt.config.ts`), then extend `tests/unit/` and the scenarios in `tests/e2e/verify.mjs`.

### ISS-015: Theme fixtures collide with Firefox's four built-in themes in E2E assertions

- **Symptom**: The Firefox run reports five `Theme or app` ineligible rows (four built-in themes plus the fixture), so an assertion that counts ineligible rows or assumes exactly one theme passes on Chrome and fails on Firefox.
- **Where flagged**: 2026-11-25, ISS-002 E2E work.
- **Cause**: `tests/e2e/fixtures/fixtures.mjs` cannot restrict `management.getAll()`; Firefox always exposes `default-theme`, `firefox-compact-light`, `firefox-compact-dark`, and `firefox-alpenglow`.
- **Suggested fix**: Keep every theme assertion in `tests/e2e/verify.mjs` existential (`some(row => row.reason === 'Theme or app')`) rather than count-based, and note the built-in themes in `docs/NOTES.md`.

---

## Tickets

Implementation slices for the v1 design in [SPEC.md](SPEC.md). Each ticket is a
vertical slice with its own acceptance criteria; delete the entry when the work
is complete and verified. All tickets are `ready-for-agent`.

### ISS-002: Side panel walking skeleton and candidate picker

- **Spec**: [SPEC.md](SPEC.md)
- **What to build**: Open the side panel on Chrome and the sidebar on Firefox and see the capability report plus the candidate picker. The background enumerates installed extensions, filters out ineligible ones with a reason, and returns eligible and ineligible lists through the typed messaging protocol. The user can search, select, and exclude candidates, and the selection persists in the versioned bisect config. Nothing is toggled in this ticket.
- **Blocked by**: None (can start immediately).
- **Status**: done-verified (2026-11-24, ISS-002 slice). Automatic toggle capability is reported but untested until ISS-003; ISS-014/015 track E2E follow-ups.

- [ ] Both targets build with a side panel/sidebar document and declare `management` and Chrome `sidePanel`; the scaffold's popup and host access may remain until ISS-013.
- [ ] The panel renders the no-session screen, capability report, and candidate picker with stable test ids and accessible names.
- [ ] Only enabled regular extensions that are not this add-on, not policy-locked, and not user-excluded are eligible; every ineligible extension is listed with a reason.
- [ ] Search filters by display name; selections and exclusions persist across panel close and reopen in a versioned bisect config.
- [ ] The background is the only writer; the panel reads and mutates through typed messages.
- [ ] Unit tests cover eligibility, ordering, config fallback, and message round-trips; component tests cover loading, empty, and ineligible states; E2E opens the side panel directly on both browsers and asserts the candidate list against fixture extensions.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run build:all`, and the slice E2E pass.

### ISS-003: Chrome automated baseline and Restore

- **Spec**: [SPEC.md](SPEC.md)
- **What to build**: On Chrome, start a bisect session from the candidate picker: bind the test tab, review the consent screen, and run the all-off baseline. The session snapshots the candidate order and original enabled states in the bisect log, disables every candidate through the management port, reloads the test tab, records the baseline verdict, proceeds on `gone`, and aborts as a host issue on `persists`. Restore is available on every screen and returns only touched candidates to their original states.
- **Blocked by**: ISS-002.
- **Status**: done-verified (2026-11-24, 93f8515). Firefox reports `assisted-capability-only` for the baseline until ISS-005.

- [x] Pre-flight lists the candidates, explains the culprit-left-disabled and restore policy, binds the current test tab, and requires an explicit Start.
- [x] Chrome disables every candidate, leaves non-candidates untouched, reloads the bound tab, waits for completion with a timeout, and asks the baseline verdict.
- [x] The baseline verdict is appended to the bisect log; `persists` aborts as a host issue and restores; `gone` advances to the first trial.
- [x] `N = 0` blocks start; `N = 1` resolves from the baseline and leaves the culprit disabled.
- [x] Restore is visible, touches only candidates the session changed, reports per-extension failures, and never claims a full restore when a re-enable fails.
- [x] Reloading the panel or terminating the worker rehydrates the session view from the log.
- [x] Unit and component tests with a fake management port cover baseline modes, host issue, `N = 0`, `N = 1`, and restore; the Chrome E2E scenario installs fixture extensions and asserts the all-off baseline and restore.
- [x] The quality gates pass.

### ISS-004: Chrome automated partition loop, culprit, inconclusive

- **Spec**: [SPEC.md](SPEC.md)
- **What to build**: After a clean baseline on Chrome, run the half-split search to completion. Each trial enables the first half of the suspect pool and disables the second half, keeps every cleared extension enabled, and asks for a verdict. The suspect pool shrinks until one candidate remains; a final confirmation decides whether to name the culprit. The culprit is left disabled; a contradiction produces an inconclusive result with the ambiguity set. The user can retry a trial without recording a verdict.
- **Blocked by**: ISS-003.
- **Status**: done-verified (2026-11-26, b26992c). The disabled half takes `floor(n / 2)` from the tail of the pool, because the mandated `N = 24` trace in `TECH_DESIGN.md:356-369` needs 7–9 enabled / 10–12 disabled at `n = 3`; see `NOTES.md` §partition-loop.

- [x] Partition uses `mid = floor(n / 2)`; non-suspects stay enabled; the suspect pool strictly shrinks each round.
- [x] `persists` keeps the enabled half; `gone` keeps the disabled half; cleared extensions stay enabled in later trials.
- [x] Final confirmation runs when the lone suspect is enabled; the culprit is recorded and left disabled.
- [x] Contradictions (empty suspect set or a persisting final confirmation) produce `inconclusive` with the remaining ambiguity set and a reason, never a silent blame.
- [x] Progress reads "Trial N of ~M · S suspects"; history entries show the batches and verdicts; retry re-applies the same target state without recording a verdict.
- [x] Unit tests cover the `N = 24` worked example, step counts, `N = 2`, `N = 3`, contradictions, and retry; the Chrome E2E scenario asserts the known culprit, culprit-left-disabled, and restore.
- [x] The quality gates pass.

### ISS-005: Firefox assisted baseline

- **Spec**: [SPEC.md](SPEC.md)
- **What to build**: On Firefox, use the capability report to enter assisted mode and establish the all-off baseline. The user can either verify the symptom in Troubleshoot Mode and attest that it is gone, or follow a manual disable-all checklist with a link to the Add-ons Manager; the add-on verifies the actual state through management and records the baseline. Assisted restore returns touched candidates with verification.
- **Blocked by**: ISS-003.
- **Status**: done-verified (2026-11-24, bd914ef). The Firefox E2E reports `firefoxPath: "test-mode-driver"`.

- [x] The capability report identifies assisted mode and the UI branches on it without pretending the add-on can toggle extensions.
- [x] The baseline screen offers external attestation and a manual disable-all checklist with a link to the Add-ons Manager and progress such as "6 of 8 off".
- [x] The add-on verifies the manual state through `management.getAll()` and events before accepting the baseline.
- [x] `N = 0`, `N = 1`, and host-issue outcomes work in assisted mode.
- [x] Assisted restore shows the original states, verifies completion, and reports incomplete restores.
- [x] Unit and contract tests with a fake management port cover the assisted baseline and restore; the Firefox E2E scenario covers the baseline path and reports whether it used real Add-ons Manager automation or the documented test-mode driver.
- [x] The quality gates pass.

### ISS-006: Firefox assisted trials and restore

- **Spec**: [SPEC.md](SPEC.md)
- **What to build**: Run the assisted trial loop on Firefox: show which extensions to enable and which to disable, open the Add-ons Manager, watch management events, verify the batch, and only then accept a verdict. Assisted restore stays pending until the state matches or the user explicitly accepts the remaining differences. Enterprise-policy installs use the automated path.
- **Blocked by**: ISS-004, ISS-005.
- **Status**: done-verified (2026-11-26, a860732). The Firefox E2E reports `firefoxPath: "test-mode-driver"`.

- [x] Each trial shows enable and disable checklists, an Open Add-ons Manager action, manual-state progress, and a Verify action.
- [x] Verdict buttons appear only after verification; `management` events debounce re-verification.
- [x] Cleared extensions stay enabled; the suspect pool shrinks exactly as in the automated flow.
- [x] Assisted restore stays restore-pending until the state matches or the user accepts the remaining differences; failures are reported.
- [x] Enterprise-policy installs (`installType === "admin"`) use the automated diff and error path and are covered by a contract test.
- [x] The Firefox E2E scenario runs the assisted flow through the real management path or the documented test-mode driver and reports which path ran.
- [x] The quality gates pass.

### ISS-007: History and copyable log/report

- **Spec**: [SPEC.md](SPEC.md)
- **What to build**: Show the baseline and every trial in order, including enabled and disabled batches, verdicts, retries, and the outcome. Copy the raw log JSON and a human-readable report. Link the completed and inconclusive screens to history.
- **Blocked by**: ISS-004.
- **Status**: done-verified (2026-11-26, e1fa79a).

- [x] History renders baseline, trials, batches, verdicts, retries, and the outcome in order with stable test ids.
- [x] Copy log JSON produces the persisted log; copy report produces a readable summary with the candidate snapshot, trials, verdicts, and outcome.
- [x] Completed and inconclusive screens link to history and replay.
- [x] Component and E2E tests cover the history and copy paths.
- [x] The quality gates pass.

### ISS-008: Replay after a corrected verdict

- **Spec**: [SPEC.md](SPEC.md)
- **What to build**: Edit a verdict on a copy of the log and replay the search. Replay validates the session start, recomputes the baseline and every partition from the verdict sequence, and reports the culprit or ambiguity, batch differences against the recorded log, and a validation error for an invalid edit. Replay never toggles extensions.
- **Blocked by**: ISS-007.
- **Status**: done-verified (2026-11-26, dc4c5c2).

- [x] Editing a verdict creates a copy; the live log remains append-only and unchanged.
- [x] Replay validates the session start and returns the first invalid event for a structurally invalid copy.
- [x] Replay recomputes the baseline and partitions from the verdict sequence, ignoring recorded trial batches as authoritative.
- [x] The result reports the culprit or ambiguity, recomputed trials, and batch differences.
- [x] The UI states that replay is diagnostic and does not change installed extensions; copy report is available.
- [x] Unit tests cover valid, corrected, invalid, and ignored-recorded-batch logs; component and E2E tests cover edit, replay, and result.
- [x] The quality gates pass.

### ISS-009: Drift, pause/resume, live undo

- **Spec**: [SPEC.md](SPEC.md)
- **What to build**: Before applying a trial or recording a verdict, verify the expected state. A mismatch pauses the session with a drift report showing expected versus actual, pending manual toggles, unexpected toggles, and disappeared candidates. Offer Re-sync, Undo last verdict, and Restore all. Live undo is allowed only for the most recent trial and only when the previous trial state can be restored without ambiguity.
- **Blocked by**: ISS-006.
- **Status**: done-verified (2026-11-26, 114464a). The E2E exercises drift, re-sync, undo gating, and reload survival on Chrome; the assisted pause path is covered by the fake-port tests.

- [x] Verification compares expected and actual for the current trial and reports all drift categories.
- [x] Drift pauses the session and shows expected and actual; Re-sync re-applies the expected state, Undo returns to the previous trial state, and Restore all starts restore.
- [x] Live undo is gated to the most recent trial, verifies state first, appends `verdict-undone`, re-applies the previous target state, and returns to awaiting-verdict; it refuses when drift exists.
- [x] Pause and resume events are logged; the session view survives panel close.
- [x] Fake-port and E2E tests cover drift, re-sync, undo eligibility, and resume on both platforms.
- [x] The quality gates pass.

### ISS-010: Toggle failures, escalation, greylist recovery

- **Spec**: [SPEC.md](SPEC.md)
- **What to build**: Handle per-extension management failures without leaving the browser half-changed. A failed toggle aborts the trial, restores the previous target state, and reports the failing extension and mapped error. A permission escalation offers one "Enable with click" action in the side panel; declining leads to restore or an inconclusive result. A greylisted or policy-locked re-enable is marked manual-recovery-required and makes restore report incomplete.
- **Blocked by**: ISS-004.
- **Status**: done-verified (2026-11-26, 86289c5). The Chrome `toggle-failure` scenario covers abort/rollback, policy, escalation, decline, and greylist.

- [x] A failed toggle aborts the trial, re-applies the previous target state, and reports the failing extension with a mapped error code.
- [x] Permission escalation shows "Enable with click"; the side panel performs the gesture-bound call and reports the outcome; declining leads to restore or inconclusive.
- [x] Greylist and policy failures are marked manual-recovery-required with instructions for the browser's extension manager; restore does not claim success.
- [x] Unit, component, and E2E tests cover the failure, escalation, decline, greylist, and policy paths.
- [x] The quality gates pass.

### ISS-011: Mid-session extension and test-tab changes

- **Spec**: [SPEC.md](SPEC.md)
- **What to build**: Keep the candidate snapshot honest when the browser changes under the session. Warn when an extension is installed or updated; never add it to the snapshot. Pause and invalidate the current trial when a candidate is removed. Offer restore or restart with a fresh snapshot. Handle a closed test tab and a page that never settles without blocking the verdict.
- **Blocked by**: ISS-009.
- **Status**: done-verified (2026-11-26, fe17575). The Chrome `mid-session-changes` scenario covers the closed tab and the removed candidate; the updated-candidate pause and the install warning are covered by the fake-port tests, because Chrome cannot be asked to re-version or install an extension on demand.

- [x] An extension installed mid-session produces a warning and never joins the snapshot.
- [x] An updated candidate produces a warning and pauses when the version change could alter behaviour; restart is offered.
- [x] A removed candidate pauses the session, invalidates the current trial, and offers restore or restart.
- [x] A closed test tab prompts rebind or allows a verdict without reload; a tab that never settles falls back to manual reload and does not block the verdict.
- [x] Tests cover each path.
- [x] The quality gates pass.

### ISS-012: Startup reconciliation, multi-panel convergence, storage failures

- **Spec**: [SPEC.md](SPEC.md)
- **What to build**: On browser startup, reconcile an unfinished session against the actual extension state and offer Resume or Restore. Multiple side panels show the same session and every mutation is serialized through the background. A storage write failure fails the command, preserves the previous log, and surfaces the error.
- **Blocked by**: ISS-010, ISS-011.
- **Status**: ready-for-agent

- [ ] Browser startup reconciles the persisted log with the actual management state and offers Resume or Restore.
- [ ] Multiple panels show the same session view; commands are serialized and cannot fork the session.
- [ ] A storage write failure rejects the command, leaves the previous log intact, and surfaces the error in the panel.
- [ ] Tests cover startup reconciliation, multi-panel convergence, and storage failure.
- [ ] The quality gates pass.

### ISS-013: Retire the scaffold and close the loop

- **Spec**: [SPEC.md](SPEC.md)
- **What to build**: Remove the scaffold and ship the bisect product as the only extension. Delete the popup, content script, DOM marker, old storage items, old messages, and their tests. Minimize permissions to storage, management, and Chrome sidePanel; delete legacy keys on first start. Update the E2E suite to install fixture extensions, drive the side panel and management state on both browsers, and update the documentation set. Remove ISS-001 once the implementation is verified.
- **Blocked by**: ISS-008, ISS-012.
- **Status**: ready-for-agent

- [ ] Popup, content script, DOM marker, old storage items, old messages, and their tests are deleted; no code references them.
- [ ] The manifest declares only `storage`, `management`, and Chrome `sidePanel`; no host permissions and no `tabs`; legacy keys are deleted on first start.
- [ ] E2E covers the full automated Chrome flow and the assisted Firefox flow with fixture extensions; the report states which Firefox path ran.
- [ ] `ARCH.md`, `CHANGELOG.md`, `GLOSSARY.md`, `ISSUES.md` (delete `ISS-001`), `NOTES.md`, `RUNBOOK.md`, `TECH_DEBT.md`, and `TOOLS.md` reflect the as-built state and retirements.
- [ ] `npm run agent:verify` exits 0 with zero page and background errors on both browsers.

