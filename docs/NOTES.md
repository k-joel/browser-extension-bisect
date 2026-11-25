# Notes

Gotchas, oddities, and verified findings that are not open issues (`ISSUES.md`).
Read this before a live or coding session — the quirks below cost real time to rediscover.

<!--
NOTES.md MAINTENANCE GUIDE (FOR AGENTS & CONTRIBUTORS)

PURPOSE & SCOPE
- Audience: Future LLM agents and developers before coding, debugging, or running live sessions.
- Is: A dense operational reference of verified gotchas, non-obvious invariants, environment/tooling quirks, and fragile coupling that cost real time to rediscover.
- Is NOT: An issue tracker (`ISSUES.md`), architecture log (ADRs), changelog, TODO list, or general API tutorial.

UPDATE TRIGGERS
Update this file at the end of a session (or immediately during work) whenever you:
- Discover and verify a non-obvious failure mode, race, timeout, platform quirk, or workaround.
- Change a default, path, config key, ordering invariant, or constraint already documented here.
- Fix a bug whose regression prevention relies on preserving a hidden constraint (cite `(ISS-NNN, fixed YYYY-MM-DD)`).
- Retire a component, flag, or workaround, making its existing note obsolete.

INCLUSION / EXCLUSION CRITERIA
- Include:
  * Silent failure modes and ordering invariants ("must run X before Y because Z silently breaks").
  * Host/OS/tool/SDK version quirks, port/path/permissions traps, and test-harness constraints.
  * Intentional design traps where the "obvious" refactor breaks a subtle contract.
- Exclude:
  * Open bugs, unverified theories, or unresolved regressions (file in `ISSUES.md` instead).
  * Routine feature summaries, git-history narration, or facts obvious from reading one short function.
  * Speculative advice not directly observed in code, logs, or test runs.

STRUCTURE & FORMATTING
- Top-level structure: Keep `# Notes` and the short preamble visible; keep all entries under `## <component-or-area>` headings.
- Headings: Use short, lowercase component/area names (no `###` subheadings; omit empty `##` sections).
- Numbering/IDs: Do NOT assign numeric IDs (no `NOTE-01`). Use unnumbered `- ` bullets under each `##` heading.
- Sub-items: Keep bullets flat. Use indented numbered items (`  1. `) only for 2-4 tightly coupled consequences of a single root cause.
- Bullet anatomy:
  `- **<Bold lead-in rule or quirk>** [(YYYY-MM-DD[, ref])]: <mechanism, what breaks if violated, exact symbol/path/workaround>.`
- Dates & versions: Use ISO `YYYY-MM-DD` for time-sensitive observations or fixes; pin exact versions when version-specific (e.g., `SDK 2.x`).
- Cross-links: Put symbols, files, keys, and env vars in inline backticks; reference `(ISS-NNN, fixed YYYY-MM-DD)` or `(ADR-NNN)` inline when relevant.

QUALITY & STYLE RULES
- Tone & tense: Terse, factual, imperative or present tense for active invariants; past tense only for the observed failure/repro.
- Brevity: Target 1-4 sentences (one paragraph) per bullet.
- Evidence required: State concrete thresholds, paths, error behaviors, and symbols rather than vague adjectives ("slow", "broken"). Always pair a prohibition ("never do X") with its failure mode and the safe alternative.

LIFECYCLE & WORKFLOW
- Add: Append a new bullet under the most specific existing `## <component-or-area>` (or create a new `##` section). Merge closely related facts into one bullet instead of fragmenting.
- Edit in place: When behavior, defaults, or paths change, rewrite the existing bullet in place and update its date. Never append a second bullet that contradicts an older one.
- Promote/Migrate: Move unresolved defects to `ISSUES.md`. If an architectural choice gets an ADR, link `(ADR-NNN)` and keep only the operational footgun here.
- Retire: Delete bullets when the underlying component or quirk is removed, unless residual disk/state cleanup remains relevant (narrow the note to that residue).

ANTI-PATTERNS
- Dumping raw terminal logs, multi-paragraph essays, or fenced code blocks into bullets.
- Recording unverified guesses, open bugs, or personal workspace state irrelevant to other sessions.
- Writing "Do not change X" without explaining *what breaks* and *what to do instead*.
- Leaving stale bullets intact after refactoring, or leaving empty `##` sections behind.

EXAMPLE LAYOUT (4-SPACE INDENTED)

    ## worker-runtime

    - **Flush queue state before releasing the process lock** (`runtime.stop`, 2026-05-14): `clear_dirty_flags` is unscoped; releasing the lock first lets a newly spawned worker lose dirty state written concurrently. Always join background threads and flush while the lock is held.
    - **Loopback probes must target `127.0.0.1`, not `localhost`** (ISS-12, fixed 2026-06-02): On dual-stack hosts where the service binds IPv4 only, `localhost` stalls on IPv6 connect timeouts (~1 s per request). Pass URLs through `net.ipv4_loopback` before calling the HTTP client.
-->

---

## vitest

- **Never run Vitest in watch mode** (2026-11-24): `npx vitest` starts a watcher and hangs an agent session; always run `npm run test:unit`, which spawns `vitest run` through `scripts/run-unit-tests.mjs`.
- **Windows drive-letter casing loads two Vitest copies** (2026-11-24): a shell that spawns with a lowercase cwd (`d:\...`) while Node resolves modules as `D:\...` fails every test with `Vitest failed to define a suite` / `Cannot read properties of undefined (reading 'config')`. `scripts/run-unit-tests.mjs` normalizes the cwd via `realpathSync.native(process.cwd())`; keep `test:unit` routed through it.
- **Import WXT test helpers from their subpaths only** (2026-11-24): `WxtVitest` comes from `wxt/testing/vitest-plugin` and `fakeBrowser` from `wxt/testing/fake-browser`; the `wxt/testing` barrel no longer exists, so bare imports break typecheck and runtime.
- **`WxtVitest()` does not install `@vitejs/plugin-vue`** (2026-11-24): `vitest.config.ts` registers `vue()` explicitly so `.vue` SFCs compile; removing it silently fails every component test.

## unit-test-bridge

- **`fakeBrowser.runtime.sendMessage` lacks the promise-returning listener protocol** (2026-11-24): `@webext-core/messaging` round-trips hang in unit tests; call `installMessagingBridge()` from `tests/unit/helpers/messaging-bridge.ts` first, and reset between tests with `messenger.removeAllListeners()` plus `fakeBrowser.reset()`.

## test-tab-binding

- **`tab.url` is `undefined` without the `tabs` permission, so `testTab.url` is nullable** (2026-11-24, ADR-017): `browser.tabs.query({active:true})` and `tabs.get(id)` return the id, index and status but never `url` when the add-on does not hold `tabs`, and ADR-012 keeps that permission off. `TestTabBinding.url` is therefore `string | null` in `utils/bisect/domain.ts`; `entrypoints/background.ts` stores a URL only when one is exposed and the panel renders `Tab #N` otherwise. Do not "fix" the null by adding `tabs` — it reverses ADR-012 and the consent screen's promise. Since ISS-013 the Chrome build no longer declares `tabs` either, so E2E sees `testTab.url: null` on both browsers; assert the binding by tab id, never by URL.
- **`tabs.getCurrent()` identifies the panel's own tab** (2026-11-26): the E2E binds the test tab by bringing the test page to the front and then asking the panel for `tabs.query({active:true})`; because the panel is itself a tab it can be the active one, so `focusTestTab` waits until the active id is not the panel's `tabs.getCurrent()` id. Neither call needs a permission — only `url`/`title` are gated — so this replaces the retired `data-ext-bisect-tab-id` marker without re-adding `tabs`.
- **`tabs.reload` accepts a bare tab id and returns before the page has loaded** (2026-11-24): the call resolves as soon as the navigation starts, so `waitForComplete` must poll `tabs.get(tabId).status === 'complete'` (or `tabs.onUpdated`) with `TEST_TAB_SETTLE_TIMEOUT_MS`. A panel that asks for the verdict on the `reload` promise resolves sees the pre-reload page.
- **Without `tabs`, `tabs.reload` is unobservable from the extension realm** (2026-11-24): the E2E cannot read `tab.url` back, so `tests/e2e/harness.mjs` marks the test page's own JS context (`markPageForReloadCheck`) and treats a missing marker as proof the reload happened.

## management-adapter

- **`fakeBrowser` has no `management` API** (2026-11-24): `@webext-core/fake-browser` implements storage and messaging only, so adapter tests cannot call or stub `fakeBrowser.management`; inject the management surface into the adapter (or use the fake management port) to test Chrome error mapping and Firefox assisted verification without a browser.
- **Chrome `management.setEnabled` works from an extension page, Firefox rejects it** (2026-11-25): from `sidepanel.html`, Chrome disabled a fixture via `browser.management.setEnabled(id, false)` and `getAll()` reflected `enabled: false`; Firefox threw `setEnabled can only be used for themes or by addons installed by enterprise policy`. Never write an E2E step that assumes a Firefox extension toggle.
- **Firefox `about:addons` is not scriptable in this build** (2026-11-25): the page exposes `categories-box`, `discovery-pane`, and `panel-list`, but no `addon-manager` and no `addon-card` elements, so `setView({view:'addons://list/extension'})` and shadow-root row automation do not exist. Real assisted-mode E2E must use the documented test-mode driver (ISS-005) rather than the privileged UI.
- **Theme manifests need integer colours and are `type: "theme"`** (2026-11-25): a Chrome theme fixture with `"#102030"` strings fails install with `Invalid value for theme colors - colors must be integers`; use `[16, 32, 48]` arrays. Firefox ships four built-in themes that always appear in `getAll()` as `type: "theme"`, three of them `enabled: false`.

## wxt

- **Firefox identity is configured in `wxt.config.ts`, never in generated manifests** (2026-11-24): the manifest callback adds `browser_specific_settings.gecko.id` only for `browser === 'firefox'`; edits to `.output/*/manifest.json` are lost on the next build.
- **The side panel entrypoint is `entrypoints/sidepanel/index.html`** (2026-11-25): WXT matches `sidepanel.html`, `sidepanel/index.html`, and `*.sidepanel.html`; the `<meta name="manifest.type" content="sidepanel">` tag maps to the `sidepanel` type. WXT then emits `side_panel.default_path` **and auto-adds the `sidePanel` permission** on Chrome MV3, and `sidebar_action` with `default_panel`/`default_icon`/`default_title` on Firefox. Do not also declare `sidePanel` in `wxt.config.ts`: the permission arrives from the entrypoint, so the config list stays `['storage', 'management']` and the built Chrome manifest is exactly `storage`, `management`, `sidePanel` (ISS-013).
- **`<meta name="manifest.*">` values are JSON5-parsed** (2026-11-25): `manifest.default_icon` must be a JSON object (`{"16":"icon/16.png",...}`) to reach `sidebar_action.default_icon`; a bare path string works only for the single-value form.
- **Deleting the popup removes the generated `action.default_popup`, not the action** (2026-11-26): WXT emits an `action`/`browser_action` key only for a `popup` entrypoint, so Chrome's toolbar action disappears with `entrypoints/popup/`. Declare `action: { default_title }` in the manifest callback on the Chrome branch to keep a clickable icon, then call `sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` so the click opens the panel. Firefox needs neither: `sidebar_action` is generated and the panel opens from the sidebar menu.

## test-builds

- **Test hooks are compiled in only under `EXT_TEST_MODE=1`** (2026-11-26): `[EXT_BG_ERR]` logging and the assisted Firefox test-mode driver exist only in `build:chrome`/`build:firefox` output; `build:prod:*` strips them, so E2E assertions must target test-mode builds. The `?tabId=` handling and the `data-ext-bisect-tab-id` marker were retired with the popup and content script (ISS-013).

## e2e-chrome

- **Install Chrome extensions after launch, never via launch arguments** (2026-11-24): passing `enableExtensions: [path]` inside `launch()` crashes the browser on Windows with `Extensions.loadUnpacked: Target closed`. Launch with `enableExtensions: true`, `pipe: true`, and `--enable-unsafe-extension-debugging`, then call `browser.installExtension(extPath)`.
- **CDP-only Puppeteer APIs must stay behind the `browserName` branch** (2026-11-24): `page.triggerExtensionAction()`, `browser.extensions()`, `frame.extensionRealms()`, and `service_worker` targets do not exist over Firefox BiDi and throw; `tests/e2e/harness.mjs` is the only place that touches them.
- **`waitUntil: 'commit'` is Firefox-only** (2026-11-25): `page.goto(url, { waitUntil: 'commit' })` throws `Unknown value for options.waitUntil` on Chrome. `gotoExtensionPage()` already falls back to `domcontentloaded`; any ad-hoc navigation must do the same.

## e2e-firefox

- **`page.goto` never resolves for `moz-extension://` documents over BiDi** (2026-11-24): `waitUntil: 'domcontentloaded' | 'load'` hangs forever; use `gotoExtensionPage()` / `reloadExtensionPage()`, which navigate with `commit` (with a Chrome fallback) and then poll for the app-root element.
- **`page.url()` returns `about:blank` for extension documents over BiDi** (2026-11-24): read `location.href` via `page.evaluate` whenever the URL matters.
- **Determinism requires the pinned extension UUID** (2026-11-24): launch with `xpinstall.signatures.required: false` and `extensions.webextensions.uuids` mapping the manifest `gecko.id` to `FIXED_FIREFOX_UUID`; `installExtension()` must return that same id or the session is invalid.
- **BiDi `webExtension.install` can only install temporary add-ons** (2026-11-25): a temporary add-on is always enabled and cannot be disabled through `management`, and an add-on whose `strict_min_version` exceeds the browser is rejected at install (`is not compatible with application version`). So an "already disabled" regular-extension fixture is Chrome-only; the Firefox E2E asserts the theme/app exclusion instead and reports which path ran.

## e2e-harness

- **Every run must stay local and clean up** (2026-11-24): `browser.close()` and the fixture-server shutdown live in `finally` blocks so no headless browsers leak; `verify.mjs` wipes `.agent-artifacts/` at the start of each run; all pages come from `startFixtureServer()` on `127.0.0.1:0`, never live third-party sites.
- **Behaviour changes must update both test layers** (2026-11-24): every extension behaviour change extends the Vitest tests in `tests/unit/` and the `runScenario` steps in `tests/e2e/verify.mjs`; updating only one layer lets the gate pass against stale expectations.
- **The side panel is opened by direct navigation, not by the toolbar action** (2026-11-26): `openSurface()` navigates straight to `sidepanel.html` on both browsers, which is the only way to open a Firefox sidebar from automation. The Chrome action now *does* open the panel (`setPanelBehavior({ openPanelOnActionClick: true })`, ISS-013), but no E2E step triggers it — clicking a toolbar icon is not exposed over CDP/BiDi and the panel would still need a page handle afterwards.
- **Fixture extension ids are not stable in Chrome** (2026-11-25): an unpacked Chrome extension's id derives from its path, so it changes if the fixtures directory moves. Read the id from `installExtension()`'s return value and compare the candidate rows against that, never against a hard-coded id.
- **`globalThis.browser` is absent inside a page context** (2026-11-25): WXT rewrites the `browser` identifier at build time from an auto-import, so `page.evaluate(() => browser.management...)` throws `browser is not defined`. Use `globalThis.browser ?? globalThis.chrome` in evaluated code.
- **A failed Chrome scenario leaks extension state into the next one** (2026-11-26): the all-off baseline leaves every candidate disabled, so the next scenario's picker reports "No eligible enabled extensions" and its step failures point at the wrong cause. Each Chrome scenario now calls `restoreFixtureState()` (in `harness.mjs`) after `resetBisectState()`, re-enabling the candidate fixtures and re-disabling the dormant one.
- **`reload({ waitUntil: 'commit' })` really reloads before it rejects, so never probe with it** (2026-11-25): CDP's `reload` sends `Page.reload` inside `Promise.all` alongside `waitForNavigation`, which validates `waitUntil` first and throws `Unknown value for options.waitUntil: commit`. The aborted probe navigation lands in `requestFailures` as `net::ERR_ABORTED` and fails every `no-request-failures` step. `extensionPageWaitUntil()` therefore picks the value from `page.browser().protocol` (`commit` on `webDriverBiDi`, `domcontentloaded` on `cdp`) instead of trying one and falling back. `goto` validates before navigating, so it never had this bug.
- **Firefox ≥160 needs `MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1` to navigate `moz-extension://`** (2026-11-25): BiDi `browsingContext.navigate` gates privileged schemes behind `RemoteAgent.allowSystemAccess` and answers `UnsupportedOperationError: Navigation to "moz-extension://…" is not allowed in this context`; setting `location.href` from page JS is denied too. `launchFirefox` passes the variable through `env`, which is the only way to set it (it is an environment flag, not a pref). Without it the panel never leaves `about:blank` and every Firefox scenario times out waiting for `sidepanel-root`.
- **A scenario's `waitFor` must target one unambiguous screen state** (2026-11-26): the panel re-renders in place and keeps the same `data-screen`, so "screen === 'trial'" matches both the plan (apply button present) and the answered batch (verdict buttons present) — a wait on it resolves against the *previous* render and the following click fails with "No clickable node". Discriminate on a node that only exists in one state (`trial-apply` for a plan, `verdict-persists` for an answered trial).

## partition-loop

- **`mid = floor(n / 2)` is ambiguous and the mandated trace settles it** (2026-11-26): reading the formula as `enabled = suspects.slice(0, mid)` gives 1 enabled / 2 disabled at `n = 3`, which contradicts `docs/TECH_DESIGN.md:356-369` (Trial 3 needs 7–9 enabled, 10–12 disabled) and the "#7 needs a sixth trial" variant. The engine therefore gives the disabled half `floor(n / 2)` from the **tail**, so an odd pool's extra candidate is enabled. Any future change to `partitionSuspects` must keep the `N = 24` trace green.
- **The panel applies the next partition explicitly** (2026-11-26): `submitVerdict` records the verdict and the terminal event only; `applyTrial` appends `trial-started`/`trial-applied`. The panel chains them. Do not fold the apply into `submitVerdict` without revisiting SPEC §Messaging protocol.
- **`retryTrial` appends `trial-retried` + `trial-applied` for the same round** (2026-11-26), never `trial-started`, so the reducer opens no new round and the suspect pool is untouched. A retry re-applies the *recorded* `targetState`, which already includes the cleared candidates as enabled.

## assisted-trials

- **The adapter's `ManualBatch` is a residual diff, the recorded one is the whole target** (2026-11-26): `applyTargetState` returns only the ids that still have to move, which is empty for the half of the pool already at its target. `applyAndRecord` therefore records `targetBatchOf(target)` on `trial-applied`, so the two checklists and the "n of m matched" counter cover every candidate the trial cares about, including the cleared ones that must stay enabled. Do not switch the recorded batch back to the port's result.
- **`manualBatch` lives on `SessionView`, derived in the reducer** (2026-11-26): a closed and reopened panel must show the same checklist, and a batch kept only in a Vue ref would be lost. The reducer clears it on `session-resumed`, `trial-retried` and `session-reset`.
- **Verdict gating is structural, not cosmetic** (2026-11-26): the assisted trial screen renders no verdict button at all; the panel only shows them once `confirmManualState` appends `session-resumed` and the status becomes `awaiting-verdict`. Every E2E wait keys off `verdict-persists` presence, so a button that merely got `disabled` would silently break the other scenarios' state discrimination.
- **The test-mode driver's `setEnabled` does not emit management events** (2026-11-26): `createFakeManagement` records the call and mutates `getAll()` but never fires `onEnabled`/`onDisabled`, so a watcher test must emit them explicitly. A real Add-ons Manager toggle does emit them, which is what makes the debounce meaningful.
- **`admin` routing is a contract, not a special case** (2026-11-26): an enterprise-policy install reports `canAutoToggle`, so Firefox silently becomes the automated rail. `management-adapters.test.ts` runs Chrome and an `admin` Firefox install against the same expectations, so a divergence in either adapter fails the same test.

## history-and-copy

- **The history is derived, never stored** (2026-11-26): `buildHistory(view, log)` reads the reducer output plus the persisted log on every render. The log stays append-only and capped at 500 events, and there is no mutable history store to drift from it. Retry counts come from counting `trial-retried` events per round, because the reducer keeps exactly one `Trial` per round and resets its verdict on a retry.
- **`getLog` runs on the session queue** (2026-11-26): it is a read, but serializing it behind the same promise queue as the mutating commands is what makes a copy taken during a verdict write observe either the old log or the new one. Both copy actions re-send `getLog` instead of reusing the panel's `historyLog` ref, so the copied text is what is persisted at that moment.
- **The clipboard needs the documented fallback chain** (2026-11-26): `navigator.clipboard.writeText` is available in the side panel but still rejects without focus or permission, so `copyText` falls back to `document.execCommand('copy')` over a temporary textarea and finally reports `manual`, which reveals a readonly textarea holding the same text. Do not drop the fallback: an extension-side clipboard write is not guaranteed, and a silent failure would leave the user with no evidence to copy.
- **A headless browser has no readable clipboard** (2026-11-26): neither CDP nor BiDi exposes it, so `captureClipboard()` in `harness.mjs` wraps `navigator.clipboard.writeText` on the side panel page and `readClipboardCaptures()` reads the writes back. The product path still runs; only the sink is recorded, so the E2E asserts the real text the panel produced.
- **`CopyStatus` lives inside the history screen, not beside it** (2026-11-26): the App template's screen switch is one `v-if`/`v-else-if` chain, and inserting an unconditional component mid-chain silently breaks which screen renders. Keep the status panel inside `HistoryScreen.vue` and pass the status down as a prop.
- **The status cannot say how the search ended** (2026-11-26): `session-reset` moves `SessionView.status` to `restored` while keeping `culpritId` and `ambiguityIds`, so deriving the outcome from the status alone silently degraded a restored inconclusive session to "restored before an outcome was reached". `terminalOutcomeOf` reads `session-completed`, `session-inconclusive` and a `persists` `baseline-recorded` from the log instead; the restore is then a note on top of the outcome, never a replacement for it.
- **A mutation while the history is open must re-read the log** (2026-11-26): Restore renders on every screen, including the history, so `refreshHistoryIfOpen()` re-sends `getLog` from `applyMutation`/`applyTrial`. Without it the panel pairs the new session view with history text built from the old log and the restore note never appears.

## replay

- **Replay must go through `engine.ts`, never its own copy of the algorithm** (2026-11-26): `utils/bisect/replay.ts` calls `nextOutcome`, `narrowSuspects` and `clearedOf` for every decision. Re-implementing the partition there (even "just the slice bounds") lets a replayed search disagree with the live one, which defeats the entire diagnostic. `bisect-replay.test.ts` replays the `N = 24` trace batch for batch to catch exactly that.
- **The recorded `trial-started` sets are the thing under test, not the input** (2026-11-26): the verdict sequence drives every partition, and the recorded batches are only diffed into `batchDifferences`. A test that edits a recorded batch and expects the *outcome* to change is testing the wrong thing; the tampered-batch tests assert the culprit is unchanged and only the differences grow.
- **`session-reset` is legal after a terminal event; nothing else is** (2026-11-26): Restore appends it after `session-completed`/`session-inconclusive`, so the validator allows that one exception and rejects any other event after the outcome. Without the exception, replaying any restored session would report a spurious `validationError`.
- **A persisting baseline replays to no outcome, not to a culprit** (2026-11-26): `baseline-recorded` with `persists` aborts the session as a host issue in the reducer, so the replay returns early with empty trials and no `validationError`. Do not "fix" that into an invalid copy.
- **Replay edits live in panel state, never in storage** (2026-11-26): `replayEdits` is a plain `Record<number, Verdict>` and the corrected log is built fresh by `applyReplayEdits` — an explicit unwrap so no Vue proxy reaches `structuredClone` (the ISS-005 trap). A panel reload discards the edits by design; the live log is never a target of the edit path.
- **`replayLog` must not enter the session queue** (2026-11-26): the queue exists to serialize read-modify-write against the log. Replay reads nothing and writes nothing, so queueing it only couples a pure computation to a live mutation and makes "replay is diagnostic" harder to see in the code.

## drift-and-undo

- **The guard verifies the *current* trial's target, and that is correct** (2026-11-26): `guardAgainstDrift` compares `verifyState` against `view.currentTrial.targetState` before applying a trial and before recording a verdict. Between rounds the answered trial is still `currentTrial`, so the check covers the state the next partition builds on. Do not "improve" it into a last-applied lookup; the reducer never leaves `currentTrial` null while a session is live.
- **A drift pause is a refusal, not a screen transition** (2026-11-26): the session appends `session-paused` and throws, so the message handler rejects. `run()` in `App.vue` catches it, calls `refreshSessionAfterRefusal()`, and the panel re-renders from the rehydrated view. That is why a refused command still ends on the paused screen instead of a bare error string.
- **An assisted attestation requires the browser to actually be all-off** (2026-11-26): `assisted-attest` records an external baseline, but the following `applyTrial` still verifies round 0's all-off target. A harness that attests while the candidates are enabled gets a correct drift pause; the E2E therefore disables the candidates before attesting. Same rule applies to any future external-baseline test.
- **Undo lives on the plan screen, not the answered one** (2026-11-26): `trial-undo-verdict` renders in the `awaitingApply` branch, because undo reopens the just-answered round. Asserting undo eligibility on the answered screen finds no button at all.
- **Resync re-parks an assisted pause in `awaiting-manual-toggle`** (2026-11-26): the add-on cannot apply a manual batch, so `resyncSession` records a fresh `trial-applied` for the same round and the checklist returns. On the automated rail it reloads the tab and returns to the trial instead. Both are asserted.

## mid-session-changes

- **Chrome reuses `onInstalled` for updates, so never trust the event's kind** (2026-11-26): the watcher runs only for `installed`/`uninstalled` events, and then re-derives the report with `snapshotChanges` against `getAll()`. A version difference is what makes a change pausing; the event is only a signal that something happened. Reading `onInstalled` as "a new extension appeared" makes an update look like an install and the session never pauses.
- **An install must not grow the log, which is why `readSessionView` exists** (2026-11-26): the warning has to be visible without being written down, so `getSession` stays a pure read of the reduced log and `readSessionView` decorates its result with the live comparison. Every mutating panel path calls it again after applying a mutation so both routes to the same view agree. Do not move the install warning into the reducer; the log is append-only and installs are not events.
- **`listInstalled` is not `listCandidates`** (2026-11-26): the eligibility filter reports the session's own toggles as `disabled-at-start` and omits a mid-session install entirely, so it cannot answer "what does the browser have now". The snapshot diff needs the unfiltered list, which is why `ManagementPort` grew a seventh method rather than reusing the existing one.
- **A snapshot pause is a refusal too, and only once** (2026-11-26): the guard checks `view.status === 'paused'` first. The background watcher usually pauses before the user's next command, so without that check every refused command would append another `session-paused` describing a change the log already records.
- **`restartSession` restores before it snapshots** (2026-11-26): the new session starts from "every candidate is enabled", so a restart that skipped the restore would inherit a state it never applied and the first `applyTrial` would hit drift immediately. It is also the only command allowed to re-read the candidate list.
- **The E2E removal is a real `browser.uninstallExtension`** (2026-11-26): Puppeteer owns the fixture install, so the harness can only uninstall through it. That is what makes Chrome fire `onUninstalled` and drop the entry from `getAll()`. A storage overlay (the assisted rail's test-mode driver) would exercise the harness rather than the product.
- **`readSessionState` fields must precede their assertions** (2026-11-26): the `snapshotChange`, `snapshotWarning` and `testTabPrompt` groups were added to `harness.mjs` before the scenario that reads them, so an absent field surfaces as a failed assertion instead of `undefined`. Same trap as ISS-005's `preflight-mode`.
- **`record(...)` spreads details after `name`** (2026-11-26): a details key literally called `name` overwrites the step's own name in the JSON report, which is how a step once appeared as `"Fixture Bravo"`. Use a distinct key (`removedName`) for a value that happens to be a name.


