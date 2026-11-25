import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { startFixtureServer } from '../tests/e2e/fixture-server.mjs';
import { FIXTURES } from '../tests/e2e/fixtures/fixtures.mjs';
import {
  collectErrors,
  focusTestTab,
  launchTestBrowser,
  readBoundTestTab,
  readCandidateState,
  reloadExtensionPage,
  setExtensionEnabled,
} from '../tests/e2e/harness.mjs';

const BROWSERS = ['chrome', 'firefox'];
const ELIGIBLE_FIXTURE_COUNT = 2;

const USAGE = `Usage: node tools/manual-browser.mjs [options]

Launches a visible browser with the built extension and its fixture extensions
installed, binds a fixture page as the test tab, and leaves the window open.

Options:
  --browser=<chrome|firefox>  Browser to launch (default: chrome)
  --url=<path|url>            Test page: /, /form, /dynamic, or an absolute URL (default: /)
  --user-data-dir=<path>      Keep the browser profile between runs (default: ephemeral)
  --no-fixtures               Do not install the fixture extensions
  --smoke                     Run headless, assert the session came up, close, and exit
  --headed                    Force a visible window (overrides --smoke's headless)
  --help                      Print this text
`;

function parseArgs(argv) {
  const options = {
    browser: 'chrome',
    url: '/',
    userDataDir: null,
    fixtures: true,
    smoke: false,
    headed: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--smoke') options.smoke = true;
    else if (arg === '--headed') options.headed = true;
    else if (arg === '--no-fixtures') options.fixtures = false;
    else if (arg.startsWith('--browser=')) options.browser = arg.slice('--browser='.length);
    else if (arg.startsWith('--url=')) options.url = arg.slice('--url='.length);
    else if (arg.startsWith('--user-data-dir='))
      options.userDataDir = path.resolve(arg.slice('--user-data-dir='.length));
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!BROWSERS.includes(options.browser)) throw new Error(`Invalid --browser value: ${options.browser}`);
  if (options.url.length === 0) throw new Error('--url must not be empty');
  return options;
}

function fixtureSetFor(browserName, includeFixtures) {
  if (!includeFixtures) return [];
  const shared = [FIXTURES.alpha, FIXTURES.bravo, FIXTURES.theme];
  // A Firefox temporary add-on is always enabled and cannot be disabled, so installing the
  // dormant fixture there would only add a third eligible candidate.
  return browserName === 'chrome' ? [...shared, FIXTURES.dormant] : shared;
}

function resolveTargetUrl(baseUrl, target) {
  return target.startsWith('http') ? target : `${baseUrl}${target}`;
}

/**
 * `bindTestTab` without an id resolves `tabs.query({active:true, currentWindow:true})`, and the
 * panel is a tab itself, so a human pressing "Bind the current tab" binds the panel. The binding
 * is written here instead, before the window is handed over.
 */
async function prebindTestTab(page, testTab) {
  return page.evaluate(async (binding) => {
    const api = globalThis.browser ?? globalThis.chrome;
    const stored = await api.storage.local.get('bisectConfig');
    const current = stored?.bisectConfig ?? {};
    await api.storage.local.set({
      bisectConfig: {
        schemaVersion: 1,
        excludedExtensionIds: current.excludedExtensionIds ?? [],
        testTab: binding,
      },
    });
    return binding;
  }, testTab);
}

async function runSmoke({ session, panel, tabId, includeFixtures, browserName }) {
  const bound = await readBoundTestTab(panel);
  const state = await readCandidateState(panel);
  const errors = collectErrors(session.recorder);
  const reasons = state.ineligible.map((entry) => entry.reasonCode);
  const expectedReasons = includeFixtures
    ? browserName === 'chrome'
      ? ['theme-or-app', 'disabled-at-start']
      : ['theme-or-app']
    : [];

  const checks = [
    {
      name: 'panel-rendered',
      ok: state.state !== 'missing' && state.screen === 'picker',
      detail: { state: state.state, screen: state.screen },
    },
    { name: 'test-tab-bound', ok: bound !== null && bound.tabId === tabId, detail: bound },
    {
      name: 'eligible-candidates',
      ok: state.eligible.length === (includeFixtures ? ELIGIBLE_FIXTURE_COUNT : 0),
      detail: state.eligible.map((entry) => entry.name),
    },
    { name: 'ineligible-reasons', ok: expectedReasons.every((reason) => reasons.includes(reason)), detail: reasons },
    { name: 'no-page-errors', ok: errors.pageErrors.length === 0, detail: errors.pageErrors },
    { name: 'no-background-errors', ok: errors.backgroundErrors.length === 0, detail: errors.backgroundErrors },
    { name: 'no-request-failures', ok: errors.requestFailures.length === 0, detail: errors.requestFailures },
  ];

  return {
    ok: checks.every((check) => check.ok),
    browser: session.browserName,
    panelUrl: `${session.extensionOrigin}/sidepanel.html`,
    testTabId: tabId,
    checks,
  };
}

function printBanner({ browserName, panelUrl, targetUrl, installed, dormantId }) {
  const names = installed.map((entry) => (entry.id === dormantId ? `${entry.name} (disabled)` : entry.name));
  const label = browserName === 'chrome' ? 'Chrome' : 'Firefox';
  const surface =
    browserName === 'chrome'
      ? "Chrome's toolbar icon to use the real side panel"
      : "Firefox's sidebar menu (View -> Sidebar) to use the real sidebar";

  console.log(`Manual session - ${label} (test-mode build)`);
  console.log(`  panel     ${panelUrl}`);
  console.log(`  test page ${targetUrl}   (bound as the test tab)`);
  console.log(`  fixtures  ${names.length === 0 ? 'none' : names.join(', ')}`);
  console.log('');
  console.log('Close the browser window to end the session.');
  console.log('The panel above is opened as a tab because an extension page always loads that way; it is');
  console.log(`the same document as the native surface. Open it from ${surface}.`);
  console.log('Do not press "Bind the current tab" there: this session is already bound and the button');
  console.log('would bind the panel tab itself.');
}

async function waitForClose(session) {
  let removeSignalListeners = () => {};
  const interrupted = new Promise((resolve) => {
    const onSignal = () => resolve();
    process.once('SIGINT', onSignal);
    process.once('SIGTERM', onSignal);
    removeSignalListeners = () => {
      process.off('SIGINT', onSignal);
      process.off('SIGTERM', onSignal);
    };
  });
  const closed = new Promise((resolve) => session.browser.once('disconnected', resolve));

  try {
    await Promise.race([closed, interrupted]);
  } finally {
    removeSignalListeners();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
    return 0;
  }

  const headless = options.smoke && !options.headed;
  const fixtures = fixtureSetFor(options.browser, options.fixtures);
  if (options.userDataDir !== null) fs.mkdirSync(options.userDataDir, { recursive: true });
  const fixture = await startFixtureServer();
  let session = null;

  try {
    session = await launchTestBrowser({
      browserName: options.browser,
      headless,
      userDataDir: options.userDataDir ?? undefined,
    });

    const installed = await session.installFixtures(fixtures);
    const targetUrl = resolveTargetUrl(fixture.url, options.url);
    const testPage = await session.newPage(targetUrl);
    const panel = await session.openSurface();

    const dormant = installed.find((entry) => entry.dir === FIXTURES.dormant.dir);
    if (dormant !== undefined) {
      await setExtensionEnabled(panel, dormant.id, false);
    }

    const tabId = await focusTestTab(panel, testPage);
    if (tabId === null) {
      throw new Error('The panel never reported another active tab, so no test tab could be bound.');
    }

    await prebindTestTab(panel, { tabId, url: null });
    await reloadExtensionPage(panel);
    await panel.bringToFront();

    if (headless) {
      const verdict = await runSmoke({
        session,
        panel,
        tabId,
        includeFixtures: options.fixtures,
        browserName: options.browser,
      });
      console.log(JSON.stringify(verdict, null, 2));
      return verdict.ok ? 0 : 1;
    }

    printBanner({
      browserName: options.browser,
      panelUrl: `${session.extensionOrigin}/sidepanel.html`,
      targetUrl,
      installed,
      dormantId: dormant?.id ?? null,
    });
    await waitForClose(session);
    return 0;
  } finally {
    if (session !== null) await session.close().catch(() => undefined);
    await fixture.close().catch(() => undefined);
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
