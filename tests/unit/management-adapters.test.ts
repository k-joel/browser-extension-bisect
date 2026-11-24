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

  it('watches management events without throwing', () => {
    const { port } = portFor(create);

    const stop = port.watchEvents(() => undefined);

    expect(typeof stop).toBe('function');
    stop();
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

/**
 * ADR-008's enterprise-policy exception: an `admin` install may call `setEnabled`,
 * so Firefox must stop asking the user and behave exactly like Chrome. These cases
 * run both adapters against the same expectations, which is what makes the routing
 * a contract rather than a coincidence.
 */
const POLICY_SELF = makeExtensionInfo({ id: 'self-id', name: 'Extension Bisect', installType: 'admin' });

const POLICY_ADAPTERS = [
  {
    name: 'chrome-port',
    create: (surface: Surface): ManagementPort => createChromePort({ management: surface }),
  },
  {
    name: 'firefox-port (admin install)',
    create: (surface: Surface): ManagementPort => createFirefoxPort({ management: surface, debounceMs: 5 }),
  },
];

function policySurface(options: { setEnabledError?: (id: string, enabled: boolean) => Error | null } = {}): Surface {
  return createFakeManagement({
    self: POLICY_SELF,
    extensions: [
      makeExtensionInfo({ id: 'aaaa', name: 'Alpha' }),
      makeExtensionInfo({ id: 'bbbb', name: 'Bravo' }),
      POLICY_SELF,
    ],
    ...options,
  });
}

function allOff(): { enabled: string[]; disabled: string[]; allOutsideSuspectsEnabled: boolean } {
  return { enabled: [], disabled: ['aaaa', 'bbbb'], allOutsideSuspectsEnabled: true };
}

describe.each(POLICY_ADAPTERS)('$name enterprise-policy automated path', ({ create }) => {
  it('reports canAutoToggle so the session never asks for a manual batch', async () => {
    const port = create(policySurface());

    await expect(port.getCapabilities()).resolves.toMatchObject({ canAutoToggle: true, selfInstallType: 'admin' });
  });

  it('applies the target state through the automated diff', async () => {
    const surface = policySurface();
    const port = create(surface);

    const result = await port.applyTargetState(allOff());

    expect(result).toEqual({ applied: ['aaaa', 'bbbb'], errors: [], ok: true });
    expect('enableIds' in result).toBe(false);
    expect(surface.setEnabledCalls).toEqual([
      { id: 'aaaa', enabled: false },
      { id: 'bbbb', enabled: false },
    ]);
  });

  it('keeps the shared per-id error mapping instead of a manual checklist', async () => {
    const port = create(policySurface({ setEnabledError: (id) => (id === 'aaaa' ? new Error('blocked') : null) }));

    const result = await port.applyTargetState(allOff());

    expect(result).toMatchObject({ applied: ['bbbb'], ok: false });
    expect((result as { errors: { extensionId: string }[] }).errors[0]).toMatchObject({ extensionId: 'aaaa' });
  });

  it('restores through the automated path and reports what it could not re-enable', async () => {
    const surface = policySurface();
    const port = create(surface);
    await port.applyTargetState(allOff());

    const restored = await port.restore({ aaaa: true, bbbb: true });

    expect(restored).toMatchObject({ complete: true, restoredIds: ['aaaa', 'bbbb'] });
  });

  it('verifies the state with the shared comparison and no pending-manual category', async () => {
    const port = create(policySurface());

    const drift = await port.verifyState(allOff());

    expect(drift.inSync).toBe(false);
    expect(drift.pendingManualToggles).toEqual(['aaaa', 'bbbb']);
    expect(drift.unexpectedToggles).toEqual([]);
  });
});
