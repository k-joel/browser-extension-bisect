import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { startFixtureServer } from './fixture-server.mjs';
import {
  BACKGROUND_READY_LOG,
  collectErrors,
  EXTENSION_MARKER_ATTRIBUTE,
  launchTestBrowser,
  reloadExtensionPage,
  waitForAttribute,
  waitForLog,
} from './harness.mjs';

const ARTIFACTS_DIR = path.resolve('.agent-artifacts');
const STATUS_SELECTOR = '[data-testid="status"]';
const TOGGLE_SELECTOR = '[data-testid="toggle-enabled"]';
const RECORD_SELECTOR = '[data-testid="record-interaction"]';
const BATCH_SIZE_SELECTOR = '[data-testid="batch-size"]';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseArgs(argv) {
  const options = { browser: 'all', headed: false, json: false, scenario: null };
  for (const arg of argv) {
    if (arg === '--headed') options.headed = true;
    else if (arg === '--json') options.json = true;
    else if (arg.startsWith('--browser=')) options.browser = arg.slice('--browser='.length);
    else if (arg.startsWith('--scenario=')) options.scenario = arg.slice('--scenario='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!['all', 'chrome', 'firefox'].includes(options.browser)) {
    throw new Error(`Invalid --browser value: ${options.browser}`);
  }
  return options;
}

async function resetArtifactsDir() {
  await fs.rm(ARTIFACTS_DIR, { recursive: true, force: true });
  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });
}

function textOf(page, selector) {
  return page.$eval(selector, (node) => node.textContent?.trim() ?? '');
}

async function waitForSelectorText(page, selector, expected, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    last = await textOf(page, selector).catch(() => null);
    if (last?.includes(expected)) return last;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for "${selector}" to contain "${expected}" (last: ${JSON.stringify(last)})`);
}

async function runScenario({ page, popup, session }) {
  const steps = [];
  const record = (name, ok, details = {}) => {
    steps.push({ name, ok, ...details });
    if (!ok) throw new Error(`Step failed: ${name} ${JSON.stringify(details)}`);
  };

  const initialMarker = await waitForAttribute(page, EXTENSION_MARKER_ATTRIBUTE, 15000);
  record('content-script-injects', initialMarker !== null, { marker: initialMarker });
  record('content-script-default-enabled', initialMarker === 'enabled', { marker: initialMarker });

  await popup.waitForSelector(STATUS_SELECTOR, { timeout: 15000 });
  const initialStatus = await textOf(popup, STATUS_SELECTOR);
  record('popup-renders-stored-state', initialStatus.includes('enabled'), { status: initialStatus });

  await popup.click(TOGGLE_SELECTOR);
  const disabledStatus = await waitForSelectorText(popup, STATUS_SELECTOR, 'disabled');
  record('popup-toggle-mutates-state', disabledStatus.includes('disabled'), { status: disabledStatus });

  const disabledMarker = await waitForAttribute(page, EXTENSION_MARKER_ATTRIBUTE, 15000);
  record('page-reflects-storage-change', disabledMarker === 'disabled', { marker: disabledMarker });

  await popup.click(RECORD_SELECTOR);
  const recordedStatus = await waitForSelectorText(popup, STATUS_SELECTOR, '1 interactions');
  record('popup-records-interaction', recordedStatus.includes('1 interactions'), { status: recordedStatus });

  const batchInput = await popup.$(BATCH_SIZE_SELECTOR);
  record('popup-batch-size-input-present', batchInput !== null);
  await batchInput.evaluate((node) => {
    node.value = '4';
    node.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await waitForSelectorText(popup, '[data-testid="settings-json"]', '"batchSize":4');

  await reloadExtensionPage(popup, { selector: STATUS_SELECTOR });
  const persistedStatus = await waitForSelectorText(popup, STATUS_SELECTOR, 'disabled');
  record('state-persists-across-reload', persistedStatus.includes('disabled'), { status: persistedStatus });
  await waitForSelectorText(popup, '[data-testid="settings-json"]', '"batchSize":4');

  const errors = collectErrors(session.recorder);
  record('no-background-runtime-errors', errors.backgroundErrors.length === 0, { errors: errors.backgroundErrors });
  record('no-page-errors', errors.pageErrors.length === 0, { errors: errors.pageErrors });
  record('no-console-errors', errors.consoleErrors.length === 0, { errors: errors.consoleErrors });
  record('no-request-failures', errors.requestFailures.length === 0, { errors: errors.requestFailures });

  return { steps };
}

async function captureFailure(popup, page, browserName, scenario) {
  const file = path.join(ARTIFACTS_DIR, `failure-${browserName}-${scenario}.png`);
  for (const target of [popup, page]) {
    if (target === null) continue;
    try {
      await target.screenshot({ path: file, fullPage: false });
      return file;
    } catch {
      // Try the next target.
    }
  }
  return null;
}

async function summarizeDom(page) {
  try {
    return await page.evaluate(() => {
      const describe = (element) => {
        const id = element.id === '' ? '' : `#${element.id}`;
        const testId = element.getAttribute('data-testid');
        const suffix = testId === null ? '' : `[data-testid="${testId}"]`;
        return `${element.tagName.toLowerCase()}${id}${suffix}="${(element.textContent ?? '').trim().slice(0, 60)}"`;
      };
      return {
        title: document.title,
        root: document.documentElement.outerHTML.slice(0, 1200),
        nodes: Array.from(document.querySelectorAll('[data-testid]')).map(describe),
      };
    });
  } catch {
    return null;
  }
}

async function runBrowser(browserName, options) {
  const fixture = await startFixtureServer();
  const result = { browser: browserName, ok: false, scenario: options.scenario ?? 'default', steps: [], errors: null };

  let session = null;
  let popup = null;
  let page = null;

  try {
    session = await launchTestBrowser({ browserName, headless: !options.headed });

    if (browserName === 'chrome') {
      const ready = await waitForLog(session.recorder, (entry) => entry.text.includes(BACKGROUND_READY_LOG), 15000);
      if (!ready) throw new Error('Background service worker never reported readiness');
    }

    page = await session.newPage();
    await page.goto(`${fixture.url}/`, { waitUntil: 'domcontentloaded' });

    popup = await session.openPopup(page);
    const { steps } = await runScenario({ page, popup, session });
    result.steps = steps;
    result.ok = true;
  } catch (error) {
    const errors =
      session === null
        ? { pageErrors: [], consoleErrors: [], backgroundErrors: [], requestFailures: [] }
        : collectErrors(session.recorder);
    result.errors = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? (error.stack ?? null) : null,
      screenshot: await captureFailure(popup, page, browserName, options.scenario ?? 'default'),
      dom: page === null ? null : await summarizeDom(popup ?? page),
      ...errors,
    };
  } finally {
    if (session !== null) await session.close().catch(() => undefined);
    await fixture.close().catch(() => undefined);
  }

  return result;
}

function printHuman(results) {
  for (const result of results) {
    console.log(`[${result.ok ? 'PASS' : 'FAIL'}] ${result.browser}`);
    for (const step of result.steps) {
      console.log(`  ${step.ok ? 'PASS' : 'FAIL'} ${step.name}`);
    }
    if (result.errors !== null) {
      console.error(`  error: ${result.errors.message}`);
      if (result.errors.screenshot !== null) console.error(`  screenshot: ${result.errors.screenshot}`);
      if (result.errors.dom !== null) console.error(`  dom: ${JSON.stringify(result.errors.dom.nodes)}`);
      for (const entry of result.errors.pageErrors) console.error(`  pageerror: ${entry.message}`);
      for (const entry of result.errors.backgroundErrors) console.error(`  background: ${entry.text}`);
      for (const entry of result.errors.consoleErrors) console.error(`  console: ${entry.text}`);
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await resetArtifactsDir();

  const browsers = options.browser === 'all' ? ['chrome', 'firefox'] : [options.browser];
  const results = [];
  for (const browserName of browsers) {
    results.push(await runBrowser(browserName, options));
  }

  const ok = results.every((result) => result.ok);
  if (options.json) {
    console.log(JSON.stringify({ ok, results }, null, 2));
  } else {
    printHuman(results);
  }
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
