import { describe, expect, it } from 'vitest';
import { createChromePort } from '@/utils/bisect/chrome-port';
import type { ManagementPort } from '@/utils/bisect/domain';
import { createFirefoxPort } from '@/utils/bisect/firefox-port';
import { createFakeManagement, makeExtensionInfo } from './helpers/fake-management';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect', installType: 'normal' });

type Surface = ReturnType<typeof createFakeManagement>;
type AdapterOptions = { management: Surface };

function portFor(create: (options: AdapterOptions) => ManagementPort) {
  const surface = createFakeManagement({
    self: SELF,
    extensions: [
      makeExtensionInfo({ id: 'bbbb', name: 'Bravo' }),
      makeExtensionInfo({ id: 'aaaa', name: 'Alpha' }),
      SELF,
      makeExtensionInfo({ id: 'theme-id', name: 'Midnight', type: 'theme' }),
    ],
  });
  return { surface, port: create({ management: surface }) };
}

const ADAPTERS = [
  { name: 'chrome-port', create: (options: AdapterOptions) => createChromePort(options) },
  { name: 'firefox-port', create: (options: AdapterOptions) => createFirefoxPort(options) },
];

describe.each(ADAPTERS)('$name candidate listing', ({ create }) => {
  it('returns the shared eligible list in deterministic order', async () => {
    const { port } = portFor(create);

    const { eligible } = await port.listCandidates();

    expect(eligible.map((candidate) => candidate.name)).toEqual(['Alpha', 'Bravo']);
  });

  it('returns the ineligible list with reasons, excluding self and themes', async () => {
    const { port } = portFor(create);

    const { ineligible } = await port.listCandidates();

    expect(ineligible.map((entry) => [entry.name, entry.reason])).toEqual([
      ['Browser Extension Bisect', 'self'],
      ['Midnight', 'theme-or-app'],
    ]);
  });

  it('keeps a user-excluded extension eligible so the picker has a single source', async () => {
    const surface = createFakeManagement({
      self: SELF,
      extensions: [makeExtensionInfo({ id: 'aaaa', name: 'Alpha' }), SELF],
    });
    const port = create({ management: surface });

    const { eligible, ineligible } = await port.listCandidates();

    expect(eligible.map((candidate) => candidate.id)).toEqual(['aaaa']);
    expect(ineligible).toEqual([expect.objectContaining({ id: SELF.id, reason: 'self' })]);
  });

  it('returns the capability report without toggling anything', async () => {
    const { surface, port } = portFor(create);

    await port.getCapabilities();

    expect(surface.setEnabledCalls).toEqual([]);
  });

  it('exposes every port method', () => {
    const { port } = portFor(create);

    expect(typeof port.getCapabilities).toBe('function');
    expect(typeof port.listCandidates).toBe('function');
    expect(typeof port.applyTargetState).toBe('function');
    expect(typeof port.verifyState).toBe('function');
    expect(typeof port.restore).toBe('function');
    expect(typeof port.watchEvents).toBe('function');
  });

  it.each(['applyTargetState', 'verifyState', 'restore'] as const)(
    'rejects with not implemented for %s',
    async (method) => {
      const { port } = portFor(create);

      const target = port[method] as (...args: unknown[]) => Promise<unknown>;

      await expect(target({ enabled: [], disabled: [], allOutsideSuspectsEnabled: true })).rejects.toThrow(
        'not implemented',
      );
    },
  );

  it('throws not implemented when watching events', () => {
    const { port } = portFor(create);

    expect(() => port.watchEvents(() => undefined)).toThrow(new Error('not implemented'));
  });
});

describe('chrome port capabilities', () => {
  it('reports automated toggling and the side panel surface', async () => {
    const surface = createFakeManagement({ self: SELF, extensions: [SELF] });
    const capability = await createChromePort({ management: surface }).getCapabilities();

    expect(capability).toEqual({
      browserName: 'chrome',
      canAutoToggle: true,
      selfInstallType: 'normal',
      sideSurface: 'side-panel',
    });
  });
});

describe('firefox port capabilities', () => {
  it('reports assisted mode for a normal install', async () => {
    const surface = createFakeManagement({
      self: makeExtensionInfo({ id: 'self-id', name: 'Extension Bisect', installType: 'normal' }),
      extensions: [SELF],
    });
    const capability = await createFirefoxPort({ management: surface }).getCapabilities();

    expect(capability).toEqual({
      browserName: 'firefox',
      canAutoToggle: false,
      selfInstallType: 'normal',
      sideSurface: 'sidebar',
    });
  });

  it('reports automated mode for an enterprise-policy install', async () => {
    const policySelf = makeExtensionInfo({ id: 'self-id', name: 'Extension Bisect', installType: 'admin' });
    const surface = createFakeManagement({ self: policySelf, extensions: [policySelf] });
    const capability = await createFirefoxPort({ management: surface }).getCapabilities();

    expect(capability.canAutoToggle).toBe(true);
    expect(capability.selfInstallType).toBe('admin');
  });
});
