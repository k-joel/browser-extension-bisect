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
- Candidate picker with display-name search, per-extension include/exclude checkboxes, deterministic name-then-id ordering, and a "Not eligible" list that explains every exclusion (theme or app, disabled at start, policy-locked, this add-on, excluded by you).
- Versioned bisect config in `local:bisectConfig` with the documented fallback, a serialized writer owned by the background, and first-start deletion of the legacy `enabled`, `interactionCount`, and `settings` keys.
- `management` and Chrome `sidePanel` permissions, plus Chrome's `side_panel.default_path` and Firefox's `sidebar_action` panel metadata.
- `ManagementPort` contract with Chrome and Firefox adapters behind one shared eligibility filter and ordering helper, and an injectable management surface so adapters are testable without a browser.
- Four typed messages (`getCapabilities`, `listCandidates`, `getConfig`, `updateConfig`) on the existing messaging protocol.
- E2E fixture extensions and a multi-install harness path, with a direct `sidepanel.html` navigation that asserts the candidate list on both browsers.
- Popup with an enable/disable switch, an interaction counter, and a persisted batch-size setting, all backed by typed local storage.
- Content script on all pages that renders a `data-ext-bisect-state` DOM marker and keeps it in sync with stored state.
- Test-mode builds (`EXT_TEST_MODE=1`) with `?tabId=` popup targeting and `[EXT_BG_ERR]` error logging for automation; production builds strip these hooks.
- Zero-HITL verification suite: Vitest unit/component tests plus a Puppeteer E2E gate (`npm run agent:verify`) covering Chrome over CDP and Firefox over WebDriver BiDi, with JSON verdicts and failure screenshots.
- Nine-document agent documentation set under `docs/` (architecture, decision records, glossary, issues, notes, runbook, tech-debt ledger, tools inventory, changelog), each with an embedded maintenance guide and registered in `AGENTS.md`.
- The v1 bisect specification (`docs/SPEC.md`) and the twelve implementation tickets in `docs/ISSUES.md`.

