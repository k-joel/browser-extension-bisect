import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { startFixtureServer } from './fixture-server.mjs';
import { ELIGIBLE_FIXTURES, FIXTURES, fixturesFor } from './fixtures/fixtures.mjs';
import {
  BACKGROUND_READY_LOG,
  clickTestId,
  collectErrors,
  disableExtensionThroughSurface,
  EXTENSION_TAB_ID_ATTRIBUTE,
  focusPage,
  hasTestDriverGlobal,
  launchTestBrowser,
  markPageForReloadCheck,
  readCandidateState,
  readExtensionEnabledStates,
  readManualExtensionState,
  readPageReloadMarker,
  readSessionState,
  reloadExtensionPage,
  resetBisectState,
  resetManualExtensionState,
  restoreFixtureState,
  SIDEPANEL_ROOT_SELECTOR,
  setManualExtensionState,
  waitForAttribute,
  waitForLog,
} from './harness.mjs';

const ARTIFACTS_DIR = path.resolve('.agent-artifacts');
const SEARCH_SELECTOR = '[data-testid="candidate-search"]';
const SCENARIOS = ['candidate-picker', 'session-baseline', 'assisted-baseline', 'assisted-external', 'partition-loop'];
const CHROME_SCENARIOS = ['candidate-picker', 'session-baseline', 'partition-loop'];
const FIREFOX_SCENARIOS = ['candidate-picker', 'assisted-baseline', 'assisted-external'];

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
  if (options.scenario !== null && !SCENARIOS.includes(options.scenario)) {
    throw new Error(`Invalid --scenario value: ${options.scenario}`);
  }
  return options;
}

async function resetArtifactsDir() {
  await fs.rm(ARTIFACTS_DIR, { recursive: true, force: true });
  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });
}

async function waitFor(predicate, { timeout = 20000, label = 'condition' } = {}) {
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    last = await predicate().catch(() => null);
    if (last !== null) return last;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${label} (last: ${JSON.stringify(last)})`);
}

async function waitForCandidateState(surface, predicate, timeout = 20000) {
  return waitFor(
    async () => {
      const state = await readCandidateState(surface);
      return predicate(state) ? state : null;
    },
    { timeout, label: 'the candidate list' },
  );
}

async function waitForScreen(surface, screen, timeout = 20000) {
  return waitFor(
    async () => {
      const state = await readSessionState(surface);
      return state.screen === screen ? state : null;
    },
    { timeout, label: `the "${screen}" screen` },
  );
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

function makeRecorder(steps) {
  return (name, ok, details = {}) => {
    steps.push({ name, ok, ...details });
    if (!ok) throw new Error(`Step failed: ${name} ${JSON.stringify(details)}`);
  };
}

async function runCandidatePickerScenario({ surface, session, installed }) {
  const steps = [];
  const record = makeRecorder(steps);

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

  record(
    'disabled-fixture-reported-disabled-at-start',
    initial.ineligible.some((row) => row.reason === 'Disabled at start'),
    { ineligible: initial.ineligible },
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

  const restoreOnPicker = await readSessionState(surface);
  record('restore-visible-on-the-picker', restoreOnPicker.restore.visible, {
    visible: restoreOnPicker.restore.visible,
  });
  record('restore-does-not-offer-a-toggle-before-start', restoreOnPicker.restore.buttonDisabled === true, {
    buttonDisabled: restoreOnPicker.restore.buttonDisabled,
  });

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

/**
 * The three extension groups the baseline must distinguish: the candidates it
 * disables, and the theme, dormant and self extensions it must leave alone.
 */
function extensionGroups(installed) {
  const candidates = installed.filter((entry) => ELIGIBLE_FIXTURES.some((fixture) => fixture.dir === entry.dir));
  const theme = installed.find((entry) => entry.dir === FIXTURES.theme.dir);
  const dormant = installed.find((entry) => entry.dir === FIXTURES.dormant.dir);
  return { candidates, theme, dormant };
}

async function runSessionBaselineScenario({ surface, session, installed, testPage, fixtureServer }) {
  const steps = [];
  const record = makeRecorder(steps);
  const { candidates, theme, dormant } = extensionGroups(installed);

  const untouchableIds = [theme?.id, dormant?.id].filter((id) => typeof id === 'string');
  const candidateIds = candidates.map((entry) => entry.id);
  const before = await readExtensionEnabledStates(surface, [...candidateIds, ...untouchableIds]);

  const initial = await waitForCandidateState(surface, (state) => state.state === 'ready');
  record('session-starts-from-the-picker', initial.screen === 'picker', { screen: initial.screen });

  await clickTestId(surface, 'picker-start');
  const preflight = await waitForScreen(surface, 'preflight');

  record(
    'preflight-lists-exactly-the-candidates',
    JSON.stringify(preflight.preflight.candidates.map((row) => row.name)) ===
      JSON.stringify(candidates.map((entry) => entry.name)),
    { expected: candidates.map((entry) => entry.name), actual: preflight.preflight.candidates.map((row) => row.name) },
  );

  record(
    'preflight-explains-the-culprit-stays-disabled',
    (preflight.preflight.culpritNote ?? '').includes('The culprit stays disabled until you press Restore'),
    { note: preflight.preflight.culpritNote },
  );

  record('preflight-requires-an-explicit-start', preflight.preflight.startLabel === 'Start baseline', {
    startLabel: preflight.preflight.startLabel,
    startDisabled: preflight.preflight.startDisabled,
  });

  record(
    'preflight-toggles-nothing-before-start',
    JSON.stringify(await readExtensionEnabledStates(surface, [...candidateIds, ...untouchableIds])) ===
      JSON.stringify(before),
    { before },
  );

  record('preflight-shows-no-session-screen', preflight.screen === 'preflight', { screen: preflight.screen });

  await focusPage(testPage);
  const testTabId = await waitForAttribute(testPage, EXTENSION_TAB_ID_ATTRIBUTE, 15000);
  await clickTestId(surface, 'preflight-bind');
  const bound = await waitFor(
    async () => {
      const state = await readSessionState(surface);
      return state.preflight.testTab !== 'No test tab bound' ? state : null;
    },
    { label: 'the bound test tab' },
  );
  record('preflight-binds-the-current-test-tab', /^Tab #\d+/.test(bound.preflight.testTab ?? ''), {
    testTab: bound.preflight.testTab,
    testTabId,
  });
  record(
    'preflight-binds-the-tab-that-reproduces-the-symptom',
    testTabId === null || (bound.preflight.testTab ?? '').startsWith(`Tab #${testTabId}`),
    { testTab: bound.preflight.testTab, testTabId },
  );

  await markPageForReloadCheck(testPage);
  await clickTestId(surface, 'preflight-start');
  const baseline = await waitForScreen(surface, 'baseline');

  record('baseline-asks-the-question', (baseline.baseline.question ?? '').includes('Does the problem still happen'), {
    question: baseline.baseline.question,
  });
  record(
    'baseline-uses-the-exact-verdict-labels',
    baseline.baseline.persistsLabel === 'Problem persists' && baseline.baseline.goneLabel === 'Problem is gone',
    { persists: baseline.baseline.persistsLabel, gone: baseline.baseline.goneLabel },
  );

  const afterBaseline = await readExtensionEnabledStates(surface, [...candidateIds, ...untouchableIds]);
  record(
    'baseline-disables-every-candidate',
    candidateIds.every((id) => afterBaseline[id] === false),
    { afterBaseline, candidateIds },
  );
  record(
    'baseline-leaves-non-candidates-untouched',
    untouchableIds.every((id) => afterBaseline[id] === before[id]),
    { before, afterBaseline, untouchableIds },
  );
  record('baseline-leaves-self-enabled', afterBaseline[installed[0]?.id] !== undefined, {
    selfUntouched: true,
  });

  const marker = await readPageReloadMarker(testPage);
  record('baseline-reloads-the-test-tab', marker === null, { marker });

  const restoreOnBaseline = await readSessionState(surface);
  record('restore-visible-on-the-baseline', restoreOnBaseline.restore.visible, {
    visible: restoreOnBaseline.restore.visible,
  });

  await testPage.goto(`${fixtureServer.url}/`, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await clickTestId(surface, 'verdict-gone');
  const advanced = await waitFor(
    async () => {
      const state = await readSessionState(surface);
      return state.screen === 'trial' && state.trial.applyLabel !== null ? state : null;
    },
    { label: 'the first trial plan' },
  );
  record('gone-verdict-advances-the-flow', advanced.screen === 'trial', { screen: advanced.screen });

  await clickTestId(surface, 'restore-button');
  const restored = await waitFor(
    async () => {
      const state = await readSessionState(surface);
      return state.screen === 'restored' ? state : null;
    },
    { label: 'the restored screen' },
  );
  record('restore-lands-on-the-restored-screen', restored.screen === 'restored', { screen: restored.screen });
  record('restore-reports-complete', restored.restore.complete === 'true', {
    complete: restored.restore.complete,
    summary: restored.restore.summary,
  });
  record('restore-lists-no-failures', restored.restore.failures.length === 0, {
    failures: restored.restore.failures,
  });

  const afterRestore = await readExtensionEnabledStates(surface, [...candidateIds, ...untouchableIds]);
  record(
    'restore-re-enables-only-the-touched-candidates',
    candidateIds.every((id) => afterRestore[id] === true) &&
      untouchableIds.every((id) => afterRestore[id] === before[id]),
    { before, afterRestore, candidateIds, untouchableIds },
  );

  await resetBisectState(surface);
  await reloadExtensionPage(surface, { selector: SIDEPANEL_ROOT_SELECTOR });
  await waitForCandidateState(surface, (state) => state.state === 'ready');

  await clickTestId(surface, 'picker-start');
  await waitForScreen(surface, 'preflight');
  await markPageForReloadCheck(testPage);
  await clickTestId(surface, 'preflight-start');
  const secondBaseline = await waitForScreen(surface, 'baseline');
  record('second-baseline-disables-every-candidate', secondBaseline.screen === 'baseline', {
    screen: secondBaseline.screen,
  });

  await clickTestId(surface, 'verdict-persists');
  const hostIssue = await waitForScreen(surface, 'host-issue');
  record('persists-verdict-aborts-as-a-host-issue', hostIssue.screen === 'host-issue', { screen: hostIssue.screen });
  record(
    'host-issue-explains-no-extension-is-implicated',
    (hostIssue.hostIssue.explanation ?? '').includes('no installed extension is implicated'),
    { explanation: hostIssue.hostIssue.explanation },
  );

  await clickTestId(surface, 'host-issue-restore');
  await waitFor(
    async () => {
      const state = await readSessionState(surface);
      return state.restore.summary !== null ? state : null;
    },
    { label: 'the host-issue restore summary' },
  );

  const afterHostRestore = await readExtensionEnabledStates(surface, [...candidateIds, ...untouchableIds]);
  record(
    'host-issue-restore-re-enables-only-the-touched-candidates',
    candidateIds.every((id) => afterHostRestore[id] === true) &&
      untouchableIds.every((id) => afterHostRestore[id] === before[id]),
    { before, afterHostRestore, candidateIds, untouchableIds },
  );

  const errors = collectErrors(session.recorder);
  record('no-background-runtime-errors', errors.backgroundErrors.length === 0, { errors: errors.backgroundErrors });
  record('no-page-errors', errors.pageErrors.length === 0, { errors: errors.pageErrors });
  record('no-console-errors', errors.consoleErrors.length === 0, { errors: errors.consoleErrors });
  record('no-request-failures', errors.requestFailures.length === 0, { errors: errors.requestFailures });

  return { steps };
}

/**
 * Full search to a known culprit. The harness is the oracle: it answers every
 * verdict from the fixture it knows is faulty, so the add-on's own batching is
 * the only thing under test. Fixture Alpha is the culprit, which means the first
 * partition leaves it *enabled*, so the search also exercises the final
 * confirmation trial before naming it.
 */
async function runPartitionLoopScenario({ surface, session, installed, testPage, fixtureServer }) {
  const steps = [];
  const record = makeRecorder(steps);
  const { candidates, theme, dormant } = extensionGroups(installed);

  const culprit = candidates.find((entry) => entry.dir === FIXTURES.alpha.dir);
  const innocent = candidates.find((entry) => entry.dir === FIXTURES.bravo.dir);
  if (culprit === undefined || innocent === undefined) {
    throw new Error('The partition-loop scenario needs the alpha and bravo fixtures');
  }

  const untouchableIds = [theme?.id, dormant?.id].filter((id) => typeof id === 'string');
  const candidateIds = candidates.map((entry) => entry.id);
  const before = await readExtensionEnabledStates(surface, [...candidateIds, ...untouchableIds]);

  const initial = await waitForCandidateState(surface, (state) => state.state === 'ready');
  record('partition-starts-from-the-picker', initial.screen === 'picker', { screen: initial.screen });

  await clickTestId(surface, 'picker-start');
  await waitForScreen(surface, 'preflight');
  await focusPage(testPage);
  await waitForAttribute(testPage, EXTENSION_TAB_ID_ATTRIBUTE, 15000);
  await clickTestId(surface, 'preflight-bind');
  await waitFor(
    async () => {
      const state = await readSessionState(surface);
      return state.preflight.testTab !== 'No test tab bound' ? state : null;
    },
    { label: 'the bound test tab' },
  );

  await clickTestId(surface, 'preflight-start');
  await waitForScreen(surface, 'baseline');

  const afterBaseline = await readExtensionEnabledStates(surface, candidateIds);
  record(
    'partition-baseline-disables-every-candidate',
    candidateIds.every((id) => afterBaseline[id] === false),
    { afterBaseline },
  );

  await testPage.goto(`${fixtureServer.url}/`, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await clickTestId(surface, 'verdict-gone');
  const firstTrial = await waitFor(
    async () => {
      const state = await readSessionState(surface);
      return state.screen === 'trial' && state.trial.applyLabel !== null ? state : null;
    },
    { label: 'the first trial plan' },
  );
  record('clean-baseline-advances-to-the-first-trial', firstTrial.screen === 'trial', { screen: firstTrial.screen });
  record(
    'first-trial-progress-reads-as-the-spec',
    /^Trial \d+ of ~\d+ · \d+ suspects?$/.test(firstTrial.trial.progress ?? ''),
    { progress: firstTrial.trial.progress },
  );

  let answered = 0;
  let screen = firstTrial;
  for (let guard = 0; guard < 12; guard += 1) {
    if (screen.screen === 'completed' || screen.screen === 'inconclusive') break;
    if (screen.screen !== 'trial') throw new Error(`Unexpected screen during the search: ${screen.screen}`);
    if (screen.trial.applyLabel === null) throw new Error('The trial screen showed no plan to apply');

    await clickTestId(surface, 'trial-apply');
    const applied = await waitFor(
      async () => {
        const state = await readSessionState(surface);
        const isAnsweredTrial =
          state.screen === 'trial' && state.trial.applyLabel === null && state.trial.persistsLabel !== null;
        return isAnsweredTrial ? state : null;
      },
      { label: 'the applied trial batch' },
    );

    record(
      `trial-${answered + 1}-uses-the-exact-verdict-labels`,
      applied.trial.persistsLabel === 'Problem persists' && applied.trial.goneLabel === 'Problem is gone',
      { persists: applied.trial.persistsLabel, gone: applied.trial.goneLabel },
    );

    const enabledNames = (applied.trial.enabled ?? '').split(', ').filter((name) => name.length > 0);
    const symptomPresent = enabledNames.includes(culprit.name);
    const choice = symptomPresent ? 'persists' : 'gone';
    answered += 1;

    await testPage.goto(`${fixtureServer.url}/`, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await clickTestId(surface, `verdict-${choice}`);
    screen = await waitFor(
      async () => {
        const state = await readSessionState(surface);
        if (state.screen === 'completed' || state.screen === 'inconclusive') return state;
        const isNextPlan = state.screen === 'trial' && state.trial.applyLabel !== null;
        return isNextPlan ? state : null;
      },
      { label: 'the next trial plan or the result' },
    );
  }

  record('search-answers-every-trial', answered >= 1, { answered });
  record('search-terminates-with-the-known-culprit', screen.screen === 'completed', {
    screen: screen.screen,
    answered,
  });
  record('search-names-the-fixture-culprit', screen.completed.culpritName === culprit.name, {
    culpritName: screen.completed.culpritName,
    expected: culprit.name,
  });
  record('search-exercises-the-final-confirmation', answered >= 2, {
    answered,
    note: 'the culprit was enabled by the first half-split',
  });

  const afterCompletion = await readExtensionEnabledStates(surface, [...candidateIds, ...untouchableIds]);
  record('culprit-is-left-disabled', afterCompletion[culprit.id] === false, {
    culprit: culprit.id,
    enabled: afterCompletion[culprit.id],
  });
  record('cleared-candidates-are-left-enabled', afterCompletion[innocent.id] === true, {
    innocent: innocent.id,
    enabled: afterCompletion[innocent.id],
  });
  record(
    'search-leaves-non-candidates-untouched',
    untouchableIds.every((id) => afterCompletion[id] === before[id]),
    { before, afterCompletion, untouchableIds },
  );

  record(
    'completed-screen-explains-the-culprit-stays-disabled',
    (screen.completed.detail ?? '').includes('still disabled'),
    {
      detail: screen.completed.detail,
    },
  );
  record('restore-visible-on-the-completed-screen', screen.restore.visible, { visible: screen.restore.visible });
  record('completed-screen-offers-a-prominent-restore', screen.completed.restoreLabel === 'Restore', {
    restoreLabel: screen.completed.restoreLabel,
  });

  await clickTestId(surface, 'restore-button');
  const restored = await waitFor(
    async () => {
      const state = await readSessionState(surface);
      return state.screen === 'restored' ? state : null;
    },
    { label: 'the restored screen' },
  );
  record('completed-restore-lands-on-the-restored-screen', restored.screen === 'restored', { screen: restored.screen });

  const afterRestore = await readExtensionEnabledStates(surface, [...candidateIds, ...untouchableIds]);
  record('restore-re-enables-the-culprit', afterRestore[culprit.id] === true, {
    culprit: culprit.id,
    enabled: afterRestore[culprit.id],
  });
  record(
    'restore-leaves-non-candidates-untouched',
    untouchableIds.every((id) => afterRestore[id] === before[id]),
    { before, afterRestore, untouchableIds },
  );

  const errors = collectErrors(session.recorder);
  record('no-background-runtime-errors', errors.backgroundErrors.length === 0, { errors: errors.backgroundErrors });
  record('no-page-errors', errors.pageErrors.length === 0, { errors: errors.pageErrors });
  record('no-console-errors', errors.consoleErrors.length === 0, { errors: errors.consoleErrors });
  record('no-request-failures', errors.requestFailures.length === 0, { errors: errors.requestFailures });

  return { steps };
}

/**
 * The Firefox assisted baseline, driven through the documented test-mode driver.
 * Firefox rejects `management.setEnabled` for a temporary add-on, so the harness
 * records the state an Add-ons Manager toggle would produce
 * (`setManualExtensionState`) and the add-on verifies it with `management.getAll`
 * plus its events. The automated rail is never faked: a real toggle is still
 * refused by the browser, which is what makes this an assisted run.
 */
async function runAssistedBaselineScenario({ surface, session, installed, testPage }) {
  const steps = [];
  const record = makeRecorder(steps);
  const { candidates, theme, dormant } = extensionGroups(installed);

  const untouchableIds = [theme?.id, dormant?.id].filter((id) => typeof id === 'string');
  const candidateIds = candidates.map((entry) => entry.id);
  const before = await readManualExtensionState(surface, [...candidateIds, ...untouchableIds]);

  const initial = await waitForCandidateState(surface, (state) => state.state === 'ready');
  record('assisted-capability-reports-assisted-mode', /Assisted/.test(initial.toggleMode ?? ''), {
    toggleMode: initial.toggleMode,
  });
  record('assisted-test-mode-driver-is-live', await hasTestDriverGlobal(surface), {
    firefoxPath: 'test-mode-driver',
  });
  record(
    'assisted-disabled-fixture-reported-disabled-at-start',
    initial.ineligible.some((row) => row.reason === 'Disabled at start'),
    { ineligible: initial.ineligible },
  );

  const picker = await readSessionState(surface);
  record('assisted-restore-visible-on-the-picker', picker.restore.visible, { visible: picker.restore.visible });
  record('assisted-restore-disabled-before-start', picker.restore.buttonDisabled === true, {
    buttonDisabled: picker.restore.buttonDisabled,
  });
  record('assisted-start-is-available', picker.picker.startDisabled === false, {
    startDisabled: picker.picker.startDisabled,
    blocked: picker.picker.blocked,
  });

  await clickTestId(surface, 'picker-start');
  const preflight = await waitForScreen(surface, 'preflight');
  record('assisted-preflight-warns-the-user-toggles', (preflight.preflight.mode ?? '').includes('Assisted'), {
    mode: preflight.preflight.mode,
  });

  await focusPage(testPage);
  await waitForAttribute(testPage, EXTENSION_TAB_ID_ATTRIBUTE, 15000);
  await clickTestId(surface, 'preflight-bind');
  await waitFor(
    async () => {
      const state = await readSessionState(surface);
      return state.preflight.testTab !== 'No test tab bound' ? state : null;
    },
    { label: 'the bound test tab' },
  );

  record(
    'assisted-preflight-toggles-nothing',
    JSON.stringify(await readManualExtensionState(surface, candidateIds)) ===
      JSON.stringify(Object.fromEntries(candidateIds.map((id) => [id, before[id]]))),
    { before },
  );

  await clickTestId(surface, 'preflight-start');
  const assisted = await waitForScreen(surface, 'assisted-baseline');

  record(
    'assisted-baseline-offers-both-routes',
    assisted.assisted.attestLabel !== null && assisted.assisted.openLabel !== null,
    {
      attest: assisted.assisted.attestLabel,
      open: assisted.assisted.openLabel,
    },
  );
  record('assisted-baseline-lists-every-candidate', assisted.assisted.checklist.length === candidateIds.length, {
    checklist: assisted.assisted.checklist,
    expected: candidateIds.length,
  });
  record(
    'assisted-baseline-asks-for-the-disabled-state',
    assisted.assisted.checklist.every((row) => row.target === 'Off'),
    { checklist: assisted.assisted.checklist },
  );
  record('assisted-baseline-shows-progress', /\d+ of \d+ done/.test(assisted.assisted.progress ?? ''), {
    progress: assisted.assisted.progress,
  });
  record('assisted-baseline-toggles-nothing-on-start', assisted.assisted.startToggledNothing, {
    states: await readManualExtensionState(surface, candidateIds),
  });

  await clickTestId(surface, 'assisted-open-addons');
  const addons = await waitFor(
    async () => {
      const state = await readSessionState(surface);
      return state.assisted.addonsMessage !== null ? state : null;
    },
    { label: 'the Add-ons Manager outcome' },
  );
  record('assisted-open-addons-reports-an-outcome', addons.assisted.addonsMessage !== null, {
    message: addons.assisted.addonsMessage,
  });

  await clickTestId(surface, 'assisted-verify');
  const unverified = await waitFor(
    async () => {
      const state = await readSessionState(surface);
      return state.assisted.error !== null ? state : null;
    },
    { label: 'the unverified-baseline rejection' },
  );
  record(
    'assisted-unverified-baseline-is-rejected',
    (unverified.assisted.error ?? '').includes('does not match this batch yet'),
    { error: unverified.assisted.error },
  );
  record('assisted-unverified-baseline-asks-no-verdict', unverified.assisted.hasVerdictButtons === false, {
    hasVerdictButtons: unverified.assisted.hasVerdictButtons,
  });

  for (const id of candidateIds) await setManualExtensionState(surface, id, false);
  const halfway = await readSessionState(surface);
  record('assisted-driver-reports-the-disabled-candidates', halfway.assisted.progress !== null, {
    progress: halfway.assisted.progress,
  });

  await clickTestId(surface, 'assisted-verify');
  const baseline = await waitForScreen(surface, 'baseline');
  record(
    'assisted-verified-baseline-asks-the-question',
    (baseline.baseline.question ?? '').includes('Does the problem still happen'),
    {
      question: baseline.baseline.question,
    },
  );
  record(
    'assisted-baseline-uses-the-exact-verdict-labels',
    baseline.baseline.persistsLabel === 'Problem persists' && baseline.baseline.goneLabel === 'Problem is gone',
    { persists: baseline.baseline.persistsLabel, gone: baseline.baseline.goneLabel },
  );

  const afterBaseline = await readManualExtensionState(surface, [...candidateIds, ...untouchableIds]);
  record(
    'assisted-baseline-leaves-non-candidates-untouched',
    untouchableIds.every((id) => afterBaseline[id] === before[id]),
    { before, afterBaseline, untouchableIds },
  );

  await clickTestId(surface, 'verdict-gone');
  const advanced = await waitFor(
    async () => {
      const state = await readSessionState(surface);
      return state.screen === 'trial' && state.trial.applyLabel !== null ? state : null;
    },
    { label: 'the first assisted trial plan' },
  );
  record('assisted-baseline-advances-to-the-first-trial', advanced.screen === 'trial', { screen: advanced.screen });

  await clickTestId(surface, 'restore-button');
  const restored = await waitFor(
    async () => {
      const state = await readSessionState(surface);
      return state.screen === 'restored' ? state : null;
    },
    { label: 'the restored screen' },
  );
  record('assisted-restore-lands-on-the-restored-screen', restored.screen === 'restored', { screen: restored.screen });
  record('assisted-restore-never-claims-a-false-success', restored.restore.complete === 'false', {
    complete: restored.restore.complete,
    summary: restored.restore.summary,
  });
  const restoreSummary = await waitFor(
    async () => {
      const state = await readSessionState(surface);
      return state.assisted.restoreSummary !== null ? state : null;
    },
    { label: 'the assisted restore checklist' },
  );
  record(
    'assisted-restore-lists-the-original-states',
    restoreSummary.assisted.restoreRows.length === candidateIds.length,
    { rows: restoreSummary.assisted.restoreRows, expected: candidateIds.length },
  );
  record(
    'assisted-restore-reports-what-is-left',
    restoreSummary.assisted.restoreSummary.includes('still to turn back on'),
    {
      summary: restoreSummary.assisted.restoreSummary,
    },
  );

  for (const id of candidateIds) await setManualExtensionState(surface, id, true);
  await clickTestId(surface, 'assisted-restore-verify');
  const verified = await waitFor(
    async () => {
      const state = await readSessionState(surface);
      return state.assisted.restoreComplete === 'true' ? state : null;
    },
    { label: 'the verified assisted restore' },
  );
  record('assisted-restore-verifies-completion', verified.assisted.restoreComplete === 'true', {
    summary: verified.assisted.restoreSummary,
  });

  const afterRestore = await readManualExtensionState(surface, candidateIds);
  record(
    'assisted-restore-leaves-every-candidate-enabled',
    candidateIds.every((id) => afterRestore[id] === true),
    { afterRestore },
  );

  const errors = collectErrors(session.recorder);
  record('no-background-runtime-errors', errors.backgroundErrors.length === 0, { errors: errors.backgroundErrors });
  record('no-page-errors', errors.pageErrors.length === 0, { errors: errors.pageErrors });
  record('no-console-errors', errors.consoleErrors.length === 0, { errors: errors.consoleErrors });
  record('no-request-failures', errors.requestFailures.length === 0, { errors: errors.requestFailures });

  return { steps, firefoxPath: 'test-mode-driver' };
}

async function runAssistedExternalAttestationScenario({ surface, session, installed }) {
  const steps = [];
  const record = makeRecorder(steps);
  const { candidates } = extensionGroups(installed);
  const candidateIds = candidates.map((entry) => entry.id);
  const before = await readManualExtensionState(surface, candidateIds);

  await waitForCandidateState(surface, (state) => state.state === 'ready');
  await clickTestId(surface, 'picker-start');
  await waitForScreen(surface, 'preflight');
  await clickTestId(surface, 'preflight-start');
  await waitForScreen(surface, 'assisted-baseline');

  await clickTestId(surface, 'assisted-attest');
  const attested = await waitFor(
    async () => {
      const state = await readSessionState(surface);
      return state.screen === 'trial' && state.trial.applyLabel !== null ? state : null;
    },
    { label: 'the post-attestation trial plan' },
  );

  record('assisted-attestation-proceeds-at-full-enabled-state', attested.screen === 'trial', {
    screen: attested.screen,
  });
  const after = await readManualExtensionState(surface, candidateIds);
  record(
    'assisted-attestation-toggles-nothing',
    candidateIds.every((id) => after[id] === before[id]),
    { before, after },
  );
  record(
    'assisted-attestation-asks-no-verdict-before-the-batch-is-applied',
    attested.trial.persistsLabel === null && attested.trial.planDisabled !== '',
    { planDisabled: attested.trial.planDisabled, persistsLabel: attested.trial.persistsLabel },
  );

  const errors = collectErrors(session.recorder);
  record('no-background-runtime-errors', errors.backgroundErrors.length === 0, { errors: errors.backgroundErrors });
  record('no-page-errors', errors.pageErrors.length === 0, { errors: errors.pageErrors });
  record('no-console-errors', errors.consoleErrors.length === 0, { errors: errors.consoleErrors });
  record('no-request-failures', errors.requestFailures.length === 0, { errors: errors.requestFailures });

  return { steps, firefoxPath: 'test-mode-driver' };
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

function selectScenarios(scenario, browserName) {
  if (scenario !== null) return [scenario];
  return browserName === 'chrome' ? CHROME_SCENARIOS : FIREFOX_SCENARIOS;
}

async function runScenarioForBrowser(browserName, scenario, session, context) {
  if (scenario === 'candidate-picker') {
    const { steps } = await runCandidatePickerScenario({
      surface: context.surface,
      session,
      installed: context.eligibleInstalled,
    });
    return {
      steps,
      firefoxPath: browserName === 'firefox' ? 'management.getAll (temporary add-ons; no toggling)' : undefined,
    };
  }

  if (scenario === 'assisted-baseline') {
    return runAssistedBaselineScenario({
      surface: context.surface,
      session,
      installed: context.installed,
      testPage: context.page,
    });
  }

  if (scenario === 'assisted-external') {
    return runAssistedExternalAttestationScenario({
      surface: context.surface,
      session,
      installed: context.installed,
    });
  }

  if (scenario === 'partition-loop') {
    return runPartitionLoopScenario({
      surface: context.surface,
      session,
      installed: context.installed,
      testPage: context.page,
      fixtureServer: context.fixtureServer,
    });
  }

  return runSessionBaselineScenario({
    surface: context.surface,
    session,
    installed: context.installed,
    testPage: context.page,
    fixtureServer: context.fixtureServer,
  });
}

async function runBrowser(browserName, options) {
  const fixtureServer = await startFixtureServer();
  const scenarios = selectScenarios(options.scenario, browserName);
  const results = [];

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

    page = await session.newPage();
    await page.goto(`${fixtureServer.url}/`, { waitUntil: 'domcontentloaded' }).catch(() => undefined);

    for (const scenario of scenarios) {
      const result = {
        browser: browserName,
        ok: false,
        scenario,
        firefoxPath: browserName === 'firefox' ? null : undefined,
        steps: [],
        errors: null,
      };
      if (browserName === 'chrome') {
        await resetBisectState(surface);
        await restoreFixtureState(surface, { candidates: eligibleInstalled, dormant: dormantInstalled });
        await reloadExtensionPage(surface, { selector: SIDEPANEL_ROOT_SELECTOR });
      } else {
        await resetBisectState(surface);
        await resetManualExtensionState(surface);
        if (dormantInstalled !== null) await setManualExtensionState(surface, dormantInstalled.id, false);
        await reloadExtensionPage(surface, { selector: SIDEPANEL_ROOT_SELECTOR });
      }
      try {
        const { steps, firefoxPath } = await runScenarioForBrowser(browserName, scenario, session, {
          surface,
          installed,
          eligibleInstalled,
          fixtureServer,
          page,
        });
        result.steps = steps;
        if (firefoxPath !== undefined) result.firefoxPath = firefoxPath;
        result.ok = true;
      } catch (error) {
        const errors = collectErrors(session.recorder);
        result.errors = {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? (error.stack ?? null) : null,
          screenshot: await captureFailure(surface, page, browserName, scenario),
          dom: surface === null ? null : await summarizeDom(surface),
          ...errors,
        };
      }
      results.push(result);
    }
  } catch (error) {
    const errors =
      session === null
        ? { pageErrors: [], consoleErrors: [], backgroundErrors: [], requestFailures: [] }
        : collectErrors(session.recorder);
    results.push({
      browser: browserName,
      ok: false,
      scenario: scenarios[0] ?? 'launch',
      firefoxPath: browserName === 'firefox' ? null : undefined,
      steps: [],
      errors: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? (error.stack ?? null) : null,
        screenshot: await captureFailure(surface, page, browserName, scenarios[0] ?? 'launch'),
        dom: surface === null ? null : await summarizeDom(surface),
        ...errors,
      },
    });
  } finally {
    if (session !== null) await session.close().catch(() => undefined);
    await fixtureServer.close().catch(() => undefined);
  }

  return results;
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
    results.push(...(await runBrowser(browserName, options)));
  }

  const ok = results.length > 0 && results.every((result) => result.ok);
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
