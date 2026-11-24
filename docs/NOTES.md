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
- **`WxtVitest()` does not install `@vitejs/plugin-vue`** (2026-11-24): `vitest.config.ts` registers `vue()` explicitly so `.vue` SFCs compile; removing it silently fails every popup test.

## unit-test-bridge

- **`fakeBrowser.runtime.sendMessage` lacks the promise-returning listener protocol** (2026-11-24): `@webext-core/messaging` round-trips hang in unit tests; call `installMessagingBridge()` from `tests/unit/helpers/messaging-bridge.ts` first, and reset between tests with `messenger.removeAllListeners()` plus `fakeBrowser.reset()`.

## management-adapter

- **`fakeBrowser` has no `management` API** (2026-11-24): `@webext-core/fake-browser` implements storage and messaging only, so adapter tests cannot call or stub `fakeBrowser.management`; inject the management surface into the adapter (or use the fake management port) to test Chrome error mapping and Firefox assisted verification without a browser.
- **Chrome `management.setEnabled` works from an extension page, Firefox rejects it** (2026-11-25): from `sidepanel.html`, Chrome disabled a fixture via `browser.management.setEnabled(id, false)` and `getAll()` reflected `enabled: false`; Firefox threw `setEnabled can only be used for themes or by addons installed by enterprise policy`. Never write an E2E step that assumes a Firefox extension toggle.
- **Firefox `about:addons` is not scriptable in this build** (2026-11-25): the page exposes `categories-box`, `discovery-pane`, and `panel-list`, but no `addon-manager` and no `addon-card` elements, so `setView({view:'addons://list/extension'})` and shadow-root row automation do not exist. Real assisted-mode E2E must use the documented test-mode driver (ISS-005) rather than the privileged UI.
- **Theme manifests need integer colours and are `type: "theme"`** (2026-11-25): a Chrome theme fixture with `"#102030"` strings fails install with `Invalid value for theme colors - colors must be integers`; use `[16, 32, 48]` arrays. Firefox ships four built-in themes that always appear in `getAll()` as `type: "theme"`, three of them `enabled: false`.

## wxt

- **Firefox identity is configured in `wxt.config.ts`, never in generated manifests** (2026-11-24): the manifest callback adds `browser_specific_settings.gecko.id` only for `browser === 'firefox'`; edits to `.output/*/manifest.json` are lost on the next build.
- **The side panel entrypoint is `entrypoints/sidepanel/index.html`** (2026-11-25): WXT matches `sidepanel.html`, `sidepanel/index.html`, and `*.sidepanel.html`; the `<meta name="manifest.type" content="sidepanel">` tag maps to the `sidepanel` type. WXT then emits `side_panel.default_path` **and auto-adds the `sidePanel` permission** on Chrome MV3, and `sidebar_action` with `default_panel`/`default_icon`/`default_title` on Firefox. Declaring `sidePanel` in `wxt.config.ts` too is harmless.
- **`<meta name="manifest.*">` values are JSON5-parsed** (2026-11-25): `manifest.default_icon` must be a JSON object (`{"16":"icon/16.png",...}`) to reach `sidebar_action.default_icon`; a bare path string works only for the single-value form.

## test-builds

- **Test hooks are compiled in only under `EXT_TEST_MODE=1`** (2026-11-24): `?tabId=` handling, the `data-ext-bisect-tab-id` marker, and `[EXT_BG_ERR]` logging exist only in `build:chrome`/`build:firefox` output; `build:prod:*` strips them, so E2E assertions must target test-mode builds.

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
- **The side panel is opened by direct navigation, never by the toolbar action** (2026-11-25): while `entrypoints/popup/` exists, Chrome's toolbar action opens the popup, so `setPanelBehavior({ openPanelOnActionClick: true })` is not asserted yet (ADR-009 defers it to ISS-013). `openSurface()` navigates straight to `sidepanel.html` on both browsers.
- **Fixture extension ids are not stable in Chrome** (2026-11-25): an unpacked Chrome extension's id derives from its path, so it changes if the fixtures directory moves. Read the id from `installExtension()`'s return value and compare the candidate rows against that, never against a hard-coded id.
- **`globalThis.browser` is absent inside a page context** (2026-11-25): WXT rewrites the `browser` identifier at build time from an auto-import, so `page.evaluate(() => browser.management...)` throws `browser is not defined`. Use `globalThis.browser ?? globalThis.chrome` in evaluated code.

