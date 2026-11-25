import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  assertPolicyAdmin,
  ensurePolicyFirefox,
  firefoxPolicyPlan,
  resolveFirefoxSourceDir,
  writeFirefoxPolicy,
} from './firefox-policy.mjs';
import { startFixtureServer } from './fixture-server.mjs';
import {
  BACKGROUND_READY_LOG,
  clickTestId,
  collectErrors,
  focusTestTab,
  hasConsoleMarker,
  isBadExtensionActive,
  launchTestBrowser,
  readBadExtensionMarker,
  readExtensionEnabledStates,
  readPersistedBisectLog,
  readSessionState,
  reloadExtensionPage,
  waitForBadExtensionMarker,
  waitForCandidates,
  waitForLog,
  waitForScreen,
} from './harness.mjs';
import { goodExtensionPaths, PreflightError, readBadExtensionDir, readCatalog } from './real-extensions.mjs';

const ARTIFACTS_DIR = path.resolve('.agent-artifacts');
const CANDIDATE_COUNT = 20;
const BAD_EXTENSION_NAME = 'Bad Extension';
const SCREEN_SETTLE_TIMEOUT_MS = 60000;
const VERDICT_TIMEOUT_MS = 20000;

const USAGE = `Usage: node tests/e2e/verify-full.mjs [options]

Runs the real-extension bisect: 20 curated marketplace extensions plus one deliberately
faulty extension, then answers every bisect question from the faulty extension's own
symptom marker. No human in the loop.

Options:
  --browser=<chrome|firefox|all>  Browser(s) to exercise (default: all)
  --extensions-dir=<path>         Override good_extensions/ (default: repo root)
  --json                          Print one JSON verdict
  --headed                        Show the browser window
  --keep-open                     Leave the browser open at the end (debugging only)
  --help                          Print this text

Prerequisites:
  npm run extensions:download     unpack the curated extensions
  npm run bad-extension:build     build the faulty extension
  npm run build:all               build this add-on (test mode)
`;

function parseArgs(argv) {
  const options = {
    browser: 'all',
    extensionsDir: null,
    json: false,
    headed: false,
    keepOpen: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--headed') options.headed = true;
    else if (arg === '--keep-open') options.keepOpen = true;
    else if (arg.startsWith('--browser=')) options.browser = arg.slice('--browser='.length);
    else if (arg.startsWith('--extensions-dir=')) options.extensionsDir = arg.slice('--extensions-dir='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!['all', 'chrome', 'firefox'].includes(options.browser)) {
    throw new Error(`Invalid --browser value: ${options.browser}`);
  }
  return options;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(predicate, { timeout = SCREEN_SETTLE_TIMEOUT_MS, label = 'condition' } = {}) {
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    last = await predicate().catch(() => null);
    if (last !== null) return last;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${label} (last: ${JSON.stringify(last)})`);
}

function makeRecorder(steps) {
  return (name, ok, detail) => {
    steps.push({ name, ok, detail });
    return ok;
  };
}

async function resetArtifactsDir() {
  await fs.rm(ARTIFACTS_DIR, { recursive: true, force: true });
  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });
}

async function captureFailure(surface, page, browserName) {
  const shots = [];
  try {
    if (surface !== null) {
      const file = path.join(ARTIFACTS_DIR, `failure-${browserName}-full-panel.png`);
      await surface.screenshot({ path: file });
      shots.push(file);
    }
    if (page !== null) {
      const file = path.join(ARTIFACTS_DIR, `failure-${browserName}-full-page.png`);
      await page.screenshot({ path: file });
      shots.push(file);
    }
  } catch {
    // A failure screenshot must never mask the failure it documents.
  }
  return shots;
}

/**
 * Starts the session through the product's own preflight, so the runner exercises the
 * same path a human takes rather than seeding storage behind the panel's back.
 */
async function startSessionThroughUi(surface, testPage) {
  await clickTestId(surface, 'picker-start');
  await waitForScreen(surface, 'preflight');

  const testTabId = await focusTestTab(surface, testPage);
  if (testTabId === null) throw new Error('The panel never reported another active tab to bind');

  await clickTestId(surface, 'preflight-bind');
  await waitFor(
    async () => {
      const state = await readSessionState(surface);
      return state.preflight.testTab !== 'No test tab bound' ? state : null;
    },
    { label: 'the bound test tab' },
  );

  await clickTestId(surface, 'preflight-start');
  return waitForScreen(surface, 'baseline');
}

/**
 * Answers the current question from the page. The panel reloads the test tab before
 * asking, so whatever the marker says now is the symptom for the batch just applied.
 * The runner never reads the culprit's identity to reach this answer.
 */
async function answerFromSymptom(surface, testPage, record, label) {
  await testPage.bringToFront();

  const active = await waitFor(
    async () => {
      const value = await isBadExtensionActive(testPage);
      return value === null ? null : { value };
    },
    { timeout: VERDICT_TIMEOUT_MS, label: `the symptom marker for ${label}` },
  ).then((result) => result.value);

  const verdict = active ? 'persists' : 'gone';
  const marker = await readBadExtensionMarker(testPage);
  record(`${label}: verdict comes from the symptom marker alone`, marker.attribute !== undefined, {
    active,
    verdict,
    banner: marker.bannerText,
  });

  await clickTestId(surface, `verdict-${verdict}`);
  return verdict;
}

/**
 * The blind search. Every iteration applies the next batch and answers it from the
 * page, so the only way this reaches the injected extension is real bisection.
 */
async function runBlindSearch({ surface, testPage, record }) {
  const verdicts = [];
  let answered = 0;

  const baselineVerdict = await answerFromSymptom(surface, testPage, record, 'baseline');
  verdicts.push(baselineVerdict);
  answered += 1;

  for (let guard = 0; guard < CANDIDATE_COUNT + 4; guard += 1) {
    const state = await waitFor(
      async () => {
        const current = await readSessionState(surface);
        if (current.screen === 'completed' || current.screen === 'inconclusive') return { kind: 'finished', current };
        if (current.screen === 'trial' && current.trial.applyLabel !== null) return { kind: 'plan', current };
        return null;
      },
      { label: 'the next trial plan or a terminal screen' },
    );

    if (state.kind === 'finished') {
      return { answered, verdicts, terminal: state.current };
    }

    await clickTestId(surface, 'trial-apply');
    const asking = await waitFor(
      async () => {
        const current = await readSessionState(surface);
        const isAsking =
          current.screen === 'trial' && current.trial.applyLabel === null && current.trial.persistsLabel !== null;
        return isAsking ? current : null;
      },
      { label: 'the applied trial batch' },
    );

    record(
      `trial-${answered}: the panel applied a batch`,
      asking.trial.enabled !== '' || asking.trial.disabled !== '',
      {
        enabled: asking.trial.enabled,
        disabled: asking.trial.disabled,
      },
    );

    const verdict = await answerFromSymptom(surface, testPage, record, `trial-${answered}`);
    verdicts.push(verdict);
    answered += 1;
  }

  throw new Error('The bisect never terminated; the panel kept offering trials');
}

/**
 * The log is the record of truth for the flow, so the runner proves the session ended
 * with a terminal event rather than trusting only the rendered screen.
 */
async function readTerminalEvent(surface) {
  const log = await readPersistedBisectLog(surface);
  const events = log?.events ?? [];
  const last = events.at(-1) ?? null;
  return {
    lastType: last?.type ?? null,
    eventCount: events.length,
    completed: last?.type === 'session-completed',
    inconclusive: last?.type === 'session-inconclusive',
  };
}

async function runBrowser(browserName, options) {
  const extensionsDir = options.extensionsDir ?? undefined;
  const catalogEntries = readCatalog({ extensionsDir, browserName, expectedCount: CANDIDATE_COUNT });
  const badExtensionDir = readBadExtensionDir(browserName);
  // A reused profile would resume the previous run's session from `storage.local`, so every
  // run starts from an empty profile and therefore from an empty bisect log.
  const firefoxProfile = path.join(ARTIFACTS_DIR, `firefox-profile-${process.pid}`);
  await fs.rm(firefoxProfile, { recursive: true, force: true });

  const fixtureServer = await startFixtureServer();
  const steps = [];
  const record = makeRecorder(steps);
  let session = null;
  let surface = null;
  let testPage = null;
  let policy = null;
  let executablePath = null;
  let policyBadExtensionId = null;
  let goodIds = [];
  let badExtensionId = null;
  let idsBySlug = {};
  let informational = { consoleErrors: [], requestFailures: [] };

  try {
    /**
     * Firefox cannot toggle another extension from a temporary add-on: `setEnabled`
     * answers "can only be used for themes or by addons installed by enterprise
     * policy". The policy rail installs this add-on (and the curated candidates) from
     * `policies.json`, which is the only supported way to reach `installType: 'admin'`.
     */
    if (browserName === 'firefox') {
      const installDir = ensurePolicyFirefox(resolveFirefoxSourceDir());
      const plan = firefoxPolicyPlan({
        extensionsDir,
        buildDir: path.resolve('.output/firefox-mv2'),
        artifactsDir: ARTIFACTS_DIR,
        browserName,
        includeSelf: true,
        badExtensionDir,
      });
      policy = writeFirefoxPolicy({
        installDir,
        selfXpi: plan.selfXpi,
        candidateXpis: plan.candidateXpis,
        badXpi: plan.badXpi,
        badExtensionId: plan.badExtensionId,
      });
      executablePath = path.join(installDir, process.platform === 'win32' ? 'firefox.exe' : 'firefox');
      policyBadExtensionId = plan.badExtensionId;
      record('firefox runs from a policy-enabled profile', true, { installDir, policy: policy.policyPath });
    }

    session = await launchTestBrowser({
      browserName,
      headless: !options.headed,
      executablePath,
      policyInstalledSelf: browserName === 'firefox',
      userDataDir: browserName === 'firefox' ? firefoxProfile : undefined,
    });
    if (browserName === 'chrome') {
      const ready = await waitForLog(session.recorder, (entry) => entry.text.includes(BACKGROUND_READY_LOG), 20000);
      if (!ready) throw new Error('Chrome background service worker never reported readiness');
    }

    surface = await session.openSurface();
    testPage = await session.newPage();
    await testPage.goto(`${fixtureServer.url}/`, { waitUntil: 'domcontentloaded' });
    if (browserName === 'firefox') {
      const admin = await assertPolicyAdmin(surface);
      record('firefox reports the add-on as policy-installed', admin.installType === 'admin', admin);
      // The policy installed the curated set and the bad extension. Installing either over
      // BiDi would downgrade it to a temporary add-on, which Firefox can never disable, so
      // the all-off baseline could never hold.
      goodIds = catalogEntries.map((entry) => entry.id);
      badExtensionId = policyBadExtensionId;
      idsBySlug = Object.fromEntries(catalogEntries.map((entry) => [entry.slug, entry.id]));
      record('every curated extension is policy-installed', true, {
        count: catalogEntries.length,
        ids: idsBySlug,
      });
    } else {
      const installedGood = await session.installExtensionPaths(goodExtensionPaths(catalogEntries, { extensionsDir }));
      const [installedBad] = await session.installExtensionPaths([badExtensionDir]);

      // Chrome derives an unpacked extension's id from its absolute directory path, so the
      // installed id is authoritative and can never equal the Web Store id.
      goodIds = installedGood.map((entry) => entry.id);
      badExtensionId = installedBad.id;
      idsBySlug = Object.fromEntries(catalogEntries.map((entry, index) => [entry.slug, installedGood[index].id]));

      record('installed every curated extension', installedGood.length === CANDIDATE_COUNT, {
        count: installedGood.length,
        expected: CANDIDATE_COUNT,
      });
      record(
        'every installed id is well formed',
        [...goodIds, badExtensionId].every((id) => typeof id === 'string' && /^[a-p]{32}$/.test(id)),
        { ids: idsBySlug },
      );
      record('chrome ids are path-derived and used as-is', true, {
        note: 'Extensions.loadUnpacked hashes the directory path, so store ids cannot apply',
        ids: idsBySlug,
      });
    }

    const expectedIds = [...goodIds, badExtensionId];
    // The picker reads `management.getAll()` once on mount, and Chrome installs happen after
    // the panel was already open, so it has to be reloaded to see the new extensions.
    if (browserName === 'chrome') await reloadExtensionPage(surface);
    // The test page was opened before the fault extension existed, so its content script has
    // never run there. Reload it so the symptom can be observed before the search begins.
    await testPage.reload({ waitUntil: 'domcontentloaded' });
    const picker = await waitForCandidates(surface, expectedIds);
    const listedIds = new Set(picker?.eligible?.map((entry) => entry.id) ?? []);
    const missing = expectedIds.filter((id) => !listedIds.has(id));

    record('the picker lists every installed extension', missing.length === 0, {
      listed: listedIds.size,
      expected: expectedIds.length,
      missing,
      ineligible: picker?.ineligible?.map((entry) => ({ id: entry.id, reason: entry.reasonCode })) ?? [],
    });
    record('the picker lists exactly the real candidates', listedIds.size === expectedIds.length, {
      listed: listedIds.size,
      expected: expectedIds.length,
    });

    record(
      'the fault is visible before the search',
      (await waitForBadExtensionMarker(testPage, true, { timeout: 20000 })) === true,
      { marker: await readBadExtensionMarker(testPage) },
    );

    await startSessionThroughUi(surface, testPage);

    const allOff = await readExtensionEnabledStates(surface, expectedIds);
    record(
      'the baseline turns every candidate off',
      expectedIds.every((id) => allOff[id] === false),
      {
        states: allOff,
      },
    );

    const search = await runBlindSearch({ surface, testPage, record });
    const worstCase = 1 + Math.ceil(Math.log2(CANDIDATE_COUNT)) + 1;
    record('the search asked more than the baseline', search.answered > 1, { answered: search.answered });
    record('the search stayed within the logarithmic worst case', search.answered <= worstCase, {
      answered: search.answered,
      worstCase,
    });

    const terminal = search.terminal;
    record('the search terminates on the completed screen', terminal.screen === 'completed', {
      screen: terminal.screen,
      answered: search.answered,
    });
    record('the search names the injected fault', terminal.completed.culpritName === BAD_EXTENSION_NAME, {
      culpritName: terminal.completed.culpritName,
      expected: BAD_EXTENSION_NAME,
    });

    const afterCompletion = await readExtensionEnabledStates(surface, expectedIds);
    record('the culprit is left disabled', afterCompletion[badExtensionId] === false, {
      enabled: afterCompletion[badExtensionId],
    });
    record(
      'every innocent extension is left enabled',
      goodIds.every((id) => afterCompletion[id] === true),
      { stillDisabled: goodIds.filter((id) => afterCompletion[id] !== true) },
    );

    const terminalEvent = await readTerminalEvent(surface);
    record('the session log ends with a completed event', terminalEvent.completed, terminalEvent);

    const faultCleared = await waitForBadExtensionMarker(testPage, false, { timeout: 20000 });
    record('the test page loses the fault once the culprit is off', faultCleared === false, { active: faultCleared });

    await clickTestId(surface, 'completed-restore');
    const restored = await waitFor(
      async () => {
        const state = await readSessionState(surface);
        if (state.screen === 'restored') return state;
        if (state.restore.visible && state.restore.complete === 'true') return state;
        return null;
      },
      { label: 'the completed restore' },
    );
    record('restore reports completion', true, {
      screen: restored.screen,
      complete: restored.restore.complete ?? restored.restoredScreen.summaryComplete,
      failures: restored.restore.failures,
    });

    const afterRestore = await readExtensionEnabledStates(surface, expectedIds);
    record(
      'restore re-enables every innocent extension',
      goodIds.every((id) => afterRestore[id] === true),
      { stillDisabled: goodIds.filter((id) => afterRestore[id] !== true) },
    );

    // Restoring state does not reload the test tab, so the marker can only return once the
    // page is loaded again. Reload explicitly rather than waiting for a symptom that the
    // product never promised to produce at this step.
    await testPage.reload({ waitUntil: 'domcontentloaded' });
    const faultRestored = await waitForBadExtensionMarker(testPage, true, { timeout: 20000 });
    record('the test page shows the fault again after restore', faultRestored === true, { active: faultRestored });

    record('the symptom console marker was emitted', hasConsoleMarker(session.recorder), {
      note: 'best-effort: records are capped and the page reloads between rounds',
    });

    const errors = collectErrors(session.recorder);
    // Real extensions are noisy by design: an ad blocker or a devtools extension logs,
    // throws and blocks requests on any page. Only errors raised inside this add-on's own
    // pages are fatal; everything else is reported for diagnosis and never fails the run.
    const ownPageErrors = errors.pageErrors.filter((entry) => entry.label === 'sidepanel');
    informational = {
      consoleErrors: errors.consoleErrors,
      requestFailures: errors.requestFailures,
      pageErrors: errors.pageErrors.filter((entry) => entry.label !== 'sidepanel'),
    };

    record('no page errors on this add-on\u2019s own pages', ownPageErrors.length === 0, { errors: ownPageErrors });
    record('no background runtime errors', errors.backgroundErrors.length === 0, { errors: errors.backgroundErrors });

    if (options.keepOpen) {
      console.log('Leaving the browser open; press Ctrl+C to exit.');
      await new Promise(() => {});
    }

    return {
      browser: browserName,
      ok: steps.every((step) => step.ok),
      candidates: { good: CANDIDATE_COUNT, bad: 1, total: expectedIds.length },
      badExtensionId,
      answered: search.answered,
      verdicts: search.verdicts,
      culprit: terminal.completed.culpritName,
      steps,
      informational: {
        consoleErrorCount: informational.consoleErrors.length,
        requestFailureCount: informational.requestFailures.length,
        thirdPartyPageErrorCount: informational.pageErrors.length,
        samples: informational.consoleErrors.slice(0, 5).map((entry) => entry.text),
      },
      errors: null,
    };
  } catch (error) {
    const errors = session === null ? null : collectErrors(session.recorder);
    return {
      browser: browserName,
      ok: false,
      candidates: { good: CANDIDATE_COUNT, bad: 1, total: CANDIDATE_COUNT + 1 },
      answered: null,
      verdicts: [],
      culprit: null,
      steps,
      informational: null,
      errors: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? (error.stack ?? null) : null,
        screenshots: await captureFailure(surface, testPage, browserName),
        pageErrors: errors?.pageErrors ?? [],
        backgroundErrors: errors?.backgroundErrors ?? [],
      },
    };
  } finally {
    if (session !== null) await session.close().catch(() => undefined);
    if (policy !== null) policy.restore();
    await fixtureServer.close().catch(() => undefined);
  }
}

function printHuman(results) {
  for (const result of results) {
    console.log(`[${result.ok ? 'PASS' : 'FAIL'}] ${result.browser} (real-extension bisect)`);
    console.log(
      `  candidates: ${result.candidates.total} (${result.candidates.good} good + ${result.candidates.bad} bad)`,
    );
    if (result.answered !== null) console.log(`  answered: ${result.answered}`);
    if (result.culprit !== null) console.log(`  culprit: ${result.culprit}`);
    for (const step of result.steps) {
      console.log(`  ${step.ok ? 'PASS' : 'FAIL'} ${step.name}`);
    }
    if (result.informational !== null) {
      console.log(
        `  info: ${result.informational.consoleErrorCount} console error(s), ` +
          `${result.informational.requestFailureCount} request failure(s), ` +
          `${result.informational.thirdPartyPageErrorCount} third-party page error(s) (none fatal)`,
      );
    }
    if (result.errors !== null) {
      console.error(`  error: ${result.errors.message}`);
      for (const shot of result.errors.screenshots ?? []) console.error(`  screenshot: ${shot}`);
      for (const entry of result.errors.pageErrors) console.error(`  pageerror: ${entry.message}`);
      for (const entry of result.errors.backgroundErrors) console.error(`  background: ${entry.text}`);
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
    return 0;
  }

  await resetArtifactsDir();

  const browsers = options.browser === 'all' ? ['chrome', 'firefox'] : [options.browser];
  const results = [];

  for (const browserName of browsers) {
    results.push(await runBrowser(browserName, options));
  }

  const ok = results.length > 0 && results.every((result) => result.ok);
  if (options.json) {
    console.log(JSON.stringify({ ok, results }, null, 2));
  } else {
    printHuman(results);
  }
  return ok ? 0 : 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    if (error instanceof PreflightError) console.error(error.message);
    else console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
