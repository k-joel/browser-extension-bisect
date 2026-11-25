# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!--
CHANGELOG.md MAINTENANCE GUIDE (FOR AGENTS & CONTRIBUTORS)

PURPOSE & SCOPE
- Curated, reverse-chronological record of notable, user-visible changes per version.
- Audience: human end users, operators, and developers evaluating upgrades or diagnosing
  regressions—not a git commit dump or internal engineering diary.
- Portable source of truth: reuse release sections from this file for GitHub Releases.

UPDATE TRIGGERS
- Update `## [Unreleased]` in the same task/session whenever you add a user-visible feature,
  change existing behavior/API/CLI/config/defaults, deprecate or remove functionality, fix a
  user-facing bug, or patch a security vulnerability.
- Update on release: promote `## [Unreleased]` to a versioned section and open a new
  `## [Unreleased]` section above it.
- Update post-release only to mark a pulled release `[YANKED]`, record a missed release or
  breaking change, or fix typos/broken links.
- Before ending a session that altered user-facing behavior, verify `## [Unreleased]`
  captures every qualifying change.

INCLUSION / EXCLUSION CRITERIA
- Include: Every notable user-visible change (features, behavior changes, deprecations,
  removals, bug fixes, security fixes). Consistency is mandatory—an incomplete changelog
  misleads users relying on it as the source of truth.
- Exclude: Whitespace/formatting edits, pure internal refactors with no behavior change, merge
  commits, work-in-progress steps, routine CI tweaks, and raw `git log` entries.

STRUCTURE & FORMATTING
- Section order: `## [Unreleased]` at the top, followed by releases newest-first
  (`## [X.Y.Z] - YYYY-MM-DD`). Never skip a released version.
- Dates & Versions: Strict ISO 8601 dates (`YYYY-MM-DD`) and SemVer (`MAJOR.MINOR.PATCH`:
  breaking / backward-compatible feature / backward-compatible fix). Append `[YANKED]` to
  pulled releases (`## [X.Y.Z] - YYYY-MM-DD [YANKED]`).
- Categories: Under `## [Unreleased]` and each release, group bullets strictly under these
  six `###` headings in order, omitting any empty category:
    - `Added`      (new features)
    - `Changed`    (changes to existing functionality)
    - `Deprecated` (soon-to-be-removed features)
    - `Removed`    (now-removed features)
    - `Fixed`      (bug fixes)
    - `Security`   (vulnerability fixes and security-relevant changes)
- Reference links: Keep reference-style links at the bottom of the file so every heading
  links to its comparison diff or tag (`[unreleased]` -> `vLATEST...HEAD`, `[X.Y.Z]` ->
  `vPREV...vX.Y.Z`, initial `[X.Y.Z]` -> `releases/tag/vX.Y.Z`).

QUALITY & STYLE RULES
- Describe user-visible impact, not internal implementation; name the specific feature,
  endpoint, flag, setting, or behavior affected.
- Keep bullets concise (1-2 lines), match audience tone, maintain consistent tense across
  entries, and end every bullet with a period.
- Evidence rule: Document only changes actually implemented and verified in the code/diff;
  never record speculative, planned, or unverified work.
- Link to the relevant issue, PR, commit, or ADR where helpful (and credit contributors if
  appropriate).
- Good: `- Login timeout on mobile caused by premature token expiry. ([#456](https://github.com/org/repo/issues/456))`
- Bad:  `- Refactored session handler.` or `- Various bug fixes and improvements.`

LIFECYCLE & WORKFLOW
- Ongoing edits: Add entries to `## [Unreleased]` as changes land, not only at release time.
- Deprecations & Breaking Changes: Deprecate in an earlier release before removing so users
  have a safe upgrade path. Prefix breaking changes and removals with `**BREAKING:**`, state
  the replacement, migration path, and deadline, and pair with a `MAJOR` version bump.
- Release-day workflow:
  1. Confirm `## [Unreleased]` captures all notable changes since the last release.
  2. Choose next `X.Y.Z` per SemVer.
  3. Rename `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`.
  4. Insert a fresh empty `## [Unreleased]` section directly above it.
  5. Update bottom reference links (`[unreleased]` -> `vX.Y.Z...HEAD`; add `[X.Y.Z]`).
  6. Review wording, `**BREAKING:**` prominence, and links before tagging.
- Yanks & Corrections: Never silently delete a pulled release—keep it and append `[YANKED]`.
  Only rewrite past releases to add missed releases/breaking changes, fix typos, or repair
  broken links; never erase history.

ANTI-PATTERNS
- Dumping `git log` / raw commit messages or vague bullets ("bug fixes", "improvements").
- Ambiguous regional dates (`03/04/26`), empty `###` headings, skipped versions, or mixed
  formatting/tenses across releases.
- Silent breaking changes/removals without deprecation notice or migration instructions.
- Silently deleting yanked releases or selectively omitting notable changes.

EXAMPLE LAYOUT (4-SPACE INDENTED)

    ## [Unreleased]

    ### Added

    - User profile export in JSON format via `/v2/export`. ([#489](https://github.com/org/repo/pull/489))

    ## [2.0.0] - 2026-03-15

    ### Removed

    - **BREAKING:** Legacy `/v1/export` endpoint. Migrate to `/v2/export`.

    ### Fixed

    - Login timeout on mobile devices during token refresh. ([#456](https://github.com/org/repo/issues/456))

    ## [1.0.1] - 2026-02-01 [YANKED]

    ### Security

    - Patched token validation bypass in OAuth callback.

    [unreleased]: https://github.com/org/repo/compare/v2.0.0...HEAD
    [2.0.0]: https://github.com/org/repo/compare/v1.0.1...v2.0.0
    [1.0.1]: https://github.com/org/repo/compare/v1.0.0...v1.0.1
    [1.0.0]: https://github.com/org/repo/releases/tag/v1.0.0
-->

---

## [Unreleased]

### Added

- Cross-browser Browser Extension Bisect add-on built on WXT, producing Chrome (Manifest V3) and Firefox (Manifest V2) builds from one TypeScript codebase.
- Side panel UI (`side panel` on Chrome, `sidebar_action` on Firefox) rendering the no-session screen, the capability report, and the candidate picker, replacing the popup as the product surface ([ADR-009](DECISIONS.md)).
- Candidate picker with display-name search, per-extension include/exclude checkboxes, deterministic name-then-id ordering, and a "Not eligible" list that explains every intrinsic exclusion (theme or app, disabled at start, policy-locked, this add-on).
- Pre-flight consent screen listing exactly the extensions the baseline will disable, the culprit-stays-disabled and Restore policy, the bound test tab, and an explicit "Start baseline" action; nothing is toggled before that click ([ADR-013](DECISIONS.md)).
- Automated all-off baseline on Chrome: every candidate is disabled, non-candidates are left untouched, the bound test tab is reloaded and awaited with a timeout, and the baseline verdict is appended to the bisect log.
- Baseline question with the labels "Problem persists" and "Problem is gone": `persists` aborts as a host issue and restores, `gone` advances, and `N = 1` resolves the culprit directly from the baseline with the culprit left disabled ([ADR-014](DECISIONS.md)).
- Automated half-split partition loop on Chrome, driven to completion after a clean baseline: each trial enables the first half of the suspect pool and disables the second, every cleared extension is re-enabled, and the suspect pool strictly shrinks until one candidate remains ([ADR-010](DECISIONS.md)).
- Trial screen with the question, the exact verdict labels "Problem persists" and "Problem is gone", the progress reading "Trial N of ~M · S suspects", a Retry action that re-applies the same batch without recording a verdict, and a manual test-tab reload.
- Inline trial summary listing every answered batch with its verdict, so the search is legible without a separate history screen (the dedicated history screen is ISS-007).
- Culprit identification with a final confirmation trial when the last partition left the lone suspect enabled; the culprit is recorded and left disabled with Restore prominent ([ADR-013](DECISIONS.md)).
- Inconclusive outcome with the ambiguity set and a reason when the verdicts contradict a single culprit — an empty suspect set or a final confirmation that still shows the symptom — instead of blaming the last suspect ([ADR-015](DECISIONS.md)).
- `utils/bisect/engine.ts`: the pure, platform-neutral search (partition, target state, suspect-set update, step-count estimate, completion and contradiction decisions) and the documented session transition table, testable without a browser.
- `retryTrial` on the typed messaging protocol, with the background as the only writer.
- Chrome E2E scenario `partition-loop` that searches to a known culprit with the harness acting as the human oracle, asserting the culprit is left disabled and Restore re-enables it.
- Host-issue screen explaining that no installed extension is implicated, with Restore.
- Restore, visible on the picker and on every session screen: re-enables only the extensions the session touched, reports per-extension failures, and never claims a full restore when a re-enable failed ([ADR-013](DECISIONS.md), [ADR-017](DECISIONS.md)).
- Session view rehydrated from the bisect log on panel open, so closing or reloading the panel keeps the session and its screen.
- Eight session messages (`getSession`, `startSession`, `applyTrial`, `submitVerdict`, `retryTrial`, `resetSession`, `bindTestTab`, `reloadTestTab`) on the typed messaging protocol, with the background as the only writer.
- Versioned bisect config in `local:bisectConfig` with the documented fallback, a serialized writer owned by the background, and first-start deletion of the legacy `enabled`, `interactionCount`, and `settings` keys.
- `management` and Chrome `sidePanel` permissions, plus Chrome's `side_panel.default_path` and Firefox's `sidebar_action` panel metadata.
- `ManagementPort` contract with Chrome and Firefox adapters behind one shared eligibility filter and ordering helper, and an injectable management surface so adapters are testable without a browser.
- Four typed messages (`getCapabilities`, `listCandidates`, `getConfig`, `updateConfig`) on the existing messaging protocol.
- E2E fixture extensions and a multi-install harness path, with a direct `sidepanel.html` navigation that asserts the candidate list on both browsers, plus a Chrome `session-baseline` scenario covering pre-flight, the all-off baseline, the test-tab reload, the `gone` advance, the `persists` host-issue abort, and Restore of only the touched candidates.
- Firefox assisted trials: after the assisted baseline, each partition is presented as a manual batch with a separate "keep on" checklist and a "turn off" checklist, an Open Add-ons Manager action, "n of m matched" progress, and a Verify action. The session stays in `awaiting-manual-toggle` until `management.getAll()` confirms the batch, and only then does the trial screen show the verdict buttons ([ADR-008](DECISIONS.md), [ADR-013](DECISIONS.md)).
- `management` `onEnabled`/`onDisabled` events debounce a re-verify, so the progress counter keeps up with the user's own toggles without a button press per extension.
- Assisted restore stays pending until the browser state matches or the user explicitly accepts the remaining differences; an acceptance never upgrades to a complete restore, and a candidate that disappeared is reported as a failure.
- Enterprise-policy installs (`installType === "admin"`) use the automated diff and per-id error path, covered by a contract test that runs Chrome and an `admin` Firefox install against the same expectations.
- Firefox E2E scenario `assisted-trials`, which runs the assisted loop to the known culprit through the documented test-mode driver, asserting the verdict buttons are absent before each verification and present after, and that the culprit is left disabled (`firefoxPath: "test-mode-driver"`).
- Session history screen listing the baseline check first and then every trial in order, each with its enabled and disabled batches, its verdict, any retries, and the session outcome (culprit, inconclusive, aborted, or restored), reachable from the trial, completed, and inconclusive screens.
- "Copy the bisect log" writes exactly the persisted log as JSON and "Copy the report" writes a human-readable summary naming the session, the candidate snapshot in the captured order, the baseline, every trial with its batches and verdict, the retries, and the outcome, with a success confirmation and a selectable-text fallback when the clipboard is unavailable.
- Completed and inconclusive screens link to the session history and to replay.
- Replay after a corrected verdict: the replay screen lists every recorded verdict with the copy's verdict beside it, and one action per trial flips it. Replay recomputes the baseline and every partition from the verdict sequence alone and shows the culprit or the ambiguity set, the recomputed trials, and every recorded batch that disagrees with the verdicts, or the first invalid event when the edited copy is structurally broken. Replay is diagnostic: the live log stays append-only and unchanged, nothing is toggled, and the screen says so ([ADR-011](DECISIONS.md)).
- "Copy the replay report" writes the recomputed trials and the differing batches as the same human-readable report the history produces, headed with the diagnostic notice.
- `utils/bisect/replay.ts`: the pure `replayLog(log)` function, which reuses the engine's partition, suspect-set and outcome decisions so a replayed search cannot diverge from a live one.
- `replayLog` on the typed messaging protocol; the background computes the result and writes nothing.
- Popup with an enable/disable switch, an interaction counter, and a persisted batch-size setting, all backed by typed local storage.
- Content script on all pages that renders a `data-ext-bisect-state` DOM marker and keeps it in sync with stored state.
- Test-mode builds (`EXT_TEST_MODE=1`) with `?tabId=` popup targeting and `[EXT_BG_ERR]` error logging for automation; production builds strip these hooks.
- Zero-HITL verification suite: Vitest unit/component tests plus a Puppeteer E2E gate (`npm run agent:verify`) covering Chrome over CDP and Firefox over WebDriver BiDi, with JSON verdicts and failure screenshots.
- Nine-document agent documentation set under `docs/` (architecture, decision records, glossary, issues, notes, runbook, tech-debt ledger, tools inventory, changelog), each with an embedded maintenance guide and registered in `AGENTS.md`.
- The v1 bisect specification (`docs/SPEC.md`) and the twelve implementation tickets in `docs/ISSUES.md`.

### Changed

- `BisectConfig.testTab.url` is `string | null`: without the `tabs` permission neither browser exposes `tab.url`, so the binding records the tab id and the panel shows `Tab #N` when no URL is available ([ADR-017](DECISIONS.md)).
- `management.verifyState` and `management.watchEvents` are implemented by both adapters: the automated rail compares the expected map against `getAll()`, and the assisted rail splits a mismatch into pending manual toggles and unexpected ones and debounces its event signal.
- `resolveScreen` accepts an optional `historyOpen` flag, so the session history is a screen derived from panel state rather than a modal, and stays unreachable while no session exists.
- The replay affordances on the history, completed and inconclusive screens are now functional actions that open the replay screen instead of disabled placeholders.

### Fixed

- Candidate eligibility no longer treats a user exclusion as an eligibility failure, so `listCandidates().eligible` is the single source for pickable candidates and the picker renders excluded rows from it instead of re-merging them out of the ineligible list ([ADR-016](DECISIONS.md), ISS-016).

