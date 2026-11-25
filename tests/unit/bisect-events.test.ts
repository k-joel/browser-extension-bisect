import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type {
  BisectEvent,
  BisectEventPayloads,
  BisectEventType,
  BisectLog,
  CandidateExtension,
  CapabilityReport,
} from '@/utils/bisect/domain';
import {
  appendEvent,
  BISECT_LOG_KEY,
  createEmptyLog,
  LOG_EVENT_CAP,
  readBisectLog,
  reduceLog,
  writeBisectLog,
} from '@/utils/bisect/events';

const CAPABILITY: CapabilityReport = {
  browserName: 'chrome',
  canAutoToggle: true,
  selfInstallType: 'normal',
  sideSurface: 'side-panel',
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

const CANDIDATES = [candidate('aaaa', 'Alpha'), candidate('bbbb', 'Bravo'), candidate('cccc', 'Charlie')];

let clock = 1000;

function event<Type extends BisectEventType>(type: Type, payload: BisectEventPayloads[Type]): BisectEvent {
  clock += 1;
  return { type, at: clock, schemaVersion: 1, payload } as BisectEvent;
}

function logOf(events: BisectEvent[]): BisectLog {
  return { schemaVersion: 1, sessionId: 'session-1', events };
}

const STARTED = event('session-started', {
  candidateOrder: CANDIDATES,
  capability: CAPABILITY,
  baselineMode: 'auto',
  testTab: { tabId: 7, url: null },
});

describe('reduceLog session start', () => {
  it('returns null for an empty or missing log', () => {
    expect(reduceLog(null)).toBeNull();
    expect(reduceLog(logOf([]))).toBeNull();
  });

  it('snapshots the candidate order, the original enabled states, and the capability', () => {
    const view = reduceLog(logOf([STARTED]));

    expect(view?.sessionId).toBe('session-1');
    expect(view?.status).toBe('baseline');
    expect(view?.capability).toEqual(CAPABILITY);
    expect(view?.candidateOrder.map((entry) => entry.id)).toEqual(['aaaa', 'bbbb', 'cccc']);
    expect(view?.originalEnabledIds).toEqual(['aaaa', 'bbbb', 'cccc']);
    expect(view?.suspects).toEqual(['aaaa', 'bbbb', 'cccc']);
    expect(view?.cleared).toEqual([]);
    expect(view?.testTab).toEqual({ tabId: 7, url: null });
    expect(view?.createdAt).toBe(STARTED.at);
    expect(view?.updatedAt).toBe(STARTED.at);
  });
});

describe('reduceLog baseline', () => {
  it('records a gone baseline and opens the first trial', () => {
    const view = reduceLog(logOf([STARTED, event('baseline-recorded', { mode: 'auto', verdict: 'gone' })]));

    expect(view?.status).toBe('awaiting-verdict');
    expect(view?.suspects).toEqual(['aaaa', 'bbbb', 'cccc']);
    expect(view?.culpritId).toBeNull();
    expect(view?.currentTrial).toBeNull();
  });

  it('resolves a single candidate from a gone baseline without a partition loop', () => {
    const single = event('session-started', {
      candidateOrder: [candidate('aaaa', 'Alpha')],
      capability: CAPABILITY,
      baselineMode: 'auto',
      testTab: null,
    });
    const view = reduceLog(logOf([single, event('baseline-recorded', { mode: 'auto', verdict: 'gone' })]));

    expect(view?.status).toBe('completed');
    expect(view?.culpritId).toBe('aaaa');
    expect(view?.suspects).toEqual(['aaaa']);
  });

  it('aborts a persisting baseline as a host issue', () => {
    const view = reduceLog(logOf([STARTED, event('baseline-recorded', { mode: 'auto', verdict: 'persists' })]));

    expect(view?.status).toBe('aborted');
    expect(view?.abortReason).toBe('host-issue');
    expect(view?.culpritId).toBeNull();
    expect(view?.suspects).toEqual(['aaaa', 'bbbb', 'cccc']);
  });

  /**
   * The panel starts a Firefox session as `manual` because that is the mode the start screen
   * offers, and only the attestation turns it into an `external` baseline. The recorded mode
   * is the authoritative one, so the report cannot print the manual label above the
   * Troubleshoot-Mode note.
   */
  it('lets the recorded baseline mode override the mode the session started with', () => {
    const view = reduceLog(logOf([STARTED, event('baseline-recorded', { mode: 'external', verdict: 'gone' })]));

    expect(view?.baselineMode).toBe('external');
  });

  it('keeps the started mode until a baseline is recorded', () => {
    expect(reduceLog(logOf([STARTED]))?.baselineMode).toBe('auto');
  });

  it('keeps the host-issue verdict after the abort restores every candidate', () => {
    const view = reduceLog(
      logOf([
        STARTED,
        event('baseline-recorded', { mode: 'auto', verdict: 'persists' }),
        event('session-reset', { restored: true, errors: [] }),
      ]),
    );

    expect(view?.status).toBe('aborted');
    expect(view?.abortReason).toBe('host-issue');
  });
});

describe('reduceLog trials', () => {
  const BASELINE_GONE = [
    STARTED,
    event('baseline-recorded', { mode: 'auto', verdict: 'gone' }),
    event('trial-started', { round: 1, enabledIds: ['aaaa', 'bbbb'], disabledIds: ['cccc'] }),
  ];

  it('shows the current trial while it is being applied', () => {
    const view = reduceLog(logOf(BASELINE_GONE));

    expect(view?.status).toBe('trial');
    expect(view?.currentTrial?.round).toBe(1);
    expect(view?.currentTrial?.enabledIds).toEqual(['aaaa', 'bbbb']);
    expect(view?.currentTrial?.disabledIds).toEqual(['cccc']);
    expect(view?.currentTrial?.targetState).toEqual({
      enabled: ['aaaa', 'bbbb'],
      disabled: ['cccc'],
      allOutsideSuspectsEnabled: true,
    });
    expect(view?.currentTrial?.verdict).toBeNull();
  });

  it('moves to awaiting-verdict with the toggle errors once the trial is applied', () => {
    const error = { extensionId: 'cccc', code: 'policy-blocked' as const, message: 'locked' };
    const view = reduceLog(logOf([...BASELINE_GONE, event('trial-applied', { round: 1, errors: [error] })]));

    expect(view?.status).toBe('awaiting-verdict');
    expect(view?.currentTrial?.appliedAt).not.toBeNull();
    expect(view?.currentTrial?.errors).toEqual([error]);
  });

  it('a persists verdict keeps the enabled half as the suspect pool', () => {
    const view = reduceLog(
      logOf([
        ...BASELINE_GONE,
        event('trial-applied', { round: 1, errors: [] }),
        event('verdict-recorded', { round: 1, verdict: 'persists' }),
      ]),
    );

    expect(view?.suspects).toEqual(['aaaa', 'bbbb']);
    expect(view?.cleared).toEqual(['cccc']);
    expect(view?.currentTrial?.verdict).toBe('persists');
    expect(view?.status).toBe('awaiting-verdict');
  });

  it('a gone verdict keeps the disabled half as the suspect pool', () => {
    const view = reduceLog(
      logOf([
        ...BASELINE_GONE,
        event('trial-applied', { round: 1, errors: [] }),
        event('verdict-recorded', { round: 1, verdict: 'gone' }),
      ]),
    );

    expect(view?.suspects).toEqual(['cccc']);
    expect(view?.cleared).toEqual(['aaaa', 'bbbb']);
  });

  it('completes when the lone suspect was disabled and the verdict was gone', () => {
    const view = reduceLog(
      logOf([
        STARTED,
        event('baseline-recorded', { mode: 'auto', verdict: 'gone' }),
        event('trial-started', { round: 1, enabledIds: [], disabledIds: ['aaaa'] }),
        event('trial-applied', { round: 1, errors: [] }),
        event('verdict-recorded', { round: 1, verdict: 'gone' }),
      ]),
    );

    expect(view?.status).toBe('completed');
    expect(view?.culpritId).toBe('aaaa');
    expect(view?.currentTrial?.disabledIds).toEqual(['aaaa']);
  });

  it('keeps history of every trial in order', () => {
    const view = reduceLog(
      logOf([
        ...BASELINE_GONE,
        event('trial-applied', { round: 1, errors: [] }),
        event('verdict-recorded', { round: 1, verdict: 'persists' }),
        event('trial-started', { round: 2, enabledIds: ['aaaa'], disabledIds: ['bbbb'] }),
        event('trial-applied', { round: 2, errors: [] }),
        event('verdict-recorded', { round: 2, verdict: 'gone' }),
      ]),
    );

    expect(view?.trials.map((trial) => trial.round)).toEqual([1, 2]);
    expect(view?.trials.map((trial) => trial.verdict)).toEqual(['persists', 'gone']);
    expect(view?.currentTrial?.round).toBe(2);
  });
});

describe('reduceLog corrections and interruptions', () => {
  const BASELINE_GONE = [
    STARTED,
    event('baseline-recorded', { mode: 'auto', verdict: 'gone' }),
    event('trial-started', { round: 1, enabledIds: ['aaaa'], disabledIds: ['bbbb', 'cccc'] }),
    event('trial-applied', { round: 1, errors: [] }),
    event('verdict-recorded', { round: 1, verdict: 'persists' }),
  ];

  it('trial-retried reopens the same round without a verdict', () => {
    const view = reduceLog(
      logOf([
        STARTED,
        event('baseline-recorded', { mode: 'auto', verdict: 'gone' }),
        event('trial-started', { round: 1, enabledIds: ['aaaa'], disabledIds: ['bbbb', 'cccc'] }),
        event('trial-applied', { round: 1, errors: [] }),
        event('trial-retried', { round: 1, reason: 'page did not settle' }),
      ]),
    );

    expect(view?.status).toBe('trial');
    expect(view?.currentTrial?.round).toBe(1);
    expect(view?.currentTrial?.verdict).toBeNull();
    expect(view?.currentTrial?.appliedAt).toBeNull();
    expect(view?.suspects).toEqual(['aaaa', 'bbbb', 'cccc']);
  });

  it('a retry after a recorded verdict discards it and reopens the pre-trial suspect pool', () => {
    const view = reduceLog(logOf([...BASELINE_GONE, event('trial-retried', { round: 1 })]));

    expect(view?.status).toBe('trial');
    expect(view?.currentTrial?.verdict).toBeNull();
    expect(view?.suspects).toEqual(['aaaa', 'bbbb', 'cccc']);
    expect(view?.cleared).toEqual([]);
  });

  it('verdict-undone restores the suspect pool the trial started from', () => {
    const view = reduceLog(logOf([...BASELINE_GONE, event('verdict-undone', { round: 1 })]));

    expect(view?.status).toBe('awaiting-verdict');
    expect(view?.suspects).toEqual(['aaaa', 'bbbb', 'cccc']);
    expect(view?.cleared).toEqual([]);
    expect(view?.currentTrial?.verdict).toBeNull();
  });

  it('pauses and resumes while keeping the current trial', () => {
    const drift = {
      expected: { aaaa: true },
      actual: { aaaa: false },
      pendingManualToggles: ['aaaa'],
      unexpectedToggles: [],
      missingIds: [],
      inSync: false,
    };
    const paused = reduceLog(logOf([...BASELINE_GONE, event('session-paused', { reason: 'drift', drift })]));
    expect(paused?.status).toBe('paused');

    const resumed = reduceLog(
      logOf([
        ...BASELINE_GONE,
        event('session-paused', { reason: 'drift', drift }),
        event('session-resumed', { reason: 'user' }),
      ]),
    );
    expect(resumed?.status).toBe('awaiting-verdict');
    expect(resumed?.currentTrial?.round).toBe(1);
    expect(resumed?.suspects).toEqual(['aaaa']);
  });

  it('an inconclusive outcome carries the ambiguity set', () => {
    const view = reduceLog(
      logOf([
        ...BASELINE_GONE,
        event('session-inconclusive', { ambiguityIds: ['bbbb', 'cccc'], reason: 'contradiction' }),
      ]),
    );

    expect(view?.status).toBe('inconclusive');
    expect(view?.ambiguityIds).toEqual(['bbbb', 'cccc']);
    expect(view?.culpritId).toBeNull();
  });

  it('session-completed records the culprit and leaves it disabled', () => {
    const view = reduceLog(logOf([...BASELINE_GONE, event('session-completed', { culpritId: 'aaaa' })]));

    expect(view?.status).toBe('completed');
    expect(view?.culpritId).toBe('aaaa');
  });

  it('session-reset moves to restored and keeps the restore errors for the audit', () => {
    const view = reduceLog(
      logOf([
        ...BASELINE_GONE,
        event('session-completed', { culpritId: 'aaaa' }),
        event('session-reset', {
          restored: false,
          errors: [{ extensionId: 'aaaa', code: 'manual-recovery-required', message: 'greylisted' }],
        }),
      ]),
    );

    expect(view?.status).toBe('restored');
    expect(view?.culpritId).toBe('aaaa');
  });

  it('a clean reset after a completion is restored', () => {
    const view = reduceLog(
      logOf([
        ...BASELINE_GONE,
        event('session-completed', { culpritId: 'aaaa' }),
        event('session-reset', { restored: true, errors: [] }),
      ]),
    );

    expect(view?.status).toBe('restored');
  });
});

describe('reduceLog progress and timestamps', () => {
  it('reports the trial number and the suspect count', () => {
    const view = reduceLog(
      logOf([
        STARTED,
        event('baseline-recorded', { mode: 'auto', verdict: 'gone' }),
        event('trial-started', { round: 1, enabledIds: ['aaaa'], disabledIds: ['bbbb'] }),
        event('trial-applied', { round: 1, errors: [] }),
        event('verdict-recorded', { round: 1, verdict: 'gone' }),
      ]),
    );

    expect(view?.progress).toEqual({ trialNumber: 1, estimatedTrials: 3, suspectCount: 1 });
  });

  it('derives createdAt from the first event and updatedAt from the last', () => {
    const events = [
      STARTED,
      event('baseline-recorded', { mode: 'auto', verdict: 'gone' }),
      event('baseline-recorded', { mode: 'auto', verdict: 'gone' }),
    ];
    const view = reduceLog(logOf(events));

    expect(view?.createdAt).toBe(events[0]?.at);
    expect(view?.updatedAt).toBe(events.at(-1)?.at);
  });
});

describe('bisect log storage', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('falls back to null when nothing is stored', async () => {
    await expect(readBisectLog()).resolves.toBeNull();
  });

  it('round-trips a log under local:bisectLog', async () => {
    const log = logOf([STARTED]);

    await writeBisectLog(log);

    expect(await fakeBrowser.storage.local.get('bisectLog')).toEqual({ bisectLog: log });
    await expect(readBisectLog()).resolves.toEqual(log);
    expect(BISECT_LOG_KEY).toBe('local:bisectLog');
  });

  it('creates a schema-versioned empty log for a new session', () => {
    const log = createEmptyLog('session-9');

    expect(log).toEqual({ schemaVersion: 1, sessionId: 'session-9', events: [] });
  });

  it('repairs a stored log with a missing events array', async () => {
    await fakeBrowser.storage.local.set({ bisectLog: { sessionId: 'session-1' } });

    await expect(readBisectLog()).resolves.toBeNull();
  });

  it('appends an event without mutating the input log', () => {
    const log = logOf([STARTED]);
    const next = appendEvent(log, event('baseline-recorded', { mode: 'auto', verdict: 'gone' }));

    expect(log.events).toHaveLength(1);
    expect(next.events).toHaveLength(2);
    expect(next.sessionId).toBe(log.sessionId);
  });

  it('fails closed with a storage error at the 500-event cap', () => {
    const full: BisectLog = {
      schemaVersion: 1,
      sessionId: 'session-1',
      events: Array.from({ length: LOG_EVENT_CAP }, () => event('session-resumed', { reason: 'filler' })),
    };

    expect(() => appendEvent(full, event('session-resumed', { reason: 'overflow' }))).toThrow(/500/);
    expect(full.events).toHaveLength(LOG_EVENT_CAP);
  });

  it('allows the 500th event and rejects the 501st', () => {
    const almost: BisectLog = {
      schemaVersion: 1,
      sessionId: 'session-1',
      events: Array.from({ length: LOG_EVENT_CAP - 1 }, () => event('session-resumed', { reason: 'filler' })),
    };

    const filled = appendEvent(almost, event('session-resumed', { reason: 'last' }));
    expect(filled.events).toHaveLength(LOG_EVENT_CAP);
    expect(() => appendEvent(filled, event('session-resumed', { reason: 'overflow' }))).toThrow();
  });
});
