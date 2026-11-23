import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { startFixtureServer } from './fixture-server.mjs';
import { collectErrors, launchTestBrowser, POPUP_ROOT_SELECTOR } from './harness.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseArgs(argv) {
  const options = {
    browser: 'chrome',
    url: '/',
    action: null,
    screenshot: null,
    headless: true,
    timeout: 15000,
    settleMs: 750,
  };

  for (const arg of argv) {
    if (arg === '--headed') options.headless = false;
    else if (arg.startsWith('--browser=')) options.browser = arg.slice('--browser='.length);
    else if (arg.startsWith('--url=')) options.url = arg.slice('--url='.length);
    else if (arg.startsWith('--action=')) options.action = arg.slice('--action='.length);
    else if (arg.startsWith('--screenshot=')) options.screenshot = arg.slice('--screenshot='.length);
    else if (arg.startsWith('--timeout=')) options.timeout = Number(arg.slice('--timeout='.length));
    else if (arg.startsWith('--settle=')) options.settleMs = Number(arg.slice('--settle='.length));
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!['chrome', 'firefox'].includes(options.browser)) {
    throw new Error(`Invalid --browser value: ${options.browser}`);
  }
  if (options.action !== null && !['popup', 'none'].includes(options.action)) {
    throw new Error(`Invalid --action value: ${options.action}`);
  }
  return options;
}

async function summarizeDom(page) {
  return page.evaluate(() => {
    const attributes = Array.from(document.documentElement.attributes).map(
      (attribute) => `${attribute.name}="${attribute.value}"`,
    );
    return {
      title: document.title,
      url: location.href,
      readyState: document.readyState,
      htmlAttributes: attributes,
      counts: {
        elements: document.querySelectorAll('*').length,
        testIds: document.querySelectorAll('[data-testid]').length,
        inputs: document.querySelectorAll('input').length,
        buttons: document.querySelectorAll('button').length,
      },
      testIds: Array.from(document.querySelectorAll('[data-testid]')).map((element) => ({
        testId: element.getAttribute('data-testid'),
        tag: element.tagName.toLowerCase(),
        text: (element.textContent ?? '').trim().slice(0, 80),
      })),
    };
  });
}

async function dumpStorage(page) {
  try {
    return await page.evaluate(async () => {
      const api = globalThis.browser ?? globalThis.chrome;
      const local = api?.storage?.local;
      if (local === undefined) return { available: false, reason: 'storage.local unavailable' };
      const values = await local.get(null);
      return { available: true, values };
    });
  } catch (error) {
    return { available: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

async function captureScreenshot(page, target) {
  if (target === null) return null;
  const absolute = path.resolve(target);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await page.screenshot({ path: absolute, fullPage: false });
  return absolute;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const fixture = await startFixtureServer();
  const output = {
    ok: false,
    browser: options.browser,
    url: null,
    action: options.action,
    console: [],
    pageErrors: [],
    backgroundErrors: [],
    requestFailures: [],
    storage: null,
    dom: null,
    screenshot: null,
    error: null,
  };

  let session = null;
  try {
    session = await launchTestBrowser({ browserName: options.browser, headless: options.headless });

    const page = await session.newPage();
    const targetUrl = options.url.startsWith('http') ? options.url : `${fixture.url}${options.url}`;
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await sleep(options.settleMs);

    let inspected = page;
    if (options.action === 'popup') {
      inspected = await session.openPopup(page);
      await inspected.waitForSelector(POPUP_ROOT_SELECTOR, { timeout: options.timeout });
      await sleep(options.settleMs);
    }

    output.url = await inspected.evaluate(() => location.href).catch(() => inspected.url());
    output.dom = await summarizeDom(inspected);
    output.storage = await dumpStorage(inspected);
    output.screenshot = options.screenshot === null ? null : await captureScreenshot(inspected, options.screenshot);

    const errors = collectErrors(session.recorder);
    output.console = session.recorder.console;
    output.pageErrors = errors.pageErrors;
    output.backgroundErrors = errors.backgroundErrors;
    output.requestFailures = errors.requestFailures;
    output.ok = true;
  } catch (error) {
    output.error = error instanceof Error ? error.message : String(error);
    if (options.screenshot !== null && session !== null) {
      const pages = await session.browser.pages().catch(() => []);
      output.screenshot = await captureScreenshot(pages.at(-1) ?? null, options.screenshot).catch(() => null);
    }
  } finally {
    if (session !== null) await session.close().catch(() => undefined);
    await fixture.close().catch(() => undefined);
  }

  console.log(JSON.stringify(output, null, 2));
  process.exit(output.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
