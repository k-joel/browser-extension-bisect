import { describe, expect, it } from 'vitest';
import {
  buildPickerRows,
  compareByNameThenId,
  formatIneligibleReason,
  formatSideSurface,
  formatToggleMode,
  initialsFor,
  matchesSearch,
} from '@/entrypoints/sidepanel/presentation';
import type { CandidateExtension, CapabilityReport, IneligibleExtension } from '@/utils/bisect/domain';

const CHROME: CapabilityReport = {
  browserName: 'chrome',
  canAutoToggle: true,
  selfInstallType: 'normal',
  sideSurface: 'side-panel',
};

const FIREFOX: CapabilityReport = {
  browserName: 'firefox',
  canAutoToggle: false,
  selfInstallType: 'normal',
  sideSurface: 'sidebar',
};

function candidate(id: string, name: string): CandidateExtension {
  return {
    id,
    name,
    version: '1.0.0',
    description: '',
    enabledAtStart: true,
    mayDisable: true,
    installType: 'normal',
    type: 'extension',
    icons: [],
  };
}

function ineligible(id: string, name: string, reason: IneligibleExtension['reason']): IneligibleExtension {
  return { id, name, version: '1.0.0', type: 'extension', reason };
}

describe('initials', () => {
  it('takes the first letter of the first two words', () => {
    expect(initialsFor('Alpha Blocker')).toBe('AB');
    expect(initialsFor('Bravo')).toBe('B');
    expect(initialsFor('uBlock Origin Extra')).toBe('UO');
  });

  it('collapses extra whitespace and tolerates an empty name', () => {
    expect(initialsFor('   Dark    Reader  ')).toBe('DR');
    expect(initialsFor('   ')).toBe('?');
  });
});

describe('search matching', () => {
  it('matches case-insensitively on a substring', () => {
    expect(matchesSearch('Dark Reader', 'dark')).toBe(true);
    expect(matchesSearch('Dark Reader', 'READ')).toBe(true);
    expect(matchesSearch('Dark Reader', 'light')).toBe(false);
  });

  it('treats an empty or whitespace query as no filter', () => {
    expect(matchesSearch('Dark Reader', '')).toBe(true);
    expect(matchesSearch('Dark Reader', '   ')).toBe(true);
  });
});

describe('reason labels', () => {
  it('labels every ineligible reason for the UI', () => {
    expect(formatIneligibleReason('theme-or-app')).toBe('Theme or app');
    expect(formatIneligibleReason('disabled-at-start')).toBe('Disabled at start');
    expect(formatIneligibleReason('policy-locked')).toBe('Policy-locked');
    expect(formatIneligibleReason('self')).toBe('This add-on');
  });
});

describe('capability wording', () => {
  it('names the automated and assisted modes', () => {
    expect(formatToggleMode(CHROME)).toContain('Automatic');
    expect(formatToggleMode(FIREFOX)).toContain('Assisted');
  });

  it('names the side surface per browser', () => {
    expect(formatSideSurface(CHROME)).toBe('Side panel');
    expect(formatSideSurface(FIREFOX)).toBe('Sidebar');
  });
});

describe('picker rows', () => {
  it('builds one row per eligible candidate in name order', () => {
    const rows = buildPickerRows([candidate('bbbb', 'Bravo'), candidate('aaaa', 'Alpha')], []);

    expect(rows.map((row) => [row.name, row.excluded])).toEqual([
      ['Alpha', false],
      ['Bravo', false],
    ]);
  });

  it('marks configured exclusions on eligible rows without needing the ineligible list', () => {
    const rows = buildPickerRows([candidate('aaaa', 'Alpha'), candidate('bbbb', 'Bravo')], ['bbbb']);

    expect(rows).toEqual([
      { id: 'aaaa', name: 'Alpha', version: '1.0.0', excluded: false },
      { id: 'bbbb', name: 'Bravo', version: '1.0.0', excluded: true },
    ]);
  });

  it('never renders an intrinsically ineligible extension as a pickable row', () => {
    const rows = buildPickerRows([candidate('aaaa', 'Alpha')], []);
    const unavailable = [
      ineligible('bbbb', 'Bravo', 'theme-or-app'),
      ineligible('cccc', 'Charlie', 'disabled-at-start'),
    ];

    expect(rows.map((row) => row.id)).toEqual(['aaaa']);
    expect(unavailable.map((entry) => entry.id)).toEqual(['bbbb', 'cccc']);
  });
});

describe('row ordering', () => {
  it('sorts by name and then by id', () => {
    expect(compareByNameThenId({ name: 'Alpha', id: 'zzz' }, { name: 'Alpha', id: 'aaa' })).toBeGreaterThan(0);
    expect(compareByNameThenId({ name: 'Alpha', id: 'a' }, { name: 'Bravo', id: 'a' })).toBeLessThan(0);
    expect(compareByNameThenId({ name: 'Alpha', id: 'a' }, { name: 'Alpha', id: 'a' })).toBe(0);
  });
});
