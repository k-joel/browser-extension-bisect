# Runbook

Repeatable operational procedures for this repository, executed by operators or agents under time pressure. Each entry covers one verified task; see [Entries](#entries) below to locate a procedure.

**Risk legend:** `SAFE` (reads or disposable writes) · `OPERATOR` (recoverable state changes) · `MANUAL` (actions outside the terminal) · `DESTRUCTIVE` (deletion or irreversible change).

<!--
RUNBOOK MAINTENANCE GUIDE (FOR AGENTS & CONTRIBUTORS)

PURPOSE & SCOPE
- Repeatable, ordered operational procedures executed under time pressure (setup, probes, recovery, cleanup, release).
- Intended reader: an operator or agent executing a task mid-incident or mid-workflow.
- NOT for design rationale, architecture docs, API/config reference, or changelogs.

UPDATE TRIGGERS
Update this file before ending a session whenever you:
- Add a new repeatable operational workflow.
- Change commands, flags, paths, config keys, or expected output for an existing entry.
- Execute a [DRAFT] entry or branch in a real run (confirm steps and remove [DRAFT], or record observed failures).
- Confirm a new failure mode and its fix during a real run.
- Retire an obsolete workflow or step.

INCLUSION / EXCLUSION CRITERIA
- Include: one focused, repeatable task per entry; only steps and failures confirmed by a real run (or marked [DRAFT] if untested).
- Exclude: imagined procedures not marked [DRAFT], one-off commands, background prose, design rationale, and non-executable reference material.

STRUCTURE & FORMATTING
- Single H1: Keep `# Runbook` as the only H1 in the file.
- Summary Index Table: Maintain `| RUN | Procedure |` under `## Entries` in ascending numeric order. Every row must link to its section anchor (`[NNN](#run-nnn-risk-kebab-case-title)`).
- File order: visible preamble -> this comment -> `## Entries` index table -> `## RUN-NNN ...` sections in ascending ID order.
- IDs: sequential 3-digit zero-padded IDs (`RUN-NNN`, starting at 001). Assign the next free ID. Never renumber entries or reuse retired IDs.
- Entry heading: `## RUN-NNN (<RISK>): <imperative task>` (append `[DRAFT]` if untested).
- Risk tags: `SAFE`, `OPERATOR`, `MANUAL`, `DESTRUCTIVE`. Combine with `, ` when multiple apply (e.g., `OPERATOR, MANUAL`).
- Summary paragraph (required): 1-2 sentences right under the heading stating what the procedure does and what it does NOT cover.
- Steps (required): numbered ordinal steps (`1.`, `2.`, ...), one action per step, copy-pasteable code block, and `Expected: <observable result>.` when it helps confirm success.
- Troubleshooting (optional; omit heading if no confirmed failures exist): `**Troubleshooting**`, followed by symptom-first bullets ordered from cheapest to most expensive diagnostic: ``- **`<verbatim symptom>`**: <cause>. Fix: `<command>`.``

QUALITY & STYLE RULES
- Voice & brevity: imperative or present tense, concise, high-signal; no filler or historical commentary.
- Truth & placeholders: record only steps and failures observed in a real run. Keep unknown values visibly bracketed as `[placeholder]` and explain how to obtain them; never invent values. Mark untested entries or branches `[DRAFT]` and ask the first real runner to report back.
- Commands: copy-pasteable with concrete values where known; label variants inside the code block (`# safe mode` / `# live mode`).
- Ordering & safety: state wrong-order consequences inline before hazardous steps. For `OPERATOR` or `DESTRUCTIVE` entries, state the rollback path (or plainly note that none exists) and end with a verification step proving the final observable state. Mark the preferred path `(recommended)` when alternatives exist.

LIFECYCLE & WORKFLOW
- Add: assign the next free `RUN-NNN`, add a row to `## Entries`, and append the entry using the Example Layout below.
- Update: edit commands, expected results, and troubleshooting inline when behavior changes; remove obsolete steps.
- Promote draft: after a real run confirms the steps, update observed outputs, fill resolved placeholders, and remove `[DRAFT]`.
- Retire: delete the `## RUN-NNN` section body and update its `## Entries` row to `| [NNN](#...) | Retired - <reason or replacement RUN-NNN> |` so the ID is never reused.

ANTI-PATTERNS
- Writing desk-imagined steps without `[DRAFT]`.
- Inventing tokens, ports, hostnames, or IDs instead of using `[bracketed placeholders]`.
- Renumbering entries or reusing retired `RUN-NNN` IDs.
- Putting multiple actions in one step, or using bullets instead of numbered steps.
- Writing vague troubleshooting ("check logs") instead of verbatim symptom + cause + exact fix.
- Leaving stale commands after changing code/tooling, or adding design rationale.

EXAMPLE LAYOUT (4-SPACE INDENTED)

    ## Entries

    | RUN | Procedure |
    |---|---|
    | [001](#run-001-risk-imperative-task) | <imperative task> |

    ---

    ## RUN-001 (OPERATOR): <imperative task>

    <What this procedure does.> Does not <scope exclusion>. Rollback: <undo command, or "none; state change is irreversible">.

    1. <Perform one action (note wrong-order consequence if applicable)>:

       ```
       # safe mode (recommended)
       <command with [bracketed placeholder] - obtain via [how]>
       ```

       Expected: <observable result>.

    2. <Verify final observable state>:

       ```
       <verification command>
       ```

       Expected: <observable end state>.

    **Troubleshooting**

    - **`<verbatim error or log string>`**: <cause>. Fix: `<exact command>`.
-->

---

## Entries

| RUN | Procedure |
|---|---|
| [001](#run-001-safe-set-up-the-development-environment) | Set up the development environment |
| [002](#run-002-safe-run-the-fast-inner-loop) | Run the fast inner loop |
| [003](#run-003-safe-run-the-full-cross-browser-verification-gate) | Run the full cross-browser verification gate |
| [004](#run-004-safe-iterate-verification-on-a-single-browser) | Iterate verification on a single browser |
| [005](#run-005-safe-capture-ad-hoc-debug-state-with-the-inspect-cli) | Capture ad-hoc debug state with the inspect CLI |
| [006](#run-006-safe-watch-the-github-actions-verification-run) | Watch the GitHub Actions verification run |

---

## RUN-001 (SAFE): Set up the development environment

Installs dependencies and the pinned browsers used by lint, unit tests, and E2E. Does not run the test suites. Rollback: disposable — remove `node_modules/`, `.wxt/`, and `.output/` to undo.

1. Install packages:

   ```
   npm install
   ```

   Expected: install completes; the `postinstall` hook runs `wxt prepare` and generates `.wxt/` types.
2. Install the E2E browsers (puppeteer 25 pins Chrome 157 and Firefox 160):

   ```
   npx puppeteer browsers install chrome firefox
   ```

   Expected: the command reports the downloaded Chrome and Firefox versions. A Firefox older than 160 still runs, but Firefox 16x is the covered target.
3. Sanity-check the toolchain:

   ```
   npm run lint
   ```

   Expected: Biome reports `Checked N files ... No fixes applied.` and exits 0.

**Troubleshooting**

- **`error while loading shared libraries: ...` when launching browsers on Linux**: missing system libraries. Fix: `npx puppeteer browsers install chrome --install-deps` and `npx puppeteer browsers install firefox --install-deps`.

---

## RUN-002 (SAFE): Run the fast inner loop

Runs Biome, the Vue/TS typecheck, and the Vitest suite — the check to run after every edit. Does not build or launch browsers. Rollback: none; read-only apart from `.wxt/` type generation.

1. Run all three checks:

   ```
   npm run lint && npm run typecheck && npm run test:unit
   ```

   Expected: Biome reports `Checked N files ... No fixes applied.` (count varies with repo contents); `vue-tsc` emits nothing; Vitest reports 37 passed test files and 728 passed tests (as of 2026-11-25); exit code 0.

**Troubleshooting**

- **`Vitest failed to define a suite` / `Cannot read properties of undefined (reading 'config')` and every test fails**: the shell spawned Vitest under a lowercase-cased cwd, loading two runner copies. Fix: run `npm run test:unit` (its wrapper normalizes the cwd); never `npx vitest`.
- **Vitest starts and never exits**: watch mode. Fix: kill the process and run `npm run test:unit` instead.

---

## RUN-003 (SAFE): Run the full cross-browser verification gate

Runs the complete gate: lint, typecheck, unit tests, both test-mode builds, and E2E on Chrome and Firefox. This is the completion gate for every change, and CI runs the same command (RUN-006). Does not exercise production (`build:prod:*`) bundles. Rollback: none; regenerates `.output/` and `.agent-artifacts/` only.

1. Run the gate:

   ```
   npm run agent:verify
   ```

   Expected: every stage passes; the final E2E JSON prints `"ok": true` with every step `ok: true` and empty `pageErrors` / `backgroundErrors` arrays; exit code 0; no `failure-<browser>-*.png` written under `.agent-artifacts/`.

**Troubleshooting**

- **`Extension build missing at ...\.output\chrome-mv3. Run "npm run build:chrome" first.`**: E2E was invoked without builds. Fix: run `npm run agent:verify` (which builds first) or `npm run build:all` before `npm run test:e2e`.
- **Chrome aborts with `Extensions.loadUnpacked: Target closed` on launch**: an extension path was passed via `enableExtensions: [path]` (or `--load-extension`) at launch. Fix: keep the harness's post-launch `browser.installExtension(extPath)` and launch only with `enableExtensions: true` + `pipe: true` + `--enable-unsafe-extension-debugging`.
- **A browser's steps time out or the background never logs `[EXT_BG_READY]`**: capture state per browser with RUN-005 before changing any code.
- **`candidate-list-matches-fixtures` fails on only one browser**: fixture names must stay identical across `tests/e2e/fixtures/extensions/chrome/**` and `.../firefox/**`, because `ELIGIBLE_FIXTURES` in `tests/e2e/fixtures/fixtures.mjs` is the single expectation for both. Compare the fixture manifests first.
- **`disabled-fixture-reported-disabled-at-start` fails**: Firefox temporary add-ons are always enabled, so the Firefox run seeds the dormant fixture through the test-mode driver (`setManualExtensionState`) before each scenario. If the step fails there, the driver overlay is missing — check `hasTestDriverGlobal()` and that the build ran with `EXT_TEST_MODE=1`.
- **`Could not find Firefox (ver. stable_160.0)` / `Could not find Chrome`**: the cached browsers predate the installed puppeteer. Fix: `npx puppeteer browsers install chrome firefox`.
- **`no-request-failures` fails with `net::ERR_ABORTED` on `sidepanel.html`**: something issued a navigation and then immediately started another, so the first was aborted. Never probe `waitUntil` by calling `reload({ waitUntil: 'commit' })` and retrying — CDP fires the reload before it validates the value; use `extensionPageWaitUntil()` in `tests/e2e/harness.mjs` (NOTES.md §e2e-harness).
- **`Protocol error (Target.setDiscoverTargets): Target closed` in CI**: Chrome died during startup and `pipe: true` hid its stderr. Fix: keep the Linux `--no-sandbox`/`--disable-dev-shm-usage` flags in `launchChrome` (`tests/e2e/harness.mjs`) and read the `dumpio` stderr that `CI=true` now prints (NOTES.md §e2e-chrome).
- **Every Firefox step times out on `sidepanel-root` with a blank page**: Firefox 160+ refuses BiDi navigation to `moz-extension://` without `MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1`, which `launchFirefox` sets through `env`. Do not remove it (NOTES.md §e2e-harness).

---

## RUN-004 (SAFE): Iterate verification on a single browser

Shortens the feedback loop to one browser while iterating. Does not replace the full gate — always finish with RUN-003. Rollback: none.

1. Build and verify one browser:

   ```
   npm run agent:verify:chrome
   ```

   Expected: JSON verdict `ok: true` for `"browser": "chrome"`, exit code 0. Use `npm run agent:verify:firefox` for the Firefox path.
2. Finish with the full cross-browser gate:

   ```
   npm run agent:verify
   ```

   Expected: exit code 0 across both browsers.

---

## RUN-005 (SAFE): Capture ad-hoc debug state with the inspect CLI

Launches one browser with the extension, opens a fixture (or absolute) URL, optionally opens the side panel, and dumps console, DOM, and storage state as JSON. Does not run assertions or produce verdicts. Rollback: none; screenshots go only to the path you pass.

1. Capture a side panel inspection against the home fixture:

   ```
   npm run agent:inspect -- --browser=chrome --url=/ --action=sidepanel --screenshot=.agent-artifacts/debug.png
   ```

   Expected: JSON on stdout with `"ok": true`, the resolved `url`, the `dom` summary, the `storage` dump, the console/page/background error arrays, and the screenshot path; exit code 0.
2. Vary the target as needed:

   ```
   npm run agent:inspect -- --browser=firefox --url=/dynamic --action=none --headed --settle=1500
   ```

   Expected: JSON as above with `"browser": "firefox"`; `--url` accepts `/`, `/form`, `/dynamic` or an absolute URL; `--action` accepts `sidepanel` or `none`.

---

## RUN-006 (SAFE): Watch the GitHub Actions verification run

Reports the status of the CI gate (`.github/workflows/ci.yml`, the same `npm run agent:verify` as RUN-003) for a pushed commit and prints the failed step's log when it fails. Does not re-run or repair the workflow. Rollback: none; read-only.

1. Find the run for the current branch:

   ```
   gh run list --branch <branch> --limit 5
   ```

   Expected: one row per push/PR run, newest first, naming the `CI` workflow, with status and conclusion.
2. Watch it to completion (blocks until the run finishes):

   ```
   gh run watch <run-id> --exit-status
   ```

   Expected: live step progress, then exit code 0 when the `verify` job succeeds.
3. Inspect a failure:

   ```
   gh run view <run-id> --log-failed
   ```

   Expected: the log of the failed step (a Vitest failure, an E2E step name, or the browser-install step). Reproduce locally with RUN-002/RUN-004, fix, and push again.

**Troubleshooting**

- **`Installing system dependencies requires root privileges` in the browser-install step**: `--install-deps` ran without `sudo`. Fix: use the workflow's `sudo env "HOME=$HOME" "PATH=$PATH" npx puppeteer browsers install ...` form (NOTES.md §ci).
- **Every Firefox step times out on `sidepanel-root` in CI**: the runner lacks a Firefox runtime library or the BiDi env flag. Check the browser-install step first; `launchFirefox` already sets `MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1` (NOTES.md §e2e-harness).
