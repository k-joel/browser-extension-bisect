import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

export const SIDEPANEL_ROOT_SELECTOR = '[data-testid="sidepanel-root"]';
export const BACKGROUND_READY_LOG = '[EXT_BG_READY]';
export const BACKGROUND_ERROR_PREFIX = '[EXT_BG_ERR]';
export const FIXED_FIREFOX_UUID = '11111111-2222-3333-4444-555555555555';
export const FIXTURE_EXTENSIONS_DIR = path.resolve('tests/e2e/fixtures/extensions');
export const TEST_DRIVER_GLOBAL = '__extBisectTestDriver';
export const TEST_DRIVER_STORAGE_KEY = 'bisectTestDriver';
export const CLIPBOARD_CAPTURE_GLOBAL = '__bisectClipboardCapture';

const BENIGN_MESSAGE_PATTERNS = [/favicon\.ico/i];
const MAX_RECORDED_ENTRIES = 200;

function isBenign(text) {
  return BENIGN_MESSAGE_PATTERNS.some((pattern) => pattern.test(text));
}

export function resolveOutputDir(browserName) {
  const relative = browserName === 'chrome' ? '.output/chrome-mv3' : '.output/firefox-mv2';
  const absolute = path.resolve(relative);
  if (!fs.existsSync(path.join(absolute, 'manifest.json'))) {
    throw new Error(`Extension build missing at ${absolute}. Run "npm run build:${browserName}" first.`);
  }
  return absolute;
}

function readManifest(extPath) {
  return JSON.parse(fs.readFileSync(path.join(extPath, 'manifest.json'), 'utf8'));
}

export function readFirefoxGeckoId(extPath) {
  const geckoId = readManifest(extPath)?.browser_specific_settings?.gecko?.id;
  if (typeof geckoId !== 'string' || geckoId.length === 0) {
    throw new Error('Firefox manifest is missing browser_specific_settings.gecko.id');
  }
  return geckoId;
}

function createRecorder() {
  return { console: [], pageErrors: [], requestFailures: [] };
}

function record(list, entry) {
  list.push(entry);
  if (list.length > MAX_RECORDED_ENTRIES) list.shift();
}

function attachPageListeners(page, recorder, label) {
  page.on('console', (message) => {
    record(recorder.console, { label, type: message.type(), text: message.text() });
  });
  page.on('pageerror', (error) => {
    record(recorder.pageErrors, { label, message: error.message, stack: error.stack ?? null });
  });
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (isBenign(url)) return;
    record(recorder.requestFailures, { label, url, error: request.failure()?.errorText ?? null });
  });
}

function attachWorkerListeners(worker, recorder) {
  worker.on('console', (message) => {
    record(recorder.console, { label: 'background', type: message.type(), text: message.text() });
  });
}

async function waitForBackgroundWorker(browser, timeout = 15000) {
  const target = await browser
    .waitForTarget((candidate) => candidate.type() === 'service_worker' || candidate.type() === 'background_page', {
      timeout,
    })
    .catch(() => null);
  if (target === null) return null;
  return target.worker().catch(() => null);
}

export async function waitForLog(recorder, predicate, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (recorder.console.some(predicate)) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

/**
 * Firefox's WebDriver BiDi implementation never resolves `page.goto` promises for
 * `moz-extension://` documents with `waitUntil: 'domcontentloaded' | 'load'`;
 * `waitUntil: 'commit'` resolves immediately. Chrome rejects `commit`, and probing
 * for that by calling `reload({ waitUntil: 'commit' })` first is not safe: CDP's
 * `reload` sends `Page.reload` inside `Promise.all` before it validates `waitUntil`,
 * so the rejected probe really reloads the page and the retry aborts it, leaving a
 * spurious `net::ERR_ABORTED` in `requestFailures`. Pick the value per browser.
 */
function extensionPageWaitUntil(page) {
  return page.browser().protocol === 'webDriverBiDi' ? 'commit' : 'domcontentloaded';
}

export async function gotoExtensionPage(page, url, { selector = SIDEPANEL_ROOT_SELECTOR, timeout = 20000 } = {}) {
  await page.goto(url, { waitUntil: extensionPageWaitUntil(page), timeout }).catch(() => undefined);
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const ready = await page.evaluate((target) => document.querySelector(target) !== null, selector).catch(() => false);
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for "${selector}" at ${url}`);
}

export async function reloadExtensionPage(page, { selector = SIDEPANEL_ROOT_SELECTOR, timeout = 20000 } = {}) {
  await page.reload({ waitUntil: extensionPageWaitUntil(page), timeout }).catch(() => undefined);
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const ready = await page.evaluate((target) => document.querySelector(target) !== null, selector).catch(() => false);
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for "${selector}" after reload`);
}

/**
 * Brings the test page to the front and reads the tab id the panel will bind. `tabs.query`
 * needs no permission and only `url`/`title` are gated behind `tabs`, so the id is readable
 * from the panel itself — the retired content script used to publish it through a DOM marker.
 * The panel is a tab of its own, hence the wait for the active tab to stop being the panel.
 */
export async function focusTestTab(surface, testPage, timeout = 15000) {
  await testPage.bringToFront();
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const activeId = await surface
      .evaluate(async () => {
        const api = globalThis.browser ?? globalThis.chrome;
        const [active] = await api.tabs.query({ active: true, currentWindow: true });
        if (active?.id === undefined) return null;
        const own = await api.tabs.getCurrent().catch(() => null);
        return own?.id === active.id ? null : active.id;
      })
      .catch(() => null);
    if (activeId !== null) return activeId;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return null;
}

/**
 * A second side panel for the convergence scenario. Each panel is its own extension page,
 * so both are the same `sidepanel.html` on the same extension origin — the harness never
 * fakes a panel by reusing the first page, because a shared page cannot prove convergence.
 */
export async function openSecondPanel(session) {
  const page = await session.newPage();
  await gotoExtensionPage(page, `${session.extensionOrigin}/sidepanel.html`, { selector: SIDEPANEL_ROOT_SELECTOR });
  return page;
}

/**
 * Records a browser start the way `runtime.onStartup` does, so the reconciliation offer is
 * live content and not a hand-seeded fixture. A real restart would also drop the extension
 * pages, so the harness reopens the panel afterwards; Puppeteer cannot restart a profile
 * in place, and the offer is derived from this stored signal plus the log.
 */
export async function simulateBrowserRestart(page) {
  return page.evaluate(async () => {
    const api = globalThis.browser ?? globalThis.chrome;
    const stored = await api.storage.local.get('bisectLog');
    const log = stored?.bisectLog ?? null;
    if (log === null) {
      await api.storage.local.remove('bisectStartupSignal');
      return { raised: false, sessionId: null, eventCount: 0 };
    }
    const signal = { sessionId: log.sessionId ?? null, eventCount: log.events?.length ?? 0 };
    await api.storage.local.set({ bisectStartupSignal: signal });
    return { raised: true, ...signal };
  });
}

export async function readStartupSignal(page) {
  return page.evaluate(async () => {
    const api = globalThis.browser ?? globalThis.chrome;
    const stored = await api.storage.local.get('bisectStartupSignal');
    return stored?.bisectStartupSignal ?? null;
  });
}

/**
 * Fails the next `storage.local.set` the way a full disk does. The E2E cannot fill a real
 * profile, so the page's writer is wrapped once and the product path behind it is
 * unchanged: `setValue` still runs and still rejects.
 */
export async function failNextStorageWrite(page, message = 'QUOTA_BYTES quota exceeded') {
  return page.evaluate((text) => {
    const api = globalThis.browser ?? globalThis.chrome;
    const original = api.storage.local.set.bind(api.storage.local);
    let armed = true;
    api.storage.local.set = async (items) => {
      if (armed) {
        armed = false;
        throw new Error(text);
      }
      return original(items);
    };
    return { armed: true };
  }, message);
}

async function launchChrome({ headless, recorder, extPath }) {
  /**
   * Linux CI runs Chrome as an unprivileged user on a runner whose user namespaces and
   * `/dev/shm` may not satisfy the sandbox; without these flags Chrome exits during
   * startup and `pipe: true` reduces the real cause to `Target.setDiscoverTargets:
   * Target closed`. `dumpio` exposes Chrome's own stderr in CI logs for the next failure.
   */
  const linuxArgs = process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : [];
  const browser = await puppeteer.launch({
    browser: 'chrome',
    headless,
    pipe: true,
    enableExtensions: true,
    dumpio: process.env.CI === 'true',
    args: ['--no-first-run', '--enable-unsafe-extension-debugging', ...linuxArgs],
  });

  const extensionId = await browser.installExtension(extPath);

  browser.on('targetcreated', async (target) => {
    if (target.type() !== 'page') return;
    const page = await target.page().catch(() => null);
    if (page !== null) attachPageListeners(page, recorder, 'page:auto');
  });

  const backgroundWorker = await waitForBackgroundWorker(browser);
  if (backgroundWorker === null) {
    throw new Error('Chrome background service worker was never created');
  }
  attachWorkerListeners(backgroundWorker, recorder);

  const extensionOrigin = `chrome-extension://${extensionId}`;

  return {
    browser,
    extensionId,
    extensionOrigin,
    backgroundWorker,
  };
}

async function launchFirefox({ headless, recorder, extPath }) {
  const geckoId = readFirefoxGeckoId(extPath);

  const browser = await puppeteer.launch({
    browser: 'firefox',
    headless,
    /**
     * Firefox 160 refuses WebDriver BiDi navigation to privileged schemes such as
     * `moz-extension://` unless `RemoteAgent.allowSystemAccess` is set, and that flag
     * only comes from this environment variable. Without it every panel navigation
     * fails with `UnsupportedOperationError: Navigation to "moz-extension://…" is not
     * allowed in this context`. The harness loses nothing: it drives the panel through
     * the same page API and holds no extra browser privileges because of the variable.
     */
    env: { ...process.env, MOZ_REMOTE_ALLOW_SYSTEM_ACCESS: '1' },
    extraPrefsFirefox: {
      'xpinstall.signatures.required': false,
      'extensions.webextensions.uuids': JSON.stringify({ [geckoId]: FIXED_FIREFOX_UUID }),
    },
  });

  const extensionId = await browser.installExtension(extPath);
  if (extensionId !== geckoId) {
    throw new Error(`Firefox installed extension id "${extensionId}" does not match manifest gecko id "${geckoId}"`);
  }

  browser.on('targetcreated', async (target) => {
    if (target.type() !== 'page') return;
    const page = await target.page().catch(() => null);
    if (page !== null) attachPageListeners(page, recorder, 'page:auto');
  });

  const extensionOrigin = `moz-extension://${FIXED_FIREFOX_UUID}`;

  return {
    browser,
    extensionId,
    extensionOrigin,
    backgroundWorker: null,
  };
}

export async function launchTestBrowser({ browserName, headless = true }) {
  if (browserName !== 'chrome' && browserName !== 'firefox') {
    throw new Error(`Unsupported browser "${browserName}"`);
  }

  const extPath = resolveOutputDir(browserName);
  const recorder = createRecorder();
  const launcher = browserName === 'chrome' ? launchChrome : launchFirefox;
  const session = await launcher({ headless, recorder, extPath });

  return {
    ...session,
    browserName,
    recorder,
    extPath,
    async installFixtures(fixtures) {
      const installed = [];
      for (const fixture of fixtures) {
        const id = await session.browser.installExtension(path.join(FIXTURE_EXTENSIONS_DIR, browserName, fixture.dir));
        installed.push({ ...fixture, id });
      }
      return installed;
    },
    async newPage(url) {
      const page = await session.browser.newPage();
      attachPageListeners(page, recorder, 'page:test');
      if (url !== undefined) await page.goto(url, { waitUntil: 'domcontentloaded' });
      return page;
    },
    async openSurface() {
      const page = await session.browser.newPage();
      attachPageListeners(page, recorder, 'sidepanel');
      await gotoExtensionPage(page, `${session.extensionOrigin}/sidepanel.html`, {
        selector: SIDEPANEL_ROOT_SELECTOR,
      });
      return page;
    },
    async close() {
      await session.browser.close();
    },
  };
}

/**
 * Drives the documented test-mode driver from an extension page. Firefox cannot
 * toggle a temporary add-on, so the harness records the "manual" Add-ons Manager
 * state here; the assisted adapter's `getAll` merges it. The overlay lives in
 * storage, so any extension page of the add-on can write it and the background
 * sees the same value.
 */
export async function setManualExtensionState(page, extensionId, enabled) {
  return page.evaluate(
    async ({ id, next }) => {
      const api = globalThis.browser ?? globalThis.chrome;
      const stored = await api.storage.local.get('bisectTestDriver');
      const current = stored?.bisectTestDriver?.enabledById ?? {};
      await api.storage.local.set({ bisectTestDriver: { enabledById: { ...current, [id]: next } } });
      const driver = globalThis.__extBisectTestDriver;
      return { ok: true, hasDriver: driver !== undefined };
    },
    { id: extensionId, next: enabled },
  );
}

export async function readManualExtensionState(page, extensionIds) {
  return page.evaluate(async (ids) => {
    const api = globalThis.browser ?? globalThis.chrome;
    const all = await api.management.getAll();
    const stored = await api.storage.local.get('bisectTestDriver');
    const overlay = stored?.bisectTestDriver?.enabledById ?? {};
    const states = {};
    for (const id of ids) {
      const real = all.find((entry) => entry.id === id);
      if (real === undefined) {
        states[id] = 'missing';
        continue;
      }
      states[id] = overlay[id] ?? real.enabled;
    }
    return states;
  }, extensionIds);
}

export async function resetManualExtensionState(page) {
  await page.evaluate(async () => {
    const api = globalThis.browser ?? globalThis.chrome;
    await api.storage.local.remove('bisectTestDriver');
  });
}

/**
 * Arms a `setEnabled` rejection for one id in one direction through the documented
 * test-mode driver. Chrome cannot be made to refuse a toggle on demand, so this is the
 * only way to drive the failure paths in a real browser; the product's own error
 * mapping, abort and rollback still run unchanged behind it.
 *
 * The panel's gesture-bound escalation calls `management` directly and therefore never
 * sees this overlay — which is exactly the difference between "the background cannot
 * retry" and "a click can".
 */
export async function setToggleError(page, extensionId, enabled, message) {
  return page.evaluate(
    async ({ id, next, text }) => {
      const api = globalThis.browser ?? globalThis.chrome;
      const stored = await api.storage.local.get('bisectTestDriver');
      const storedValue = stored?.bisectTestDriver ?? {};
      const errors = { ...(storedValue.toggleErrors ?? {}) };
      const key = `${id}:${next ? 'on' : 'off'}`;
      if (text === null) delete errors[key];
      else errors[key] = text;
      const nextValue = { enabledById: storedValue.enabledById ?? {} };
      if (Object.keys(errors).length > 0) nextValue.toggleErrors = errors;
      await api.storage.local.set({ bisectTestDriver: nextValue });
      return nextValue;
    },
    { id: extensionId, next: enabled, text: message },
  );
}

export async function readToggleErrors(page) {
  return page.evaluate(async () => {
    const api = globalThis.browser ?? globalThis.chrome;
    const stored = await api.storage.local.get('bisectTestDriver');
    return stored?.bisectTestDriver?.toggleErrors ?? {};
  });
}

export async function hasTestDriverGlobal(page) {
  return page.evaluate(() => globalThis.__extBisectTestDriver !== undefined);
}

export function collectErrors(recorder) {
  return {
    pageErrors: recorder.pageErrors,
    consoleErrors: recorder.console.filter(
      (entry) => entry.type === 'error' && !isBenign(entry.text) && !entry.text.includes('Failed to load resource'),
    ),
    backgroundErrors: recorder.console.filter(
      (entry) => entry.label === 'background' && entry.text.includes(BACKGROUND_ERROR_PREFIX),
    ),
    requestFailures: recorder.requestFailures,
  };
}

export async function disableExtensionThroughSurface(page, extensionId) {
  return page.evaluate(async (id) => {
    const api = globalThis.browser ?? globalThis.chrome;
    try {
      await api.management.setEnabled(id, false);
      const target = (await api.management.getAll()).find((entry) => entry.id === id);
      return { ok: true, enabled: target?.enabled ?? null };
    } catch (error) {
      return { ok: false, enabled: null, message: String(error?.message ?? error) };
    }
  }, extensionId);
}

/**
 * Toggles one extension behind the panel's back, which is how the drift
 * scenarios simulate a user change the add-on did not make.
 */
export async function setExtensionEnabled(page, extensionId, enabled) {
  return page.evaluate(
    async ({ id, next }) => {
      const api = globalThis.browser ?? globalThis.chrome;
      try {
        await api.management.setEnabled(id, next);
        const target = (await api.management.getAll()).find((entry) => entry.id === id);
        return { ok: true, enabled: target?.enabled ?? null };
      } catch (error) {
        return { ok: false, enabled: null, message: String(error?.message ?? error) };
      }
    },
    { id: extensionId, next: enabled },
  );
}

export async function readCandidateState(page) {
  return page.evaluate(() => ({
    state: document.querySelector('[data-testid="sidepanel-root"]')?.getAttribute('data-state') ?? 'missing',
    screen: document.querySelector('[data-testid="sidepanel-root"]')?.getAttribute('data-screen') ?? null,
    live: document.querySelector('[data-testid="sidepanel-live"]')?.textContent?.trim() ?? null,
    browser: document.querySelector('[data-testid="capability-browser"]')?.textContent?.trim() ?? null,
    toggleMode: document.querySelector('[data-testid="capability-toggle-mode"]')?.textContent?.trim() ?? null,
    eligible: Array.from(document.querySelectorAll('[data-testid="candidate-row"]')).map((node) => ({
      id: node.getAttribute('data-extension-id'),
      name: node.querySelector('[data-testid="candidate-name"]')?.textContent?.trim() ?? '',
      selected: node.getAttribute('data-selected'),
      reason: node.querySelector('[data-testid="candidate-reason"]')?.textContent?.trim() ?? null,
    })),
    ineligible: Array.from(document.querySelectorAll('[data-testid="ineligible-row"]')).map((node) => ({
      id: node.getAttribute('data-extension-id'),
      name: node.querySelector('[data-testid="ineligible-name"]')?.textContent?.trim() ?? '',
      reason: node.querySelector('[data-testid="ineligible-reason"]')?.textContent?.trim() ?? '',
    })),
    eligibleEmpty: document.querySelector('[data-testid="eligible-empty"]')?.textContent?.trim() ?? null,
    searchEmpty: document.querySelector('[data-testid="search-empty"]')?.textContent?.trim() ?? null,
  }));
}

export async function readSessionState(page) {
  return page.evaluate(() => {
    const text = (testId) => document.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim() ?? null;
    const summary = document.querySelector('[data-testid="restore-summary"]');
    return {
      screen: document.querySelector('[data-testid="sidepanel-root"]')?.getAttribute('data-screen') ?? null,
      live: text('sidepanel-live'),
      preflight: {
        count: text('preflight-count'),
        candidates: Array.from(document.querySelectorAll('[data-testid="preflight-candidate"]')).map((node) => ({
          id: node.getAttribute('data-extension-id'),
          name: node.querySelector('[data-testid="preflight-candidate-name"]')?.textContent?.trim() ?? '',
        })),
        culpritNote: text('preflight-culprit-note'),
        testTab: text('preflight-test-tab-label'),
        testTabWarning: text('preflight-test-tab-warning'),
        startLabel: document.querySelector('[data-testid="preflight-start"]')?.textContent?.trim() ?? null,
        startDisabled: document.querySelector('[data-testid="preflight-start"]')?.disabled ?? null,
        mode: text('preflight-mode'),
        blocked: text('preflight-blocked'),
      },
      baseline: {
        question: text('baseline-question'),
        persistsLabel: text('verdict-persists'),
        goneLabel: text('verdict-gone'),
        reloadLabel: document.querySelector('[data-testid="baseline-reload"]')?.textContent?.trim() ?? null,
      },
      hostIssue: {
        explanation: text('host-issue-explanation'),
        restore: document.querySelector('[data-testid="host-issue-restore"]')?.textContent?.trim() ?? null,
      },
      completed: {
        culpritName: text('culprit-name'),
        detail: text('culprit-detail'),
        restoreLabel: document.querySelector('[data-testid="completed-restore"]')?.textContent?.trim() ?? null,
        historyLabel: document.querySelector('[data-testid="completed-history"]')?.textContent?.trim() ?? null,
        replayDisabled: document.querySelector('[data-testid="completed-replay"]')?.disabled ?? null,
        replayNote: text('completed-replay-note'),
      },
      trial: {
        progress: text('trial-progress'),
        question: text('trial-question'),
        enabled: text('trial-enabled'),
        disabled: text('trial-disabled'),
        planEnabled: text('trial-plan-enabled'),
        planDisabled: text('trial-plan-disabled'),
        persistsLabel: text('verdict-persists'),
        goneLabel: text('verdict-gone'),
        applyLabel: document.querySelector('[data-testid="trial-apply"]')?.textContent?.trim() ?? null,
        retryLabel: document.querySelector('[data-testid="trial-retry"]')?.textContent?.trim() ?? null,
        round: text('trial-heading'),
        undoDisabled: document.querySelector('[data-testid="trial-undo-verdict"]')?.disabled ?? null,
        undoBlocked: text('trial-undo-blocked'),
        history: Array.from(document.querySelectorAll('[data-testid="trial-history-row"]')).map((node) => ({
          round: node.getAttribute('data-round'),
          enabled: node.querySelector('[data-testid="trial-history-enabled"]')?.textContent?.trim() ?? '',
          disabled: node.querySelector('[data-testid="trial-history-disabled"]')?.textContent?.trim() ?? '',
          verdict: node.querySelector('[data-testid="trial-history-verdict"]')?.textContent?.trim() ?? '',
        })),
      },
      inconclusive: {
        reason: text('inconclusive-reason'),
        ambiguity: Array.from(document.querySelectorAll('[data-testid="inconclusive-ambiguity-entry"]')).map(
          (node) => node.querySelector('[data-testid="inconclusive-ambiguity-name"]')?.textContent?.trim() ?? '',
        ),
        historyLabel: document.querySelector('[data-testid="inconclusive-history"]')?.textContent?.trim() ?? null,
        replayDisabled: document.querySelector('[data-testid="inconclusive-replay"]')?.disabled ?? null,
      },
      history: {
        sessionId: text('history-session-id'),
        candidates: text('history-candidates'),
        baselineMode: text('history-baseline-mode'),
        entries: Array.from(document.querySelectorAll('[data-testid="history-entry"]')).map((node) => ({
          round: node.getAttribute('data-round'),
          kind: node.getAttribute('data-kind'),
          label: node.querySelector('[data-testid="history-entry-round"]')?.textContent?.trim() ?? null,
          enabled: node.querySelector('[data-testid="history-entry-enabled"]')?.textContent?.trim() ?? null,
          disabled: node.querySelector('[data-testid="history-entry-disabled"]')?.textContent?.trim() ?? null,
          verdict: node.querySelector('[data-testid="history-entry-verdict"]')?.textContent?.trim() ?? null,
          retry: node.querySelector('[data-testid="history-entry-retry"]')?.textContent?.trim() ?? null,
        })),
        outcome: document.querySelector('[data-testid="history-outcome"]')?.getAttribute('data-outcome') ?? null,
        outcomeLabel: text('history-outcome-label'),
        outcomeNames: Array.from(document.querySelectorAll('[data-testid="history-outcome-name"]')).map(
          (node) => node.textContent?.trim() ?? '',
        ),
        copyLogLabel: document.querySelector('[data-testid="history-copy-log"]')?.textContent?.trim() ?? null,
        copyReportLabel: document.querySelector('[data-testid="history-copy-report"]')?.textContent?.trim() ?? null,
        replayDisabled: document.querySelector('[data-testid="history-replay"]')?.disabled ?? null,
        copyStatus: document.querySelector('[data-testid="copy-status"]')?.getAttribute('data-status') ?? null,
        copyMessage: text('copy-status-message'),
        copyFallback: document.querySelector('[data-testid="copy-fallback-text"]')?.value ?? null,
      },
      replay: {
        notice: text('replay-diagnostic-notice'),
        sourceNote: text('replay-source-note'),
        rounds: Array.from(document.querySelectorAll('[data-testid="replay-round"]')).map((node) => ({
          round: node.getAttribute('data-round'),
          corrected: node.getAttribute('data-corrected'),
          original: node.querySelector('[data-testid="replay-round-original"]')?.textContent?.trim() ?? null,
          edited: node.querySelector('[data-testid="replay-round-edited"]')?.textContent?.trim() ?? null,
        })),
        corrections: text('replay-correction-count'),
        runLabel: document.querySelector('[data-testid="replay-run"]')?.textContent?.trim() ?? null,
        runDisabled: document.querySelector('[data-testid="replay-run"]')?.disabled ?? null,
        result: document.querySelector('[data-testid="replay-result"]')?.getAttribute('data-outcome') ?? null,
        outcome: text('replay-outcome'),
        trials: Array.from(document.querySelectorAll('[data-testid="replay-trial"]')).map((node) => ({
          round: node.getAttribute('data-round'),
          enabled: node.querySelector('[data-testid="replay-trial-enabled"]')?.textContent?.trim() ?? null,
          disabled: node.querySelector('[data-testid="replay-trial-disabled"]')?.textContent?.trim() ?? null,
        })),
        differencesStatus: document
          .querySelector('[data-testid="replay-differences-status"]')
          ?.getAttribute('data-differences'),
        differencesStatusText: text('replay-differences-status'),
        differences: Array.from(document.querySelectorAll('[data-testid="replay-difference"]')).map((node) => ({
          round: node.getAttribute('data-round'),
          label: node.querySelector('[data-testid="replay-difference-label"]')?.textContent?.trim() ?? null,
          recordedEnabled: node.querySelector('[data-testid="replay-difference-enabled"]')?.textContent?.trim() ?? null,
          recordedDisabled:
            node.querySelector('[data-testid="replay-difference-disabled"]')?.textContent?.trim() ?? null,
          recomputedEnabled:
            node.querySelector('[data-testid="replay-difference-recomputed-enabled"]')?.textContent?.trim() ?? null,
          recomputedDisabled:
            node.querySelector('[data-testid="replay-difference-recomputed-disabled"]')?.textContent?.trim() ?? null,
        })),
        invalidMessage: text('replay-invalid-message'),
        invalidEvent: text('replay-invalid-event'),
        copyStatus: document.querySelector('[data-testid="copy-status"]')?.getAttribute('data-status') ?? null,
        copyMessage: text('copy-status-message'),
      },
      restore: {
        visible: document.querySelector('[data-testid="restore-panel"]') !== null,
        summary: summary?.textContent?.trim() ?? null,
        complete: summary?.getAttribute('data-complete') ?? null,
        buttonDisabled: document.querySelector('[data-testid="restore-button"]')?.disabled ?? null,
        managerUrl: text('restore-manager-url'),
        failures: Array.from(document.querySelectorAll('[data-testid="restore-failure"]')).map((node) => ({
          id: node.getAttribute('data-extension-id'),
          code: node.getAttribute('data-code'),
          name: node.querySelector('[data-testid="restore-failure-name"]')?.textContent?.trim() ?? '',
          codeLabel: node.querySelector('[data-testid="restore-failure-code"]')?.textContent?.trim() ?? '',
          guidance: node.querySelector('[data-testid="restore-failure-guidance"]')?.textContent?.trim() ?? '',
          message: node.querySelector('[data-testid="restore-failure-message"]')?.textContent?.trim() ?? '',
        })),
      },
      /**
       * The restored screen never asserts success: `restored` is the audit state a
       * `session-reset` records, so the screen's own `data-complete` and its leftover list
       * are what a scenario must assert on.
       */
      restoredScreen: {
        complete: document.querySelector('[data-testid="restored-screen"]')?.getAttribute('data-complete') ?? null,
        explanation: text('restored-explanation'),
        summary: text('restored-summary'),
        summaryComplete:
          document.querySelector('[data-testid="restored-summary"]')?.getAttribute('data-complete') ?? null,
        detail: text('restored-detail'),
        nextStep: text('restored-next-step'),
        restoreLabel: document.querySelector('[data-testid="restored-restore"]')?.textContent?.trim() ?? null,
        leftovers: Array.from(document.querySelectorAll('[data-testid="restored-leftover"]')).map((node) => ({
          id: node.getAttribute('data-extension-id'),
          kind: node.getAttribute('data-kind'),
          name: node.querySelector('[data-testid="restored-leftover-name"]')?.textContent?.trim() ?? '',
          state: node.querySelector('[data-testid="restored-leftover-state"]')?.textContent?.trim() ?? '',
        })),
      },
      toggleFailure: {
        visible: document.querySelector('[data-testid="toggle-failure"]') !== null,
        explanation: text('toggle-failure-explanation'),
        rows: Array.from(document.querySelectorAll('[data-testid="toggle-failure-row"]')).map((node) => ({
          id: node.getAttribute('data-extension-id'),
          code: node.getAttribute('data-code'),
          name: node.querySelector('[data-testid="toggle-failure-name"]')?.textContent?.trim() ?? '',
          codeLabel: node.querySelector('[data-testid="toggle-failure-code"]')?.textContent?.trim() ?? '',
          guidance: node.querySelector('[data-testid="toggle-failure-guidance"]')?.textContent?.trim() ?? '',
          message: node.querySelector('[data-testid="toggle-failure-message"]')?.textContent?.trim() ?? '',
          managerUrl:
            node.querySelector('[data-testid="toggle-failure-manager"]')?.getAttribute('data-manager-url') ?? null,
        })),
        escalation: {
          present: document.querySelector('[data-testid="escalation-enable"]') !== null,
          extensionId:
            document.querySelector('[data-testid="escalation-actions"]')?.getAttribute('data-extension-id') ?? null,
          label: document.querySelector('[data-testid="escalation-enable"]')?.textContent?.trim() ?? null,
          declineLabel: document.querySelector('[data-testid="escalation-decline"]')?.textContent?.trim() ?? null,
          note: text('escalation-note'),
        },
        manualRecovery: {
          note: text('manual-recovery-note'),
          url: text('manual-recovery-url'),
        },
        restoreLabel: document.querySelector('[data-testid="toggle-failure-restore"]')?.textContent?.trim() ?? null,
      },
      snapshotChange: {
        visible: document.querySelector('[data-testid="snapshot-change"]') !== null,
        cause: text('snapshot-change-cause'),
        note: text('snapshot-change-note'),
        rows: Array.from(document.querySelectorAll('[data-testid="snapshot-change-row"]')).map((node) => ({
          id: node.getAttribute('data-extension-id'),
          kind: node.getAttribute('data-kind'),
          name: node.querySelector('[data-testid="snapshot-change-name"]')?.textContent?.trim() ?? '',
          kindLabel: node.querySelector('[data-testid="snapshot-change-kind"]')?.textContent?.trim() ?? '',
          detail: node.querySelector('[data-testid="snapshot-change-detail"]')?.textContent?.trim() ?? '',
        })),
        restoreLabel: document.querySelector('[data-testid="snapshot-change-restore"]')?.textContent?.trim() ?? null,
        restartLabel: document.querySelector('[data-testid="snapshot-change-restart"]')?.textContent?.trim() ?? null,
        restartNote: text('snapshot-change-restart-note'),
        actionsPresent: document.querySelector('[data-testid="snapshot-change-actions"]') !== null,
      },
      snapshotWarning: {
        visible: document.querySelector('[data-testid="snapshot-warning"]') !== null,
        count: document.querySelector('[data-testid="snapshot-warning"]')?.getAttribute('data-count') ?? null,
        live: document.querySelector('[data-testid="snapshot-warning"]')?.getAttribute('aria-live') ?? null,
        headline: text('snapshot-warning-headline'),
        detail: text('snapshot-warning-detail'),
        rows: Array.from(document.querySelectorAll('[data-testid="snapshot-warning-row"]')).map((node) => ({
          id: node.getAttribute('data-extension-id'),
          kind: node.getAttribute('data-kind'),
          name: node.querySelector('[data-testid="snapshot-warning-name"]')?.textContent?.trim() ?? '',
          kindLabel: node.querySelector('[data-testid="snapshot-warning-kind"]')?.textContent?.trim() ?? '',
        })),
        dismissLabel: document.querySelector('[data-testid="snapshot-warning-dismiss"]')?.textContent?.trim() ?? null,
      },
      testTabPrompt: {
        visible: document.querySelector('[data-testid="test-tab-prompt"]') !== null,
        kind: document.querySelector('[data-testid="test-tab-prompt"]')?.getAttribute('data-kind') ?? null,
        tabId: document.querySelector('[data-testid="test-tab-prompt"]')?.getAttribute('data-tab-id') ?? null,
        headline: text('test-tab-prompt-headline'),
        detail: text('test-tab-prompt-detail'),
        actionLabel: document.querySelector('[data-testid="test-tab-prompt-action"]')?.textContent?.trim() ?? null,
        verdictNote: text('test-tab-prompt-verdict-note'),
        hasVerdictButtons:
          document.querySelector('[data-testid="verdict-persists"]') !== null ||
          document.querySelector('[data-testid="verdict-gone"]') !== null,
      },
      paused: {
        cause: text('paused-cause'),
        trial: text('paused-trial'),
        resyncLabel: document.querySelector('[data-testid="paused-resync"]')?.textContent?.trim() ?? null,
        undoLabel: document.querySelector('[data-testid="paused-undo"]')?.textContent?.trim() ?? null,
        undoDisabled: document.querySelector('[data-testid="paused-undo"]')?.disabled ?? null,
        undoBlocked: text('paused-undo-blocked'),
        restoreLabel: document.querySelector('[data-testid="paused-restore"]')?.textContent?.trim() ?? null,
        rows: Array.from(document.querySelectorAll('[data-testid="drift-row"]')).map((node) => ({
          name: node.querySelector('[data-testid="drift-row-name"]')?.textContent?.trim() ?? '',
          state: node.querySelector('[data-testid="drift-row-state"]')?.textContent?.trim() ?? '',
        })),
        categories: Array.from(document.querySelectorAll('[data-testid^="drift-category-"]'))
          .filter((node) => node.hasAttribute('data-category'))
          .map((node) => ({
            id: node.getAttribute('data-testid'),
            category: node.getAttribute('data-category'),
            count: node.getAttribute('data-count'),
            entries: Array.from(node.querySelectorAll('[data-testid="drift-category-name"]')).map((entry) =>
              entry.textContent?.trim(),
            ),
          })),
      },
      startup: {
        visible: document.querySelector('[data-testid="startup-reconciliation"]') !== null,
        restarted: document.querySelector('[data-testid="startup-reconciliation"]')?.getAttribute('data-restarted'),
        status: document.querySelector('[data-testid="startup-reconciliation"]')?.getAttribute('data-status'),
        headline: text('startup-reconciliation-headline'),
        detail: text('startup-reconciliation-detail'),
        difference: text('startup-reconciliation-difference'),
        differs: document
          .querySelector('[data-testid="startup-reconciliation-difference"]')
          ?.getAttribute('data-differs'),
        resumeLabel: document.querySelector('[data-testid="startup-resume"]')?.textContent?.trim() ?? null,
        restoreLabel: document.querySelector('[data-testid="startup-restore"]')?.textContent?.trim() ?? null,
        dismissLabel: document.querySelector('[data-testid="startup-dismiss"]')?.textContent?.trim() ?? null,
        hasResume: document.querySelector('[data-testid="startup-resume"]') !== null,
        hasRestore: document.querySelector('[data-testid="startup-restore"]') !== null,
      },
      picker: {
        startLabel: document.querySelector('[data-testid="picker-start"]')?.textContent?.trim() ?? null,
        startDisabled: document.querySelector('[data-testid="picker-start"]')?.disabled ?? null,
        blocked: text('picker-blocked'),
        modeNote: text('picker-mode-note'),
      },
      /**
       * The way out of a finished session. `blocked` is the panel's own answer to whether the
       * log may be replaced yet, and `note` is the reason it gives, so a scenario can prove
       * both the offered action and the restore-first rule that holds it back.
       */
      newSession: {
        visible: document.querySelector('[data-testid="new-session"]') !== null,
        blocked: document.querySelector('[data-testid="new-session"]')?.getAttribute('data-blocked') ?? null,
        label: document.querySelector('[data-testid="new-session-start"]')?.textContent?.trim() ?? null,
        disabled: document.querySelector('[data-testid="new-session-start"]')?.disabled ?? null,
        note: text('new-session-note'),
        policy: text('new-session-policy'),
      },
      /**
       * SPEC §Error handling, `User aborts`. `restoreDefault` names which of the two
       * answers the panel marks as the default one, so a scenario can prove the SPEC's
       * "default yes" instead of reading the answer order.
       */
      abort: {
        visible: document.querySelector('[data-testid="abort-panel"]') !== null,
        actionLabel: document.querySelector('[data-testid="abort-session"]')?.textContent?.trim() ?? null,
        question: text('abort-question'),
        detail: text('abort-detail'),
        restoreLabel: document.querySelector('[data-testid="abort-restore"]')?.textContent?.trim() ?? null,
        restoreDefault: document.querySelector('[data-testid="abort-restore"]')?.getAttribute('data-default') ?? null,
        leaveLabel: document.querySelector('[data-testid="abort-leave"]')?.textContent?.trim() ?? null,
        cancelLabel: document.querySelector('[data-testid="abort-cancel"]')?.textContent?.trim() ?? null,
      },
      aborted: {
        visible: document.querySelector('[data-testid="aborted-screen"]') !== null,
        explanation: text('aborted-explanation'),
        guidance: text('aborted-guidance'),
        restoreLabel: document.querySelector('[data-testid="aborted-restore"]')?.textContent?.trim() ?? null,
      },
      assisted: {
        explanation: text('assisted-explanation'),
        attestLabel: document.querySelector('[data-testid="assisted-attest"]')?.textContent?.trim() ?? null,
        openLabel: document.querySelector('[data-testid="assisted-open-addons"]')?.textContent?.trim() ?? null,
        verifyLabel: document.querySelector('[data-testid="assisted-verify"]')?.textContent?.trim() ?? null,
        progress: text('assisted-progress'),
        instruction: text('assisted-manual-instruction'),
        addonsMessage: text('assisted-addons-message'),
        error: text('sidepanel-error'),
        hasVerdictButtons: document.querySelector('[data-testid="verdict-gone"]') !== null,
        checklist: Array.from(document.querySelectorAll('[data-testid="assisted-checklist-row"]')).map((node) => ({
          id: node.getAttribute('data-extension-id'),
          name: node.querySelector('[data-testid="assisted-checklist-name"]')?.textContent?.trim() ?? '',
          target: node.querySelector('[data-testid="assisted-checklist-target"]')?.textContent?.trim() ?? '',
          done: node.querySelector('[data-testid="assisted-checklist-done"]')?.getAttribute('data-done'),
        })),
        restoreSummary: text('assisted-restore-summary'),
        restoreComplete: document
          .querySelector('[data-testid="assisted-restore-summary"]')
          ?.getAttribute('data-complete'),
        restoreAccepted: text('assisted-restore-accepted'),
        hasAcceptAction: document.querySelector('[data-testid="assisted-restore-accept"]') !== null,
        restoreRows: Array.from(document.querySelectorAll('[data-testid="assisted-restore-row"]')).map((node) => ({
          id: node.getAttribute('data-extension-id'),
          name: node.querySelector('[data-testid="assisted-restore-name"]')?.textContent?.trim() ?? '',
          done: node.getAttribute('data-done'),
        })),
      },
      assistedTrial: {
        explanation: text('assisted-trial-explanation'),
        instruction: text('assisted-trial-instruction'),
        progress: text('assisted-trial-progress'),
        matched: document.querySelector('[data-testid="assisted-trial-progress"]')?.getAttribute('data-matched'),
        openLabel: document.querySelector('[data-testid="assisted-trial-open-addons"]')?.textContent?.trim() ?? null,
        verifyLabel: document.querySelector('[data-testid="assisted-trial-verify"]')?.textContent?.trim() ?? null,
        addonsMessage: text('assisted-trial-addons-message'),
        error: text('sidepanel-error'),
        hasVerdictButtons:
          document.querySelector('[data-testid="verdict-persists"]') !== null ||
          document.querySelector('[data-testid="verdict-gone"]') !== null,
        enableRows: Array.from(document.querySelectorAll('[data-testid="assisted-trial-enable-row"]')).map((node) => ({
          id: node.getAttribute('data-extension-id'),
          name: node.querySelector('[data-testid="assisted-trial-enable-name"]')?.textContent?.trim() ?? '',
          state: node.querySelector('[data-testid="assisted-trial-enable-state"]')?.textContent?.trim() ?? '',
        })),
        disableRows: Array.from(document.querySelectorAll('[data-testid="assisted-trial-disable-row"]')).map(
          (node) => ({
            id: node.getAttribute('data-extension-id'),
            name: node.querySelector('[data-testid="assisted-trial-disable-name"]')?.textContent?.trim() ?? '',
            state: node.querySelector('[data-testid="assisted-trial-disable-state"]')?.textContent?.trim() ?? '',
          }),
        ),
      },
    };
  });
}

/**
 * A headless browser has no real clipboard, and reading it back is not exposed over
 * CDP or BiDi. The page's `navigator.clipboard.writeText` is therefore wrapped so the
 * copy action is still driven by the product code and the written text is readable
 * afterwards; the add-on's own fallback chain stays exercised because the wrapper
 * resolves instead of the browser clipboard.
 */
export async function captureClipboard(page) {
  return page.evaluate((globalName) => {
    const store = { writes: [] };
    globalThis[globalName] = store;
    const clipboard = navigator.clipboard ?? {};
    clipboard.writeText = async (text) => {
      store.writes.push(text);
    };
    Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true });
    return { installed: true };
  }, CLIPBOARD_CAPTURE_GLOBAL);
}

export async function readClipboardCaptures(page) {
  return page.evaluate((globalName) => globalThis[globalName]?.writes ?? [], CLIPBOARD_CAPTURE_GLOBAL);
}

export async function clickTestId(page, testId) {
  const clicked = await page.evaluate((id) => {
    const node = document.querySelector(`[data-testid="${id}"]`);
    if (node === null) return false;
    node.click();
    return true;
  }, testId);
  if (!clicked) throw new Error(`No clickable node with data-testid="${testId}"`);
}

/**
 * Reads extension enabled state from an extension page. `globalThis.browser` is
 * absent inside evaluated page code, and Firefox only exposes `identity`-less
 * `browser` from the extension realm, so resolve the API the same way the
 * background does.
 */
export async function readExtensionEnabledStates(page, extensionIds) {
  return page.evaluate(async (ids) => {
    const api = globalThis.browser ?? globalThis.chrome;
    const all = await api.management.getAll();
    const states = {};
    for (const id of ids) {
      const entry = all.find((candidate) => candidate.id === id);
      states[id] = entry === undefined ? 'missing' : entry.enabled;
    }
    return states;
  }, extensionIds);
}

/**
 * `browser.tabs.reload` is unobservable from the extension realm without the
 * `tabs` permission, so mark the test page's own JS context: any reload drops
 * the marker.
 */
export async function markPageForReloadCheck(page) {
  await page.evaluate(() => {
    globalThis.__bisectReloadMarker = 'alive';
  });
}

export async function readPageReloadMarker(page) {
  return page.evaluate(() => globalThis.__bisectReloadMarker ?? null);
}

/**
 * Drops the persisted bisect state so the next panel load renders the candidate
 * picker with no session. Starting another session in-app is ISS-004+ scope, so
 * the harness owns the reset when one launch must cover more than one flow.
 *
 * The startup signal goes with the log: it names a session that no longer exists, and a
 * leftover one would make the next scenario believe a browser restart interrupted it.
 */
export async function resetBisectState(page) {
  await page.evaluate(async () => {
    const api = globalThis.browser ?? globalThis.chrome;
    await api.storage.local.remove(['bisectLog', 'bisectConfig', 'bisectStartupSignal']);
  });
}

/**
 * Reads the persisted bisect log straight out of storage, so a test can prove the live
 * log stayed append-only across a read-only flow such as replay.
 */
export async function readPersistedBisectLog(page) {
  return page.evaluate(async () => {
    const api = globalThis.browser ?? globalThis.chrome;
    const stored = await api.storage.local.get('bisectLog');
    return stored?.bisectLog ?? null;
  });
}

/**
 * Puts the fixture extensions back to the enabled/disabled split the baseline
 * scenario expects, so one failed scenario cannot cascade into the next (a
 * leftover all-off state leaves the picker with no eligible candidates).
 */
export async function restoreFixtureState(page, { candidates, dormant }) {
  return page.evaluate(
    async (fixtures) => {
      const api = globalThis.browser ?? globalThis.chrome;
      const all = await api.management.getAll();
      const restore = [];
      for (const id of fixtures.candidateIds) restore.push([id, true]);
      if (fixtures.dormantId !== null) restore.push([fixtures.dormantId, false]);
      const results = [];
      for (const [id, enabled] of restore) {
        const current = all.find((entry) => entry.id === id);
        if (current === undefined || current.enabled === enabled) continue;
        try {
          await api.management.setEnabled(id, enabled);
          results.push({ id, enabled, ok: true });
        } catch (error) {
          results.push({ id, enabled, ok: false, message: String(error?.message ?? error) });
        }
      }
      return results;
    },
    {
      candidateIds: candidates.map((entry) => entry.id),
      dormantId: dormant?.id ?? null,
    },
  );
}

/**
 * Reads the immutable snapshot out of the persisted `session-started` event. The
 * mid-session-change scenario asserts on this directly: the point of the slice is that
 * the snapshot does not move, which no rendered test id can prove on its own.
 */
export async function readSnapshotCandidateIds(page) {
  return page.evaluate(async () => {
    const api = globalThis.browser ?? globalThis.chrome;
    const stored = await api.storage.local.get('bisectLog');
    const events = stored?.bisectLog?.events ?? [];
    const start = events.find((event) => event.type === 'session-started');
    return (start?.payload?.candidateOrder ?? []).map((entry) => ({ id: entry.id, version: entry.version }));
  });
}

/**
 * The bound test tab as the config records it. The panel renders it on the preflight
 * screen only, so a scenario that closed the tab later still needs the setting itself.
 */
export async function readBoundTestTab(page) {
  return page.evaluate(async () => {
    const api = globalThis.browser ?? globalThis.chrome;
    const stored = await api.storage.local.get('bisectConfig');
    return stored?.bisectConfig?.testTab ?? null;
  });
}

/**
 * Uninstalls a fixture extension for real. Puppeteer owns the install, so this is the
 * only way to make the browser report `onUninstalled` and drop the entry from `getAll()`,
 * which is exactly the change a removed candidate has to survive.
 */
export async function uninstallExtension(session, extensionId) {
  await session.browser.uninstallExtension(extensionId);
}

/**
 * Closes the bound test tab, so the next `tabs.reload` rejects the way a user-closed tab
 * does. The panel keeps the stale id in its config; that is the state under test.
 */
export async function closePage(page) {
  await page.close();
}
