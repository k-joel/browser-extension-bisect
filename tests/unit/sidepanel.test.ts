// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { registerBackgroundHandlers } from '@/entrypoints/background';
import App from '@/entrypoints/sidepanel/App.vue';
import { createChromePort } from '@/utils/bisect/chrome-port';
import { readBisectConfig } from '@/utils/bisect/config';
import type { ManagementPort } from '@/utils/bisect/domain';
import { messenger } from '@/utils/messaging';
import { createFakeManagement, makeExtensionInfo } from './helpers/fake-management';
import { installMessagingBridge } from './helpers/messaging-bridge';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect' });

interface Install {
  id: string;
  name: string;
  version?: string;
  type?: string;
  enabled?: boolean;
  mayDisable?: boolean;
}

function makePort(installs: Install[]): ManagementPort {
  return createChromePort({
    management: createFakeManagement({
      self: SELF,
      extensions: [
        ...installs.map((install) =>
          makeExtensionInfo({
            id: install.id,
            name: install.name,
            version: install.version ?? '1.0.0',
            enabled: install.enabled ?? true,
            mayDisable: install.mayDisable ?? true,
            ...(install.type === undefined ? {} : { type: install.type }),
          }),
        ),
        SELF,
      ],
    }),
  });
}

const DEFAULT_INSTALLS: Install[] = [
  { id: 'aaaa', name: 'Alpha Blocker', version: '1.2.3' },
  { id: 'bbbb', name: 'Bravo Reader', version: '4.9.0' },
];

const DEFAULT_CANDIDATES = [
  {
    id: 'aaaa',
    name: 'Alpha Blocker',
    version: '1.2.3',
    description: '',
    enabledAtStart: true,
    mayDisable: true,
    installType: 'normal',
    type: 'extension' as const,
    icons: [],
  },
  {
    id: 'bbbb',
    name: 'Bravo Reader',
    version: '4.9.0',
    description: '',
    enabledAtStart: true,
    mayDisable: true,
    installType: 'normal',
    type: 'extension' as const,
    icons: [],
  },
];

function mountPanel(installs: Install[] = DEFAULT_INSTALLS) {
  registerBackgroundHandlers({ managementPort: makePort(installs) });
  return mount(App);
}

const testIds = (wrapper: Awaited<ReturnType<typeof mountPanel>>) =>
  wrapper.findAll('[data-testid]').map((node) => node.attributes('data-testid'));

describe('side panel candidate picker', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  it('shows a loading state before the capability report arrives', () => {
    registerBackgroundHandlers({ managementPort: makePort(DEFAULT_INSTALLS) });

    const wrapper = mount(App);

    expect(wrapper.get('[data-testid="sidepanel-root"]').attributes('data-state')).toBe('loading');
    expect(wrapper.get('[data-testid="sidepanel-loading"]').text()).toContain('Loading');
    expect(wrapper.get('[data-testid="sidepanel-live"]').text()).toContain('Loading');
  });

  it('renders the no-session screen once loaded', async () => {
    const wrapper = mountPanel();
    await flushPromises();

    expect(wrapper.get('[data-testid="sidepanel-root"]').attributes('data-state')).toBe('ready');
    expect(wrapper.find('[data-testid="sidepanel-loading"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="no-session"]').text()).toContain('Find the extension causing a problem');
    expect(wrapper.get('[data-testid="culprit-warning"]').text()).toContain(
      'The culprit stays disabled until you press Restore',
    );
  });

  it('renders the capability report with the browser and toggle mode', async () => {
    const wrapper = mountPanel();
    await flushPromises();

    expect(wrapper.get('[data-testid="capability-report"] [data-testid="capability-browser"]').text()).toBe('chrome');
    expect(wrapper.get('[data-testid="capability-toggle-mode"]').text()).toContain('Automatic');
    expect(wrapper.get('[data-testid="capability-surface"]').text()).toContain('Side panel');
  });

  it('lists every eligible extension ordered by name with a checkbox each', async () => {
    const wrapper = mountPanel();
    await flushPromises();

    const rows = wrapper.findAll('[data-testid="candidate-row"]');
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.get('[data-testid="candidate-name"]').text())).toEqual([
      'Alpha Blocker',
      'Bravo Reader',
    ]);
    expect(rows.every((row) => row.find('[data-testid="candidate-checkbox"]').exists())).toBe(true);
    expect(
      rows.every((row) => row.find('[data-testid="candidate-checkbox"]').attributes('aria-label') !== undefined),
    ).toBe(true);
    expect(wrapper.get('[data-testid="candidate-row"]').attributes('data-extension-id')).toBe('aaaa');
  });

  it('renders initials instead of icons', async () => {
    const wrapper = mountPanel();
    await flushPromises();

    const rows = wrapper.findAll('[data-testid="candidate-row"]');
    expect(rows[0]?.get('[data-testid="candidate-initials"]').text()).toBe('AB');
    expect(rows.every((row) => row.find('[data-testid="candidate-icon"]').exists() === false)).toBe(true);
  });

  it('renders the empty eligible state when every extension is ineligible', async () => {
    const wrapper = mountPanel([{ id: 'bbbb', name: 'Bravo Reader', enabled: false }]);
    await flushPromises();

    expect(wrapper.findAll('[data-testid="candidate-row"]')).toHaveLength(0);
    expect(wrapper.get('[data-testid="eligible-empty"]').text()).toContain('No eligible enabled extensions');
  });

  it('renders the ineligible list with a reason for every entry and no checkboxes', async () => {
    const wrapper = mountPanel([
      { id: 'aaaa', name: 'Alpha Blocker' },
      { id: 'bbbb', name: 'Bravo Reader', enabled: false },
      { id: 'cccc', name: 'Charlie Locked', mayDisable: false },
      { id: 'dddd', name: 'Delta Theme', type: 'theme' },
    ]);
    await flushPromises();

    const rows = wrapper.findAll('[data-testid="ineligible-row"]');
    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.get('[data-testid="ineligible-name"]').text())).toEqual([
      'Bravo Reader',
      'Browser Extension Bisect',
      'Charlie Locked',
      'Delta Theme',
    ]);
    expect(rows.map((row) => row.get('[data-testid="ineligible-reason"]').text())).toEqual([
      'Disabled at start',
      'This add-on',
      'Policy-locked',
      'Theme or app',
    ]);
    expect(wrapper.findAll('[data-testid="ineligible-row"] [data-testid="candidate-checkbox"]')).toHaveLength(0);
  });

  it('hides the ineligible section when nothing is ineligible', async () => {
    const base = makePort(DEFAULT_INSTALLS);
    registerBackgroundHandlers({
      managementPort: { ...base, listCandidates: async () => ({ eligible: DEFAULT_CANDIDATES, ineligible: [] }) },
    });

    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.find('[data-testid="ineligible-section"]').exists()).toBe(false);
  });

  it('filters candidates by display name case-insensitively', async () => {
    const wrapper = mountPanel();
    await flushPromises();

    await wrapper.get('[data-testid="candidate-search"]').setValue('bravo');
    await flushPromises();

    const rows = wrapper.findAll('[data-testid="candidate-row"]');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.get('[data-testid="candidate-name"]').text()).toBe('Bravo Reader');
  });

  it('shows a no-match state when the search matches nothing', async () => {
    const wrapper = mountPanel();
    await flushPromises();

    await wrapper.get('[data-testid="candidate-search"]').setValue('zzz');
    await flushPromises();

    expect(wrapper.findAll('[data-testid="candidate-row"]')).toHaveLength(0);
    expect(wrapper.get('[data-testid="search-empty"]').text()).toContain('No extension matches "zzz"');
  });

  it('announces the visible count through aria-live as the search narrows', async () => {
    const wrapper = mountPanel();
    await flushPromises();

    expect(wrapper.get('[data-testid="sidepanel-live"]').text()).toContain('2 of 2 candidates');

    await wrapper.get('[data-testid="candidate-search"]').setValue('alpha');
    await flushPromises();

    expect(wrapper.get('[data-testid="sidepanel-live"]').text()).toContain('1 of 2 candidates');
    expect(wrapper.get('[data-testid="sidepanel-live"]').attributes('aria-live')).toBe('polite');
  });

  it('persists an exclusion through messaging and renders the row unchecked with a reason', async () => {
    const wrapper = mountPanel();
    await flushPromises();

    await wrapper.get('[data-testid="candidate-checkbox"]').trigger('change');
    await flushPromises();

    expect((await readBisectConfig()).excludedExtensionIds).toEqual(['aaaa']);
    const excludedRow = wrapper.get('[data-testid="candidate-row"][data-extension-id="aaaa"]');
    expect(excludedRow.attributes('data-selected')).toBe('false');
    expect(excludedRow.get('[data-testid="candidate-reason"]').text()).toBe('Excluded by you');
    expect(wrapper.findAll('[data-testid="candidate-row"]')).toHaveLength(2);

    wrapper.unmount();
    messenger.removeAllListeners();
    installMessagingBridge();
    const remounted = mountPanel();
    await flushPromises();

    expect(remounted.findAll('[data-testid="candidate-row"]')).toHaveLength(2);
    const persistedRow = remounted.get('[data-testid="candidate-row"][data-extension-id="aaaa"]');
    expect(persistedRow.attributes('data-selected')).toBe('false');
    expect(persistedRow.get('[data-testid="candidate-checkbox"]').attributes('checked')).toBeUndefined();
  });

  it('restores a previously excluded extension when it is checked again', async () => {
    const wrapper = mountPanel();
    await flushPromises();

    await wrapper.get('[data-testid="candidate-checkbox"]').trigger('change');
    await flushPromises();
    await wrapper.get('[data-testid="candidate-checkbox"]').trigger('change');
    await flushPromises();

    expect((await readBisectConfig()).excludedExtensionIds).toEqual([]);
    expect(wrapper.findAll('[data-testid="candidate-row"][data-selected="true"]')).toHaveLength(2);
    expect(wrapper.find('[data-testid="candidate-reason"]').exists()).toBe(false);
  });

  it('reports a rejected message instead of leaving the panel stuck', async () => {
    registerBackgroundHandlers({
      managementPort: {
        ...makePort(DEFAULT_INSTALLS),
        getCapabilities: async () => {
          throw new Error('management.getAll failed');
        },
      },
    });

    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.get('[data-testid="sidepanel-root"]').attributes('data-state')).toBe('error');
    expect(wrapper.get('[data-testid="sidepanel-error"]').text()).toContain('management.getAll failed');
  });

  it('gives every meaningful node a stable test id', async () => {
    const wrapper = mountPanel();
    await flushPromises();

    const ids = testIds(wrapper);
    for (const id of [
      'sidepanel-root',
      'sidepanel-live',
      'no-session',
      'culprit-warning',
      'capability-report',
      'candidate-search',
      'candidate-list',
      'ineligible-list',
    ]) {
      expect(ids).toContain(id);
    }
  });
});
