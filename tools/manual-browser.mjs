import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  ensurePolicyFirefox,
  firefoxPolicyPlan,
  resolveFirefoxSourceDir,
  writeFirefoxPolicy,
} from '../tests/e2e/firefox-policy.mjs';
import { startFixtureServer } from '../tests/e2e/fixture-server.mjs';
import { FIXTURES } from '../tests/e2e/fixtures/fixtures.mjs';
import {
  BAD_EXTENSION_MARKER,
  clickTestId,
  collectErrors,
  focusTestTab,
  launchTestBrowser,
  readBoundTestTab,
  readCandidateState,
  reloadExtensionPage,
  setExtensionEnabled,
  waitForCandidates,
} from '../tests/e2e/harness.mjs';
import { goodExtensionPaths, readBadExtensionDir, readCatalog } from '../tests/e2e/real-extensions.mjs';

const BROWSERS = ['chrome', 'firefox'];
const EXTENSION_SETS = ['fixtures', 'real', 'none'];
const ELIGIBLE_FIXTURE_COUNT = 2;
const REAL_CANDIDATE_COUNT = 20;

const USAGE = `Usage: node tools/manual-browser.mjs [options]

Launches a visible browser with the built extension installed, binds a fixture page as
the test tab, and leaves the window open.

Options:
  --browser=<chrome|firefox>          Browser to launch (default: chrome)
  --extensions=<fixtures|real|none>   What else to install (default: fixtures)
                                        fixtures  this repo's four fixture extensions
                                        real      the 20 curated extensions AND the bad
                                                  extension, i.e. a genuinely broken browser
                                        none      nothing else
  --start                             Start the bisect and stop at the baseline question
  --url=<path|url>                    Test page: /, /form, /dynamic, or an absolute URL (default: /)
  --user-data-dir=<path>              Keep the browser profile between runs (default: ephemeral)
  --no-fixtures                       Deprecated alias for --extensions=none
  --smoke                             Run headless, assert the session came up, close, and exit
  --headed                            Force a visible window (overrides --smoke's headless)
  --help                              Print this text

--extensions=real requires:
  npm run extensions:download
  npm run bad-extension:build
`;

function parseArgs(argv) {
  const options = {
    browser: 'chrome',
    url: '/',
    userDataDir: null,
    extensions: 'fixtures',
    start: false,
    smoke: false,
    headed: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--smoke') options.smoke = true;
    else if (arg === '--headed') options.headed = true;
    else if (arg === '--start') options.start = true;
    else if (arg === '--no-fixtures') options.extensions = 'none';
    else if (arg.startsWith('--browser=')) options.browser = arg.slice('--browser='.length);
    else if (arg.startsWith('--url=')) options.url = arg.slice('--url='.length);
    else if (arg.startsWith('--extensions=')) options.extensions = arg.slice('--extensions='.length);
    else if (arg.startsWith('--user-data-dir='))
      options.userDataDir = path.resolve(arg.slice('--user-data-dir='.length));
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!BROWSERS.includes(options.browser)) throw new Error(`Invalid --browser value: ${options.browser}`);
  if (!EXTENSION_SETS.includes(options.extensions)) {
    throw new Error(`Invalid --extensions value: ${options.extensions} (expected ${EXTENSION_SETS.join(', ')})`);
  }
  if (options.url.length === 0) throw new Error('--url must not be empty');
  return options;
}

function fixtureSetFor(browserName) {
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

/**
 * Installs the real set and returns the ids the picker should list. The bad extension is
 * always part of `real`: a session without a fault would teach the operator nothing.
 *
 * Expected ids come from the install result, not the catalog: Chrome derives an unpacked
 * extension's id from its directory path, so the store id never applies there.
 */
async function installRealSet(session) {
  const entries = readCatalog({ browserName: session.browserName, expectedCount: REAL_CANDIDATE_COUNT });
  const badDir = readBadExtensionDir(session.browserName);

  const installedGood = await session.installExtensionPaths(goodExtensionPaths(entries));
  const [installedBad] = await session.installExtensionPaths([badDir]);

  return {
    installed: [
      ...installedGood.map((entry, index) => ({ ...entry, name: entries[index].name })),
      { ...installedBad, name: 'Bad Extension' },
    ],
    expectedIds: [...installedGood.map((entry) => entry.id), installedBad.id],
  };
}

/**
 * Starts the session through the panel's own preflight, then stops. The operator picks up
 * at the baseline question, which is exactly where a real investigation begins.
 *
 * `preflight-bind` is deliberately not clicked: this tool pre-binds the fixture page, and
 * the button would rebind the active tab, which is the panel itself.
 */
async function startBisect(surface) {
  await clickTestId(surface, 'picker-start');
  await clickTestId(surface, 'preflight-start');
}

async function runSmoke({ session, panel, tabId, options }) {
  const bound = await readBoundTestTab(panel);
  const state = await readCandidateState(panel);
  const errors = collectErrors(session.recorder);
  const reasons = state.ineligible.map((entry) => entry.reasonCode);

  const expectedEligible =
    options.extensions === 'real'
      ? REAL_CANDIDATE_COUNT + 1
      : options.extensions === 'fixtures'
        ? ELIGIBLE_FIXTURE_COUNT
        : 0;
  const expectedReasons =
    options.extensions === 'fixtures'
      ? options.browser === 'chrome'
        ? ['theme-or-app', 'disabled-at-start']
        : ['theme-or-app']
      : [];

  const checks = [
    {
      name: 'panel-rendered',
      ok:
        state.state !== 'missing' &&
        (state.screen === 'picker' || state.screen === 'baseline' || state.screen === 'preflight'),
      detail: { state: state.state, screen: state.screen },
    },
    { name: 'test-tab-bound', ok: bound !== null && bound.tabId === tabId, detail: bound },
    // `--start` has already left the picker, where the candidate rows live, so the eligible
    // set is only assertable before the session begins.
    options.start
      ? { name: 'candidates-checked-before-start', ok: true, detail: { note: 'picker already left' } }
      : {
          name: 'eligible-candidates',
          ok:
            options.extensions === 'real'
              ? state.eligible.length >= expectedEligible
              : state.eligible.length === expectedEligible,
          detail: { count: state.eligible.length, expected: expectedEligible },
        },
    { name: 'ineligible-reasons', ok: expectedReasons.every((reason) => reasons.includes(reason)), detail: reasons },
    // Marketplace extensions legitimately throw from their own content scripts, so page
    // errors are only asserted for the fixture and empty sets, where this repo owns every
    // byte that runs. `real` reports them in `detail` without failing the smoke run.
    {
      name: 'no-page-errors',
      ok: options.extensions !== 'real' ? errors.pageErrors.length === 0 : true,
      detail: errors.pageErrors,
    },
    { name: 'no-background-errors', ok: errors.backgroundErrors.length === 0, detail: errors.backgroundErrors },
    // Real marketplace extensions block and fail requests by design, so this stays the
    // fixture/empty-set assertion; `real` reports them as informational only.
    {
      name: 'no-request-failures',
      ok: options.extensions !== 'real' ? errors.requestFailures.length === 0 : true,
      detail: errors.requestFailures,
    },
  ];

  return {
    ok: checks.every((check) => check.ok),
    browser: session.browserName,
    extensions: options.extensions,
    panelUrl: `${session.extensionOrigin}/sidepanel.html`,
    testTabId: tabId,
    checks,
  };
}

function printBanner({ browserName, panelUrl, targetUrl, installed, dormantId, options }) {
  const names = installed.map((entry) => (entry.id === dormantId ? `${entry.name} (disabled)` : entry.name));
  const label = browserName === 'chrome' ? 'Chrome' : 'Firefox';
  const surface =
    browserName === 'chrome'
      ? "Chrome's toolbar icon to use the real side panel"
      : "Firefox's sidebar menu (View -> Sidebar) to use the real sidebar";

  console.log(`Manual session - ${label} (test-mode build)`);
  console.log(`  panel     ${panelUrl}`);
  console.log(`  test page ${targetUrl}   (bound as the test tab)`);
  console.log(`  set       ${options.extensions}`);
  // `real` deliberately omits the names: one of them is the injected fault, and reading the
  // list would give away the answer the session exists to find.
  console.log(
    `  installed ${
      names.length === 0
        ? 'none'
        : options.extensions === 'real'
          ? `${names.length} extensions (names hidden on purpose)`
          : `${names.length}: ${names.join(', ')}`
    }`,
  );
  if (options.extensions === 'real') {
    console.log('');
    console.log('Expected symptom: a red "Bad extension enabled" bar plus a');
    console.log(`${BAD_EXTENSION_MARKER.consoleMarker} entry in the page console.`);
    console.log('One installed extension is faulty; finding out which one is the point of the session.');
  }
  if (options.start) {
    console.log('');
    console.log('The bisect is already started and waiting on the baseline question.');
  }
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
  if (options.userDataDir !== null) fs.mkdirSync(options.userDataDir, { recursive: true });
  const fixture = await startFixtureServer();
  let session = null;
  let policy = null;

  try {
    /**
     * A Firefox temporary add-on can never toggle another extension, so `real` on Firefox
     * needs the same policy rail the automated runner uses. The other sets keep the
     * temporary install, which is what the fixture scenarios depend on.
     */
    let executablePath = null;
    let policyInstalledSelf = false;

    if (options.browser === 'firefox' && options.extensions === 'real') {
      const installDir = ensurePolicyFirefox(resolveFirefoxSourceDir());
      const plan = firefoxPolicyPlan({
        buildDir: path.resolve('.output/firefox-mv2'),
        artifactsDir: path.resolve('.agent-artifacts'),
        includeSelf: true,
        badExtensionDir: readBadExtensionDir('firefox'),
      });
      policy = writeFirefoxPolicy({
        installDir,
        selfXpi: plan.selfXpi,
        candidateXpis: plan.candidateXpis,
        badXpi: plan.badXpi,
        badExtensionId: plan.badExtensionId,
      });
      executablePath = path.join(installDir, process.platform === 'win32' ? 'firefox.exe' : 'firefox');
      policyInstalledSelf = true;
    }

    session = await launchTestBrowser({
      browserName: options.browser,
      headless,
      userDataDir: options.userDataDir ?? undefined,
      executablePath,
      policyInstalledSelf,
    });

    let installed = [];
    let dormant = null;
    let expectedRealIds = [];

    if (options.extensions === 'fixtures') {
      installed = await session.installFixtures(fixtureSetFor(options.browser));
      dormant = installed.find((entry) => entry.dir === FIXTURES.dormant.dir) ?? null;
    } else if (options.extensions === 'real') {
      if (policyInstalledSelf) {
        // Firefox already installed the whole set from `policies.json`; installing again
        // over BiDi would replace each add-on with a temporary one it cannot toggle.
        const entries = readCatalog({ browserName: 'firefox', expectedCount: REAL_CANDIDATE_COUNT });
        expectedRealIds = [...entries.map((entry) => entry.id), policy.badExtensionId];
        installed = entries.map((entry) => ({ id: entry.id, name: entry.name }));
      } else {
        const real = await installRealSet(session);
        installed = real.installed;
        expectedRealIds = real.expectedIds;
      }
    }

    const targetUrl = resolveTargetUrl(fixture.url, options.url);
    const testPage = await session.newPage(targetUrl);
    const panel = await session.openSurface();

    if (dormant !== null) {
      await setExtensionEnabled(panel, dormant.id, false);
    }

    const tabId = await focusTestTab(panel, testPage);
    if (tabId === null) {
      throw new Error('The panel never reported another active tab, so no test tab could be bound.');
    }

    await prebindTestTab(panel, { tabId, url: null });
    await reloadExtensionPage(panel);

    if (options.extensions === 'real') {
      // The picker populates from `management.getAll()`, so a start click before the list
      // renders would race the extensions the operator paid to install.
      const state = await waitForCandidates(panel, expectedRealIds);
      const listed = new Set(state?.eligible?.map((entry) => entry.id) ?? []);
      const missing = expectedRealIds.filter((id) => !listed.has(id));
      if (missing.length > 0) {
        throw new Error(
          `The picker listed ${listed.size} candidate(s) but ${missing.length} were missing: ${missing.join(', ')}`,
        );
      }
    }

    if (options.start) {
      await startBisect(panel);
    }

    // Firefox refuses `browsingContext.activate` for privileged `moz-extension://` pages.
    // That is cosmetic here: the panel is already the tab the operator will look at.
    await panel.bringToFront().catch(() => undefined);

    if (headless) {
      const verdict = await runSmoke({ session, panel, tabId, options });
      console.log(JSON.stringify(verdict, null, 2));
      return verdict.ok ? 0 : 1;
    }

    printBanner({
      browserName: options.browser,
      panelUrl: `${session.extensionOrigin}/sidepanel.html`,
      targetUrl,
      installed,
      dormantId: dormant?.id ?? null,
      options,
    });
    await waitForClose(session);
    return 0;
  } finally {
    if (session !== null) await session.close().catch(() => undefined);
    if (policy !== null) policy.restore();
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
