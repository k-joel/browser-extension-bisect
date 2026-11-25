import { describe, expect, it } from 'vitest';
import {
  buildPickerRows,
  compareByNameThenId,
  formatIneligibleReason,
  formatSideSurface,
  formatToggleMode,
  formatTrialProgress,
  initialsFor,
  manualChecklistLines,
  manualInstruction,
  manualProgress,
  matchesSearch,
  resolveScreen,
} from '@/entrypoints/sidepanel/presentation';
import type { CandidateExtension, CapabilityReport, IneligibleExtension, SessionView } from '@/utils/bisect/domain';

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

function sessionView(overrides: Partial<SessionView> = {}): SessionView {
  return {
    sessionId: 's1',
    status: 'awaiting-verdict',
    capability: FIREFOX,
    baselineMode: 'manual',
    candidateOrder: [candidate('aaaa', 'Alpha'), candidate('bbbb', 'Bravo')],
    originalEnabledIds: ['aaaa', 'bbbb'],
    suspects: ['aaaa', 'bbbb'],
    cleared: [],
    currentTrial: null,
    trials: [],
    culpritId: null,
    ambiguityIds: [],
    abortReason: null,
    testTab: null,
    progress: null,
    manualBatch: null,
    pause: null,
    changes: [],
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  };
}

describe('history screen routing', () => {
  it('routes an open history to the history screen from any session screen', () => {
    const view = sessionView({ status: 'completed', culpritId: 'bbbb' });

    expect(resolveScreen({ session: view, preflightOpen: false, historyOpen: true })).toBe('history');
    expect(resolveScreen({ session: view, preflightOpen: false })).toBe('completed');
  });

  it('keeps the picker when there is no session, so the history cannot be opened empty', () => {
    expect(resolveScreen({ session: null, preflightOpen: false, historyOpen: true })).toBe('picker');
  });
});

describe('assisted trial screen routing', () => {
  it('routes a manual partition batch to the assisted trial screen', () => {
    const view = sessionView({
      status: 'awaiting-manual-toggle',
      currentTrial: {
        round: 1,
        enabledIds: ['aaaa'],
        disabledIds: ['bbbb'],
        targetState: { enabled: ['aaaa'], disabled: ['bbbb'], allOutsideSuspectsEnabled: true },
        verdict: null,
        appliedAt: 1,
        errors: [],
        manual: true,
        testTab: null,
      },
      manualBatch: { enableIds: ['aaaa'], disableIds: ['bbbb'] },
    });

    expect(resolveScreen({ session: view, preflightOpen: false })).toBe('assisted-trial');
  });

  it('keeps the assisted baseline on its own screen', () => {
    const view = sessionView({
      status: 'awaiting-manual-toggle',
      currentTrial: {
        round: 0,
        enabledIds: [],
        disabledIds: ['aaaa', 'bbbb'],
        targetState: { enabled: [], disabled: ['aaaa', 'bbbb'], allOutsideSuspectsEnabled: true },
        verdict: null,
        appliedAt: 1,
        errors: [],
        manual: true,
        testTab: null,
      },
      manualBatch: { enableIds: [], disableIds: ['aaaa', 'bbbb'] },
    });

    expect(resolveScreen({ session: view, preflightOpen: false })).toBe('assisted-baseline');
  });

  it('routes a verified manual trial to the ordinary trial screen', () => {
    const view = sessionView({
      status: 'awaiting-verdict',
      currentTrial: {
        round: 1,
        enabledIds: ['aaaa'],
        disabledIds: ['bbbb'],
        targetState: { enabled: ['aaaa'], disabled: ['bbbb'], allOutsideSuspectsEnabled: true },
        verdict: null,
        appliedAt: 1,
        errors: [],
        manual: true,
        testTab: null,
      },
    });

    expect(resolveScreen({ session: view, preflightOpen: false })).toBe('trial');
  });
});

describe('assisted trial checklists', () => {
  const CANDIDATES = [candidate('aaaa', 'Alpha'), candidate('bbbb', 'Bravo'), candidate('cccc', 'Charlie')];

  it('splits the batch into an enable and a disable checklist with names', () => {
    const rows = manualChecklistLines({ enableIds: ['aaaa', 'bbbb'], disableIds: ['cccc'] }, CANDIDATES);

    expect(rows).toEqual([
      { id: 'cccc', name: 'Charlie', target: 'Off' },
      { id: 'aaaa', name: 'Alpha', target: 'On' },
      { id: 'bbbb', name: 'Bravo', target: 'On' },
    ]);
  });

  it('reports manual progress as "n of m matched"', () => {
    const progress = manualProgress(
      { enableIds: ['aaaa', 'bbbb'], disableIds: ['cccc'] },
      {
        aaaa: true,
        bbbb: false,
        cccc: false,
      },
    );

    expect(progress.done).toBe(2);
    expect(progress.total).toBe(3);
    expect(progress.remainingIds).toEqual(['bbbb']);
    expect(progress.complete).toBe(false);
    expect(formatTrialProgress(progress)).toBe('2 of 3 matched');
  });

  it('treats a fully matched batch as complete', () => {
    const progress = manualProgress({ enableIds: ['aaaa'], disableIds: ['bbbb'] }, { aaaa: true, bbbb: false });

    expect(progress.complete).toBe(true);
    expect(formatTrialProgress(progress)).toBe('2 of 2 matched');
  });

  it('names the extensions the enable half refers to', () => {
    expect(manualInstruction({ enableIds: ['aaaa'], disableIds: ['bbbb'] }, CANDIDATES)).toBe(
      'Turn off Bravo and turn on Alpha in the Add-ons Manager.',
    );
  });
});
