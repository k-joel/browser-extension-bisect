# Memory

## Project Overview
See @README.md for project overview and @package.json for available npm/pnpm commands for this project.

## Tech stack (non-negotiable)

- **Extension framework:** WXT 0.21 + TypeScript + Vue 3 (`wxt`, `@wxt-dev/module-vue`, `vue`, `typescript`, `vue-tsc`).
- **Styling:** plain hand-written CSS only (`entrypoints/popup/style.css`, imported from `main.ts`). Custom-property token layer (`--surface`, `--text`, `--accent`, `--space-*`, `--radius`) with `color-scheme: light dark` + `light-dark()` for theming, plus a `prefers-color-scheme` fallback. No Tailwind, no UnoCSS, no PostCSS styling plugins, no UI component libraries. All markup stays testable through `data-testid` attributes; classes are for presentation only.
- **Storage:** `storage.defineItem` from `wxt/utils/storage` (`utils/storage.ts`).
- **Messaging:** `defineExtensionMessaging<ProtocolMap>` from `@webext-core/messaging` (`utils/messaging.ts`).
- **Lint/format:** Biome (`biome.json`, scoped to `entrypoints/`, `utils/`, `tests/`, `scripts/`, and root configs).
- **Unit/component tests:** Vitest + `WxtVitest` + `fakeBrowser` + `@vue/test-utils` + `happy-dom`.
- **E2E:** Puppeteer in a Node harness — Chrome over CDP (`enableExtensions`) and Firefox over WebDriver BiDi (`installExtension`).
- **Build output:** WXT native `.output/chrome-mv3` and `.output/firefox-mv2` (Firefox MV2 is the pinned target; do not add `--mv3` without updating the harness).

## Structure

```
entrypoints/background.ts       typed message handlers + storage mutation + [EXT_BG_ERR] logging
entrypoints/content.ts          <all_urls> content script, DOM marker, storage watch
entrypoints/popup/              Vue 3 <script setup> popup (index.html, main.ts, App.vue, style.css)
utils/storage.ts                typed storage items + pure helpers
utils/messaging.ts              ProtocolMap + messenger
utils/state.ts                  read/update state helpers shared by background and tests
utils/content-marker.ts         DOM marker attribute names shared by content + harness
utils/test-mode.ts              __EXT_TEST_MODE__ gate + ?tabId= parsing
tests/unit/                     Vitest unit + component tests
tests/e2e/fixture-server.mjs    local 127.0.0.1:0 HTTP fixture server
tests/e2e/harness.mjs           cross-browser Puppeteer launcher (Chrome CDP / Firefox BiDi)
tests/e2e/verify.mjs            E2E gate; JSON output, screenshots on failure, exit codes
tests/e2e/inspect.mjs           on-demand debugging CLI (DOM, console, storage, screenshot)
scripts/run-unit-tests.mjs      deterministic Vitest runner (see Windows gotcha below)
```

## Code Style Guidelines
- Use descriptive variable names
- Follow existing patterns in the codebase
- Extract complex conditions into meaningful boolean variables
- No comments unless the logic is non-obvious.
- Styling lives in plain CSS files; prefer the existing custom-property tokens over new hard-coded colors or spacing values.

## Two-Stage Zero-HITL Verification Loop

### Fast inner loop (seconds)
```
npm run lint && npm run typecheck && npm run test:unit
```
Validates Biome formatting/lint, Vue + TS types, storage/messaging behaviour against `fakeBrowser`, and Vue component rendering with `@vue/test-utils`. Run this after every edit.

### Full cross-browser gate
```
npm run agent:verify
```
Runs `lint -> typecheck -> test:unit -> build:all -> test:e2e` for **both** Chrome and Firefox. When iterating on one browser use `npm run agent:verify:chrome` or `npm run agent:verify:firefox`, then always finish with the full `npm run agent:verify`.

### Failure debugging
- Read the JSON from `stdout`: `{ ok, results: [{ browser, steps: [{ name, ok }], errors: { message, screenshot, dom, pageErrors, consoleErrors, backgroundErrors, requestFailures } }] }`.
- Screenshots land in `.agent-artifacts/failure-<browser>-<scenario>.png`.
- Ad-hoc inspection:
  ```
  npm run agent:inspect -- --browser=chrome --url=/ --action=popup --screenshot=.agent-artifacts/debug.png
  ```
  Returns JSON with the resolved URL, console messages, page/background errors, a storage dump (when accessible), a compact DOM summary, and the screenshot path. `--url` accepts `/`, `/form`, `/dynamic` (fixture routes) or an absolute URL; `--action=popup|none`; `--headed` to watch it run.

### Completion gate
Never declare a task complete unless `npm run agent:verify` exits with code `0` and reports zero `pageerror` entries and zero `[EXT_BG_ERR]` background runtime errors across both Chrome and Firefox.

## Critical rules & gotchas

- **Never run Vitest in watch mode.** Always `npm run test:unit` (which is `vitest run` under a deterministic runner); `npx vitest` alone would hang the loop.
- **Import `WxtVitest` from `wxt/testing/vitest-plugin` and `fakeBrowser` from `wxt/testing/fake-browser`.** The `wxt/testing` barrel no longer exists.
- **`WxtVitest()` does not install `@vitejs/plugin-vue`.** `vitest.config.ts` registers `vue()` explicitly so `.vue` SFCs compile. Keep it.
- **`fakeBrowser.runtime.sendMessage` doesn't implement the promise-returning listener protocol** that `@webext-core/messaging` expects. `tests/unit/helpers/messaging-bridge.ts` bridges it via `onMessage.trigger`; use `installMessagingBridge()` in any test that round-trips messages.
- **No CSS frameworks or UI libraries** (Tailwind, UnoCSS, Pico, component kits). Style with plain CSS in `entrypoints/**/*.css` using the token layer. Revisit only if an options page or injected in-page panel adds substantial UI.
- **Any UI injected into host pages** (`content.ts`) must use WXT's `createShadowRootUi` with `cssInjectionMode: 'ui'` so popup tokens and resets cannot leak into (or be overridden by) the host site.
- **Configure Firefox `browser_specific_settings.gecko.id` in `wxt.config.ts`**, never by editing generated `.output/*/manifest.json`. The manifest callback scopes the key to Firefox builds only.
- **Test-mode hooks are compiled in via `EXT_TEST_MODE=1`** (`__EXT_TEST_MODE__` define). Only `build:chrome` / `build:firefox` set it; `build:prod:*` builds strip it, so `?tabId=` handling and the content-script tab-id marker disappear from production.
- **Never use `--load-extension` for Chrome.** Use Puppeteer `enableExtensions: true` plus `pipe: true` and `--enable-unsafe-extension-debugging`, then call `browser.installExtension(extPath)` after launch. Passing `enableExtensions: [path]` in `launch()` crashes the browser on Windows (`Extensions.loadUnpacked: Target closed`).
- **Never call CDP-only Puppeteer APIs in the Firefox BiDi path**: `page.triggerExtensionAction()`, `extension.triggerAction()`, `browser.extensions()`, `frame.extensionRealms()`, and `service_worker` targets are Chrome-only. The harness branches on `browserName`.
- **Firefox determinism:** pin `extensions.webextensions.uuids` to `FIXED_FIREFOX_UUID` from `tests/e2e/harness.mjs` and read `gecko.id` from the built `manifest.json`. Assert that `installExtension()` returns that same id.
- **Firefox BiDi never resolves `page.goto(..., { waitUntil: 'domcontentloaded' | 'load' })` for `moz-extension://` documents.** The harness navigates with `commit` (Chrome fallback built in) and then polls for the app root; use `gotoExtensionPage()` / `reloadExtensionPage()` rather than raw `goto`/`reload`.
- **`page.url()` is unreliable over Firefox BiDi** (returns `about:blank` for extension documents). Read `location.href` via `evaluate` when the URL matters.
- **Windows drive-letter casing breaks Vitest.** If the shell spawns with a lowercase cwd (`d:\...`) while Node resolves modules as `D:\...`, Vitest loads two runner instances and every test fails with `Vitest failed to define a suite` / `Cannot read properties of undefined (reading 'config')`. `scripts/run-unit-tests.mjs` spawns Vitest with `realpathSync.native(process.cwd())`; keep `test:unit` routed through it.
- **Keep `browser.close()` and fixture-server shutdown in `finally` blocks** so no headless browser processes leak, and clean `.agent-artifacts/` at the start of every verify run.
- **Never hit live third-party sites in E2E** — all pages come from `startFixtureServer()` on `127.0.0.1:0`.
- **Whenever you add or change extension behaviour, update both** the Vitest tests in `tests/unit/` and the Puppeteer scenarios in `tests/e2e/verify.mjs`.
- **Linux CI:** if Chrome/Firefox fail to launch due to missing shared libraries, install them first:
  ```
  npx puppeteer browsers install chrome --install-deps
  npx puppeteer browsers install firefox --install-deps
  ```

## Common Workflows

```
npm run dev                     # WXT dev server (Chrome)
npm run dev:firefox             # WXT dev server (Firefox)
npm run lint                    # Biome check
npm run format                  # Biome check --write
npm run typecheck               # wxt prepare && vue-tsc --noEmit
npm run test:unit               # Vitest, single run, deterministic cwd
npm run build:chrome            # test-mode Chrome build (EXT_TEST_MODE=1)
npm run build:firefox           # test-mode Firefox build (EXT_TEST_MODE=1)
npm run build:all               # both test-mode builds
npm run build:prod:chrome       # production Chrome build (no test hooks)
npm run build:prod:firefox      # production Firefox build (no test hooks)
npm run test:e2e                # E2E gate, both browsers, JSON output
npm run agent:verify            # full pipeline (the completion gate)
npm run agent:verify:chrome     # build + E2E for Chrome only
npm run agent:verify:firefox    # build + E2E for Firefox only
npm run agent:inspect -- --browser=chrome --url=/ --screenshot=.agent-artifacts/debug.png
```

One-time setup after cloning:
```
npm install
npx puppeteer browsers install chrome
npx puppeteer browsers install firefox
```

## References

You have access to two browser-extension documentation indexes, which map every page and section of their respective documentation trees:

- `references/firefox-extension-overview.md` — MDN WebExtensions docs (Firefox; Manifest V2 and V3; cross-browser and Chrome-compatibility notes).
- `references/chrome-extension-overview.md` — Chrome Extensions docs (Manifest V3; extension service workers; Chrome Web Store).

### Choosing the index

Pick the index that matches the browser and platform the work targets — not merely the browser you are testing in:

- **Firefox index** when writing or debugging Firefox add-ons, using `browser.*` APIs, `browser_specific_settings`/`gecko.id`, `web-ext`, temporary add-on loading via `about:debugging`, AMO signing/publishing, Manifest V2 keys, or cross-browser compatibility questions.
- **Chrome index** when writing or debugging Chrome extensions, using `chrome.*` APIs, extension service workers (including their 30-second idle termination), Manifest V3 `host_permissions`, Chrome Web Store publishing, or the MV2→MV3 migration.
- **Both indexes** when the feature must work in both browsers, or when one browser's docs defer to the other (e.g. Firefox vs Chrome API differences, namespace/promise differences, polyfills, packaging differences). Compare the two and call out divergences explicitly.

### How to use the chosen index

For any question I ask:

1. Search the chosen index first to identify the 1–3 most relevant page URLs and specific section headings.
2. Use the web-fetch tool to retrieve the full content of those exact URLs before answering.
3. Base the answer strictly on the fetched pages, and cite the exact page URL and section heading used.

### Index-specific fetch notes

- **Firefox/MDN:** fetch the absolute `https://developer.mozilla.org/...` URL. Headings marked *anchor unverified* (or quoted in the index) have no verified `#fragment` — fetch the page URL and locate the section by its exact heading text.
- **Chrome:** fetch the absolute `https://developer.chrome.com/...` URL. Appending `.md.txt` (before any `#fragment`) returns a clean markdown version, which is cheaper and easier to read.
- Never invent URLs or anchors: use only the absolute URLs in the index, and verify the heading exists on the fetched page before citing it.
- If a fetched page contradicts the index (moved page, renamed section, changed MV3 behaviour), trust the fetched page and state that the index is stale.

## Agent skills

### Issue tracker

Issues and specs live in the repo's GitHub Issues (`k-joel/browser-extension-bisect`) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles with their default label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.
