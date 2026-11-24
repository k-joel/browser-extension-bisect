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
