import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { startFixtureServer } from './fixture-server.mjs';
import { ELIGIBLE_FIXTURES, FIXTURES, fixturesFor } from './fixtures/fixtures.mjs';
import {
  BACKGROUND_READY_LOG,
  collectErrors,
  disableExtensionThroughSurface,
  launchTestBrowser,
  readCandidateState,
  reloadExtensionPage,
  SIDEPANEL_ROOT_SELECTOR,
  waitForLog,
} from './harness.mjs';

const ARTIFACTS_DIR = path.resolve('.agent-artifacts');
const SEARCH_SELECTOR = '[data-testid="candidate-search"]';

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

async function waitForCandidateState(surface, predicate, timeout = 20000) {
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    last = await readCandidateState(surface).catch(() => null);
    if (last !== null && predicate(last)) return last;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for the candidate list (last: ${JSON.stringify(last)})`);
}

async function setSearch(surface, value) {
  await surface.$eval(
    SEARCH_SELECTOR,
    (node, next) => {
      node.value = next;
      node.dispatchEvent(new Event('input', { bubbles: true }));
    },
    value,
  );
  await sleep(150);
}

async function runScenario({ surface, session, installed }) {
  const steps = [];
  const record = (name, ok, details = {}) => {
    steps.push({ name, ok, ...details });
    if (!ok) throw new Error(`Step failed: ${name} ${JSON.stringify(details)}`);
  };

  const expectedEligible = ELIGIBLE_FIXTURES.map((fixture) => fixture.name);
  const expectedBrowser = session.browserName;

  const initial = await waitForCandidateState(surface, (state) => state.state === 'ready');

  record('sidepanel-loads-directly', initial.state === 'ready', { state: initial.state });

  record('capability-report-renders', initial.browser === expectedBrowser, {
    browser: initial.browser,
    toggleMode: initial.toggleMode,
  });

  record('capability-toggle-mode-uses-a-known-mode', /Automatic|Assisted/.test(initial.toggleMode ?? ''), {
    toggleMode: initial.toggleMode,
  });

  record(
    'candidate-list-matches-fixtures',
    JSON.stringify(initial.eligible.map((row) => row.name)) === JSON.stringify(expectedEligible),
    { expected: expectedEligible, actual: initial.eligible.map((row) => row.name) },
  );

  record(
    'candidate-ids-match-installed-fixtures',
    initial.eligible.every((row, index) => row.id === installed[index]?.id),
    { ids: initial.eligible.map((row) => row.id), installed: installed.map((entry) => entry.id) },
  );

  record(
    'candidate-rows-start-selected',
    initial.eligible.every((row) => row.selected === 'true'),
    {
      selected: initial.eligible.map((row) => row.selected),
    },
  );

  record(
    'self-listed-as-ineligible',
    initial.ineligible.some((row) => row.reason === 'This add-on'),
    {
      ineligible: initial.ineligible,
    },
  );

  record(
    'theme-listed-as-ineligible',
    initial.ineligible.some((row) => row.reason === 'Theme or app'),
    {
      ineligible: initial.ineligible,
    },
  );

  const dormantExpected = session.browserName === 'chrome';
  record(
    'disabled-fixture-reported-disabled-at-start',
    initial.ineligible.some((row) => row.reason === 'Disabled at start') === dormantExpected,
    { expected: dormantExpected, ineligible: initial.ineligible },
  );

  await setSearch(surface, 'bravo');
  const filtered = await readCandidateState(surface);
  record(
    'search-filters-by-display-name',
    JSON.stringify(filtered.eligible.map((row) => row.name)) === JSON.stringify([FIXTURES.bravo.name]),
    { actual: filtered.eligible.map((row) => row.name) },
  );
  record('search-updates-live-announcement', /1 of 2 candidates/.test(filtered.live ?? ''), { live: filtered.live });

  await setSearch(surface, 'zzz');
  const noMatch = await readCandidateState(surface);
  record('search-reports-no-match', noMatch.searchEmpty !== null && noMatch.eligible.length === 0, {
    searchEmpty: noMatch.searchEmpty,
  });

  await setSearch(surface, '');
  const restored = await waitForCandidateState(surface, (state) => state.eligible.length === 2);
  record('search-clears-back-to-full-list', restored.eligible.length === 2, { count: restored.eligible.length });

  await surface.$eval('[data-testid="candidate-row"] [data-testid="candidate-checkbox"]', (node) => node.click());
  const excluded = await waitForCandidateState(surface, (state) =>
    state.eligible.some((row) => row.selected === 'false'),
  );
  record(
    'exclusion-persists-through-messaging',
    excluded.eligible.some((row) => row.selected === 'false'),
    {
      selected: excluded.eligible.map((row) => row.selected),
    },
  );
  record(
    'excluded-row-shows-a-reason',
    excluded.eligible.filter((row) => row.selected === 'false').every((row) => row.reason === 'Excluded by you'),
    { eligible: excluded.eligible },
  );

  await reloadExtensionPage(surface, { selector: SIDEPANEL_ROOT_SELECTOR });
  const afterReload = await waitForCandidateState(surface, (state) => state.state === 'ready');
  record(
    'exclusion-survives-panel-reload',
    afterReload.eligible.some((row) => row.selected === 'false'),
    { eligible: afterReload.eligible },
  );

  const errors = collectErrors(session.recorder);
  record('no-background-runtime-errors', errors.backgroundErrors.length === 0, { errors: errors.backgroundErrors });
  record('no-page-errors', errors.pageErrors.length === 0, { errors: errors.pageErrors });
  record('no-console-errors', errors.consoleErrors.length === 0, { errors: errors.consoleErrors });
  record('no-request-failures', errors.requestFailures.length === 0, { errors: errors.requestFailures });

  return { steps };
}

async function captureFailure(surface, page, browserName, scenario) {
  const file = path.join(ARTIFACTS_DIR, `failure-${browserName}-${scenario}.png`);
  for (const target of [surface, page]) {
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
    return await page.evaluate(() => ({
      title: document.title,
      nodes: Array.from(document.querySelectorAll('[data-testid]')).map((element) => {
        const testId = element.getAttribute('data-testid');
        return `${element.tagName.toLowerCase()}[data-testid="${testId}"]="${(element.textContent ?? '').trim().slice(0, 60)}"`;
      }),
    }));
  } catch {
    return null;
  }
}

async function runBrowser(browserName, options) {
  const fixtureServer = await startFixtureServer();
  const result = {
    browser: browserName,
    ok: false,
    scenario: options.scenario ?? 'candidate-picker',
    firefoxPath: browserName === 'firefox' ? null : undefined,
    steps: [],
    errors: null,
  };

  let session = null;
  let surface = null;
  let page = null;

  try {
    session = await launchTestBrowser({ browserName, headless: !options.headed });

    if (browserName === 'chrome') {
      const ready = await waitForLog(session.recorder, (entry) => entry.text.includes(BACKGROUND_READY_LOG), 15000);
      if (!ready) throw new Error('Background service worker never reported readiness');
    }

    const installed = await session.installFixtures(fixturesFor(browserName));
    const eligibleInstalled = installed.filter((entry) =>
      ELIGIBLE_FIXTURES.some((fixture) => fixture.dir === entry.dir),
    );
    const dormantInstalled = installed.find((entry) => entry.dir === FIXTURES.dormant.dir) ?? null;

    surface = await session.openSurface();

    if (browserName === 'chrome') {
      if (dormantInstalled === null) throw new Error('The dormant fixture was not installed');
      const disabled = await disableExtensionThroughSurface(surface, dormantInstalled.id);
      if (!disabled.ok || disabled.enabled !== false) {
        throw new Error(`Chrome could not disable the dormant fixture: ${JSON.stringify(disabled)}`);
      }
      await reloadExtensionPage(surface, { selector: SIDEPANEL_ROOT_SELECTOR });
    }

    result.firefoxPath = browserName === 'firefox' ? 'management.getAll (temporary add-ons; no toggling)' : undefined;

    page = await session.newPage();
    await page.goto(`${fixtureServer.url}/`, { waitUntil: 'domcontentloaded' }).catch(() => undefined);

    const { steps } = await runScenario({ surface, session, installed: eligibleInstalled });
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
      screenshot: await captureFailure(surface, page, browserName, options.scenario ?? 'candidate-picker'),
      dom: surface === null ? null : await summarizeDom(surface),
      ...errors,
    };
  } finally {
    if (session !== null) await session.close().catch(() => undefined);
    await fixtureServer.close().catch(() => undefined);
  }

  return result;
}

function printHuman(results) {
  for (const result of results) {
    console.log(`[${result.ok ? 'PASS' : 'FAIL'}] ${result.browser} (${result.scenario})`);
    if (result.firefoxPath) console.log(`  firefoxPath: ${result.firefoxPath}`);
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
