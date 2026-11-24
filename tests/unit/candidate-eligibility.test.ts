import { describe, expect, it } from 'vitest';
import type { ManagementExtensionInfo } from '@/utils/bisect/management-port';
import { compareCandidates, partitionCandidates } from '@/utils/bisect/management-port';

const SELF_ID = 'self-extension-id';

function makeInfo(overrides: Partial<ManagementExtensionInfo> & { id: string; name: string }): ManagementExtensionInfo {
  return {
    version: '1.0.0',
    description: '',
    enabled: true,
    mayDisable: true,
    installType: 'normal',
    type: 'extension',
    icons: [],
    ...overrides,
  };
}

const FILTER = { selfId: SELF_ID };

describe('candidate eligibility', () => {
  it('accepts an enabled regular extension that is not self and is disableable', () => {
    const { eligible, ineligible } = partitionCandidates([makeInfo({ id: 'aaaa', name: 'Alpha' })], FILTER);

    expect(ineligible).toEqual([]);
    expect(eligible.map((candidate) => candidate.id)).toEqual(['aaaa']);
  });

  it('rejects a theme with reason theme-or-app', () => {
    const { eligible, ineligible } = partitionCandidates(
      [makeInfo({ id: 'theme-id', name: 'Night Theme', type: 'theme' })],
      FILTER,
    );

    expect(eligible).toEqual([]);
    expect(ineligible).toEqual([
      { id: 'theme-id', name: 'Night Theme', version: '1.0.0', type: 'theme', reason: 'theme-or-app' },
    ]);
  });

  it('rejects a hosted app with reason theme-or-app', () => {
    const { ineligible } = partitionCandidates(
      [makeInfo({ id: 'app-id', name: 'Chat App', type: 'hosted_app' })],
      FILTER,
    );

    expect(ineligible.map((entry) => entry.reason)).toEqual(['theme-or-app']);
  });

  it('rejects the bisect extension itself with reason self', () => {
    const { eligible, ineligible } = partitionCandidates([makeInfo({ id: SELF_ID, name: 'Extension Bisect' })], FILTER);

    expect(eligible).toEqual([]);
    expect(ineligible.map((entry) => entry.reason)).toEqual(['self']);
  });

  it('rejects an extension that is disabled at start with reason disabled-at-start', () => {
    const { eligible, ineligible } = partitionCandidates(
      [makeInfo({ id: 'off-id', name: 'Dormant Ext', enabled: false })],
      FILTER,
    );

    expect(eligible).toEqual([]);
    expect(ineligible.map((entry) => entry.reason)).toEqual(['disabled-at-start']);
  });

  it('rejects a policy-locked extension with reason policy-locked', () => {
    const { eligible, ineligible } = partitionCandidates(
      [makeInfo({ id: 'locked-id', name: 'Locked Ext', mayDisable: false })],
      FILTER,
    );

    expect(eligible).toEqual([]);
    expect(ineligible.map((entry) => entry.reason)).toEqual(['policy-locked']);
  });

  it('keeps a user exclusion out of eligibility so eligible is the single pickable list', () => {
    const { eligible, ineligible } = partitionCandidates([makeInfo({ id: 'excluded-id', name: 'Excluded Ext' })], {
      selfId: SELF_ID,
    });

    expect(eligible.map((candidate) => candidate.id)).toEqual(['excluded-id']);
    expect(ineligible).toEqual([]);
  });

  it('reports self before any other failing clause', () => {
    const { ineligible } = partitionCandidates(
      [makeInfo({ id: SELF_ID, name: 'Extension Bisect', type: 'theme', enabled: false, mayDisable: false })],
      FILTER,
    );

    expect(ineligible.map((entry) => entry.reason)).toEqual(['self']);
  });

  it('reports theme-or-app before disabled-at-start', () => {
    const { ineligible } = partitionCandidates(
      [makeInfo({ id: 'theme-id', name: 'Night Theme', type: 'theme', enabled: false })],
      FILTER,
    );

    expect(ineligible.map((entry) => entry.reason)).toEqual(['theme-or-app']);
  });

  it('reports disabled-at-start before policy-locked', () => {
    const { ineligible } = partitionCandidates(
      [makeInfo({ id: 'off-locked', name: 'Off Locked', enabled: false, mayDisable: false })],
      FILTER,
    );

    expect(ineligible.map((entry) => entry.reason)).toEqual(['disabled-at-start']);
  });

  it('splits a mixed install list into eligible and ineligible without dropping anything', () => {
    const infos = [
      makeInfo({ id: 'zzz', name: 'Zeta' }),
      makeInfo({ id: SELF_ID, name: 'Extension Bisect' }),
      makeInfo({ id: 'aaa', name: 'Alpha' }),
      makeInfo({ id: 'theme', name: 'Theme', type: 'theme' }),
      makeInfo({ id: 'off', name: 'Off Ext', enabled: false }),
      makeInfo({ id: 'locked', name: 'Locked Ext', mayDisable: false }),
    ];

    const { eligible, ineligible } = partitionCandidates(infos, { selfId: SELF_ID });

    expect(eligible.map((candidate) => candidate.name)).toEqual(['Alpha', 'Zeta']);
    expect(ineligible.map((entry) => [entry.name, entry.reason])).toEqual([
      ['Extension Bisect', 'self'],
      ['Locked Ext', 'policy-locked'],
      ['Off Ext', 'disabled-at-start'],
      ['Theme', 'theme-or-app'],
    ]);
    expect(eligible.length + ineligible.length).toBe(infos.length);
  });
});

describe('candidate ordering', () => {
  it('orders by display name and breaks ties on id', () => {
    const infos = [
      makeInfo({ id: 'cc', name: 'Beta' }),
      makeInfo({ id: 'bb', name: 'Alpha' }),
      makeInfo({ id: 'aa', name: 'Alpha' }),
      makeInfo({ id: 'ab', name: 'Gamma' }),
    ];

    const { eligible } = partitionCandidates(infos, FILTER);

    expect(eligible.map((candidate) => candidate.id)).toEqual(['aa', 'bb', 'cc', 'ab']);
  });

  it('is independent of the incoming list order', () => {
    const names = ['Delta', 'Alpha', 'Charlie', 'Bravo'];
    const forward = partitionCandidates(
      names.map((name, index) => makeInfo({ id: `id-${index}`, name })),
      FILTER,
    );
    const backward = partitionCandidates(
      [...names].reverse().map((name, index) => makeInfo({ id: `id-${names.length - index - 1}`, name })),
      FILTER,
    );

    expect(forward.eligible.map((candidate) => candidate.id)).toEqual(
      backward.eligible.map((candidate) => candidate.id),
    );
  });

  it('orders ineligible extensions by the same key', () => {
    const { ineligible } = partitionCandidates(
      [makeInfo({ id: 'z', name: 'Zeta', type: 'theme' }), makeInfo({ id: 'y', name: 'Alpha', mayDisable: false })],
      FILTER,
    );

    expect(ineligible.map((entry) => entry.name)).toEqual(['Alpha', 'Zeta']);
  });

  it('compareCandidates falls back to a byte-order id comparison', () => {
    expect(compareCandidates({ name: 'Same', id: 'bbb' }, { name: 'Same', id: 'aaa' })).toBeGreaterThan(0);
    expect(compareCandidates({ name: 'Same', id: 'aaa' }, { name: 'Same', id: 'aaa' })).toBe(0);
  });
});
