import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

export const EXTENSION_MARKER_ATTRIBUTE = 'data-ext-bisect-state';
export const EXTENSION_TAB_ID_ATTRIBUTE = 'data-ext-bisect-tab-id';
export const POPUP_ROOT_SELECTOR = '[data-testid="popup-root"]';
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
 * `moz-extension://` documents with `waitUntil: 'domcontentloaded' | 'load'`.
 * `waitUntil: 'commit'` resolves immediately, so navigate with it and then wait
 * for the app root to exist.
 */
export async function gotoExtensionPage(page, url, { selector = POPUP_ROOT_SELECTOR, timeout = 20000 } = {}) {
  const navigation = page.goto(url, { waitUntil: 'commit', timeout }).catch((error) => {
    if (error instanceof Error && error.message.includes('Unknown value for options.waitUntil')) {
      return page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    }
    throw error;
  });
  await navigation.catch(() => undefined);
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const ready = await page.evaluate((target) => document.querySelector(target) !== null, selector).catch(() => false);
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for "${selector}" at ${url}`);
}

export async function reloadExtensionPage(page, { selector = POPUP_ROOT_SELECTOR, timeout = 20000 } = {}) {
  await page.reload({ waitUntil: 'commit', timeout }).catch((error) => {
    if (error instanceof Error && error.message.includes('Unknown value for options.waitUntil')) {
      return page.reload({ waitUntil: 'domcontentloaded', timeout }).catch(() => undefined);
    }
    return undefined;
  });
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const ready = await page.evaluate((target) => document.querySelector(target) !== null, selector).catch(() => false);
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for "${selector}" after reload`);
}

export async function waitForAttribute(page, name, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await page
      .evaluate((attribute) => document.documentElement.getAttribute(attribute), name)
      .catch(() => null);
    if (value !== null) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return null;
}

async function launchChrome({ headless, recorder, extPath }) {
  const browser = await puppeteer.launch({
    browser: 'chrome',
    headless,
    pipe: true,
    enableExtensions: true,
    args: ['--no-first-run', '--enable-unsafe-extension-debugging'],
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
    async openPopup(activePage) {
      const extension = (await browser.extensions()).get(extensionId);
      if (extension === undefined) throw new Error('Chrome extension handle unavailable');

      const existingUrls = new Set((await extension.pages()).map((page) => page.url()));

      try {
        await activePage.triggerExtensionAction(extension);
      } catch {
        // Fall through to direct navigation below.
      }

      const deadline = Date.now() + 8000;
      while (Date.now() < deadline) {
        const pages = await extension.pages();
        const opened = pages.find((page) => page.url().includes('/popup.html') && !existingUrls.has(page.url()));
        if (opened !== undefined) {
          attachPageListeners(opened, recorder, 'popup');
          return opened;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const fallback = await browser.newPage();
      attachPageListeners(fallback, recorder, 'popup');
      await gotoExtensionPage(fallback, `${extensionOrigin}/popup.html`);
      return fallback;
    },
    async openSurface() {
      const page = await browser.newPage();
      attachPageListeners(page, recorder, 'sidepanel');
      await gotoExtensionPage(page, `${extensionOrigin}/sidepanel.html`, { selector: SIDEPANEL_ROOT_SELECTOR });
      return page;
    },
  };
}

async function launchFirefox({ headless, recorder, extPath }) {
  const geckoId = readFirefoxGeckoId(extPath);

  const browser = await puppeteer.launch({
    browser: 'firefox',
    headless,
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
    async openPopup(activePage) {
      const tabId = await waitForAttribute(activePage, EXTENSION_TAB_ID_ATTRIBUTE).catch(() => null);
      const popup = await browser.newPage();
      attachPageListeners(popup, recorder, 'popup');
      const query = tabId === null ? '' : `?tabId=${tabId}`;
      await gotoExtensionPage(popup, `${extensionOrigin}/popup.html${query}`);
      return popup;
    },
    async openSurface() {
      const page = await browser.newPage();
      attachPageListeners(page, recorder, 'sidepanel');
      await gotoExtensionPage(page, `${extensionOrigin}/sidepanel.html`, { selector: SIDEPANEL_ROOT_SELECTOR });
      return page;
    },
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
          retry:
            node.querySelector('[data-testid="history-entry-retry"]')?.textContent?.trim() ??
            null,
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
      restore: {
        visible: document.querySelector('[data-testid="restore-panel"]') !== null,
        summary: summary?.textContent?.trim() ?? null,
        complete: summary?.getAttribute('data-complete') ?? null,
        buttonDisabled: document.querySelector('[data-testid="restore-button"]')?.disabled ?? null,
        failures: Array.from(document.querySelectorAll('[data-testid="restore-failure"]')).map((node) => ({
          id: node.getAttribute('data-extension-id'),
          name: node.querySelector('[data-testid="restore-failure-name"]')?.textContent?.trim() ?? '',
          code: node.querySelector('[data-testid="restore-failure-code"]')?.textContent?.trim() ?? '',
          message: node.querySelector('[data-testid="restore-failure-message"]')?.textContent?.trim() ?? '',
        })),
      },
      picker: {
        startLabel: document.querySelector('[data-testid="picker-start"]')?.textContent?.trim() ?? null,
        startDisabled: document.querySelector('[data-testid="picker-start"]')?.disabled ?? null,
        blocked: text('picker-blocked'),
        modeNote: text('picker-mode-note'),
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
        startToggledNothing: true,
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
 */
export async function resetBisectState(page) {
  await page.evaluate(async () => {
    const api = globalThis.browser ?? globalThis.chrome;
    await api.storage.local.remove(['bisectLog', 'bisectConfig']);
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
 * `browser.tabs.query({ active: true })` resolves the focused tab, so the test
 * tab must be in front before the panel binds it.
 */
export async function focusPage(page) {
  await page.bringToFront();
}
