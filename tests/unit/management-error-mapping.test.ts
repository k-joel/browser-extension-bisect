import { describe, expect, it } from 'vitest';
import { createChromePort } from '@/utils/bisect/chrome-port';
import type { EnabledStateMap, TargetState, ToggleErrorCode } from '@/utils/bisect/domain';
import { createFirefoxPort } from '@/utils/bisect/firefox-port';
import { mapToggleError, rollbackTarget } from '@/utils/bisect/management-port';
import { createFakeManagement, makeExtensionInfo } from './helpers/fake-management';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect' });

function target(enabled: string[], disabled: string[]): TargetState {
  return { enabled, disabled, allOutsideSuspectsEnabled: true };
}

/**
 * The exact messages Chrome and Firefox produce, including the ones that overlap: a
 * greylisted re-enable is also refused "for policy", and Chrome wraps the policy check
 * in a permission error. Each row is one documented code.
 */
const MAPPING_MATRIX: { message: string; code: ToggleErrorCode }[] = [
  {
    message: 'ExtensionMayModifySettings',
    code: 'policy-blocked',
  },
  {
    message:
      'chrome.management.setEnabled: This extension may modify settings for other extensions, but is not permitted to do so for this extension.',
    code: 'policy-blocked',
  },
  { message: 'Cannot modify this extension: it is blocked by policy.', code: 'policy-blocked' },
  { message: 'This extension is managed by your administrator', code: 'policy-blocked' },
  { message: 'Extension cannot be modified on this device', code: 'policy-blocked' },
  { message: 'kGestureNeededForEscalationError', code: 'needs-user-gesture' },
  { message: 'This action requires a user gesture to enable the extension.', code: 'needs-user-gesture' },
  { message: 'Requires a click: enabling this extension needs user activation.', code: 'needs-user-gesture' },
  { message: 'kCannotReEnableGreylistedError', code: 'manual-recovery-required' },
  {
    message: 'The extension could not be re-enabled because it is greylisted by the browser.',
    code: 'manual-recovery-required',
  },
  { message: 'kNoExtensionError', code: 'extension-removed' },
  { message: 'No extension with id aaaa was found.', code: 'extension-removed' },
  { message: 'No such extension', code: 'extension-removed' },
  { message: 'Unknown extension', code: 'extension-removed' },
  { message: 'The extension is not installed', code: 'extension-removed' },
  { message: 'Requirements not satisfied: a new version of the browser is needed.', code: 'unsupported-requirements' },
  { message: 'This extension is not supported on this platform', code: 'unsupported-requirements' },
  { message: 'something unexpected', code: 'unsupported-requirements' },
  { message: '', code: 'unsupported-requirements' },
];

describe('toggle error mapping', () => {
  it.each(MAPPING_MATRIX)('maps "$message" to $code', ({ message, code }) => {
    expect(mapToggleError(new Error(message))).toBe(code);
  });

  it('recognises the greylist before the generic policy wording', () => {
    expect(mapToggleError(new Error('kCannotReEnableGreylistedError: blocked by policy'))).toBe(
      'manual-recovery-required',
    );
  });

  it('recognises the gesture requirement before the generic policy wording', () => {
    expect(mapToggleError(new Error('managed by your administrator: requires a user gesture'))).toBe(
      'needs-user-gesture',
    );
  });

  it('accepts a non-Error rejection', () => {
    expect(mapToggleError('kNoExtensionError')).toBe('extension-removed');
    expect(mapToggleError(undefined)).toBe('unsupported-requirements');
  });

  it('reaches every documented code from at least one message', () => {
    const covered = new Set(MAPPING_MATRIX.map((row) => row.code));
    expect([...covered].sort()).toEqual([
      'extension-removed',
      'manual-recovery-required',
      'needs-user-gesture',
      'policy-blocked',
      'unsupported-requirements',
    ]);
  });
});

describe('toggle error mapping reaches the adapter results', () => {
  const CASES: { message: string; code: ToggleErrorCode }[] = [
    { message: 'ExtensionMayModifySettings', code: 'policy-blocked' },
    { message: 'kGestureNeededForEscalationError', code: 'needs-user-gesture' },
    { message: 'kNoExtensionError', code: 'extension-removed' },
    { message: 'Requirements not satisfied', code: 'unsupported-requirements' },
  ];

  it.each(CASES)('reports $code per id on a failed apply', async ({ message, code }) => {
    const surface = createFakeManagement({
      self: SELF,
      extensions: [
        makeExtensionInfo({ id: 'aaaa', name: 'Alpha' }),
        makeExtensionInfo({ id: 'bbbb', name: 'Bravo' }),
        SELF,
      ],
      setEnabledError: (id) => (id === 'aaaa' ? new Error(message) : null),
    });
    const port = createChromePort({ management: surface });

    const result = await port.applyTargetState(target([], ['aaaa', 'bbbb']));

    expect(result.ok).toBe(false);
    expect(result.applied).toEqual(['bbbb']);
    expect(result.errors).toEqual([{ extensionId: 'aaaa', code, message }]);
  });

  it.each(CASES)('reports $code per id on a failed restore', async ({ message, code }) => {
    const surface = createFakeManagement({
      self: SELF,
      extensions: [
        makeExtensionInfo({ id: 'aaaa', name: 'Alpha', enabled: false }),
        makeExtensionInfo({ id: 'bbbb', name: 'Bravo', enabled: false }),
        SELF,
      ],
      setEnabledError: (id, enabled) => (id === 'aaaa' && enabled ? new Error(message) : null),
    });
    const port = createChromePort({ management: surface });

    const result = await port.restore({ aaaa: true, bbbb: true });

    expect(result.complete).toBe(false);
    expect(result.restoredIds).toEqual(['bbbb']);
    expect(result.errors).toEqual([{ extensionId: 'aaaa', code, message }]);
  });

  it('leaves the assisted checklist on the Firefox rail unaffected by the mapping', async () => {
    const surface = createFakeManagement({
      self: SELF,
      extensions: [makeExtensionInfo({ id: 'aaaa', name: 'Alpha' }), SELF],
    });
    const port = createFirefoxPort({ management: surface, debounceMs: 5 });

    const result = await port.applyTargetState(target([], ['aaaa']));

    expect('enableIds' in result).toBe(true);
    expect(surface.setEnabledCalls).toEqual([]);
  });
});

describe('greylist restore honesty', () => {
  const ORIGINAL: EnabledStateMap = { aaaa: true, bbbb: true };

  it('never claims success when one re-enable is greylisted', async () => {
    const surface = createFakeManagement({
      self: SELF,
      extensions: [
        makeExtensionInfo({ id: 'aaaa', name: 'Alpha', enabled: false }),
        makeExtensionInfo({ id: 'bbbb', name: 'Bravo', enabled: false }),
        SELF,
      ],
      setEnabledError: (id, enabled) => (id === 'aaaa' && enabled ? new Error('kCannotReEnableGreylistedError') : null),
    });
    const port = createChromePort({ management: surface });

    const result = await port.restore(ORIGINAL);

    expect(result.complete).toBe(false);
    expect(result.manualIds).toEqual([]);
    expect(result.errors.map((error) => [error.extensionId, error.code])).toEqual([
      ['aaaa', 'manual-recovery-required'],
    ]);
  });

  it('reports complete only when every touched id reached its original state', async () => {
    const surface = createFakeManagement({
      self: SELF,
      extensions: [
        makeExtensionInfo({ id: 'aaaa', name: 'Alpha', enabled: false }),
        makeExtensionInfo({ id: 'bbbb', name: 'Bravo', enabled: false }),
        SELF,
      ],
    });
    const port = createChromePort({ management: surface });

    await expect(port.restore(ORIGINAL)).resolves.toMatchObject({ complete: true, errors: [] });
  });
});

describe('rollback target', () => {
  it('inverts only the ids the failed apply actually moved', () => {
    const rollback = rollbackTarget(target(['aaaa'], ['bbbb', 'cccc']), ['bbbb']);

    expect(rollback.enabled).toEqual(['bbbb']);
    expect(rollback.disabled).toEqual([]);
  });

  it('inverts an enable back to a disable', () => {
    const rollback = rollbackTarget(target(['aaaa'], []), ['aaaa']);

    expect(rollback.disabled).toEqual(['aaaa']);
    expect(rollback.enabled).toEqual([]);
  });

  it('is empty when the failed apply moved nothing', () => {
    const rollback = rollbackTarget(target([], ['aaaa']), []);

    expect(rollback).toEqual({ enabled: [], disabled: [], allOutsideSuspectsEnabled: true });
  });
});
