import { describe, expect, it } from 'vitest';
import { DEFAULT_BISECT_CONFIG } from '@/utils/bisect/config';
import type {
  BisectConfig,
  BisectEvent,
  BisectEventPayloads,
  BisectEventType,
  BisectLog,
  CandidateExtension,
  CapabilityReport,
  DriftReport,
  EnabledStateMap,
  IneligibleExtension,
  IneligibleReason,
  ManagementEvent,
  ManagementPort,
  ManualBatch,
  ReplayResult,
  RestoreResult,
  SessionStatus,
  SessionView,
  TargetState,
  ToggleError,
  ToggleErrorCode,
  ToggleResult,
  Trial,
  Verdict,
} from '@/utils/bisect/domain';

const EVENT_TYPES: BisectEventType[] = [
  'session-started',
  'baseline-recorded',
  'trial-started',
  'trial-applied',
  'verdict-recorded',
  'trial-retried',
  'verdict-undone',
  'session-paused',
  'session-resumed',
  'session-completed',
  'session-inconclusive',
  'session-reset',
];

const SESSION_STATUSES: SessionStatus[] = [
  'preparing',
  'baseline',
  'trial',
  'applying',
  'awaiting-verdict',
  'awaiting-manual-toggle',
  'paused',
  'completed',
  'inconclusive',
  'aborted',
  'restored',
];

const INELIGIBLE_REASONS: IneligibleReason[] = [
  'theme-or-app',
  'disabled-at-start',
  'policy-locked',
  'self',
  'user-excluded',
];

const TOGGLE_ERROR_CODES: ToggleErrorCode[] = [
  'policy-blocked',
  'needs-user-gesture',
  'manual-recovery-required',
  'extension-removed',
  'unsupported-requirements',
];

describe('bisect domain surface', () => {
  it('declares exactly the twelve documented event types', () => {
    expect(EVENT_TYPES).toHaveLength(12);
    expect(new Set(EVENT_TYPES).size).toBe(12);
  });

  it('declares the eleven documented session statuses', () => {
    expect(SESSION_STATUSES).toHaveLength(11);
  });

  it('covers every ineligible reason', () => {
    expect(INELIGIBLE_REASONS).toEqual(['theme-or-app', 'disabled-at-start', 'policy-locked', 'self', 'user-excluded']);
  });

  it('covers the five documented toggle error codes', () => {
    expect(TOGGLE_ERROR_CODES).toHaveLength(5);
  });

  it('carries the test tab as a nullable url binding', () => {
    const config: BisectConfig = { schemaVersion: 1, excludedExtensionIds: [], testTab: { tabId: 4, url: null } };
    expect(config.testTab?.url).toBeNull();
    expect(DEFAULT_BISECT_CONFIG.testTab).toBeNull();
  });

  it('keeps event payloads discriminated by type', () => {
    const started: BisectEvent = {
      type: 'session-started',
      at: 1,
      schemaVersion: 1,
      payload: {
        candidateOrder: [],
        capability: {
          browserName: 'chrome',
          canAutoToggle: true,
          selfInstallType: 'normal',
          sideSurface: 'side-panel',
        },
        baselineMode: 'auto',
        testTab: null,
      },
    };
    const payloadKeys: (keyof BisectEventPayloads)[] = ['session-started', 'verdict-recorded', 'session-reset'];
    expect(started.type).toBe('session-started');
    expect(payloadKeys).toContain(started.type);
  });

  it('exposes every entity the later slices consume', () => {
    const candidate: CandidateExtension = {
      id: 'aaaa',
      name: 'Alpha',
      version: '1.0.0',
      description: '',
      enabledAtStart: true,
      mayDisable: true,
      installType: 'normal',
      type: 'extension',
      icons: [],
    };
    const ineligible: IneligibleExtension = {
      id: 'bbbb',
      name: 'Bravo',
      version: '1.0.0',
      type: 'theme',
      reason: 'theme-or-app',
    };
    const verdict: Verdict = 'gone';
    const target: TargetState = { enabled: ['aaaa'], disabled: ['bbbb'], allOutsideSuspectsEnabled: true };
    const enabledMap: EnabledStateMap = { aaaa: true, bbbb: false };
    const toggleError: ToggleError = { extensionId: 'bbbb', code: 'policy-blocked', message: 'locked' };
    const toggleResult: ToggleResult = { applied: ['aaaa'], errors: [toggleError], ok: false };
    const manualBatch: ManualBatch = { enableIds: ['aaaa'], disableIds: ['bbbb'] };
    const drift: DriftReport = {
      expected: enabledMap,
      actual: enabledMap,
      pendingManualToggles: [],
      unexpectedToggles: [],
      missingIds: [],
      inSync: true,
    };
    const restore: RestoreResult = { restoredIds: ['bbbb'], manualIds: [], errors: [], complete: true };
    const managementEvent: ManagementEvent = { type: 'uninstalled', extensionId: 'cccc' };
    const capability: CapabilityReport = {
      browserName: 'firefox',
      canAutoToggle: false,
      selfInstallType: 'normal',
      sideSurface: 'sidebar',
    };
    const trial: Trial = {
      round: 1,
      enabledIds: ['aaaa'],
      disabledIds: ['bbbb'],
      targetState: target,
      verdict,
      appliedAt: 1,
      errors: [],
    };
    const view: SessionView = {
      sessionId: 's1',
      status: 'awaiting-verdict',
      capability,
      candidateOrder: [candidate],
      originalEnabledIds: ['aaaa', 'bbbb'],
      suspects: ['aaaa'],
      cleared: ['bbbb'],
      currentTrial: trial,
      trials: [trial],
      culpritId: null,
      ambiguityIds: [],
      testTab: null,
      progress: { trialNumber: 1, estimatedTrials: 3, suspectCount: 1 },
      createdAt: 1,
      updatedAt: 2,
    };
    const log: BisectLog = { schemaVersion: 1, sessionId: 's1', events: [] };
    const replay: ReplayResult = {
      culpritId: 'aaaa',
      ambiguityIds: [],
      trials: [],
      batchDifferences: [],
      validationError: null,
    };

    expect([
      ineligible.reason,
      toggleResult.errors.length,
      manualBatch.enableIds.length,
      drift.inSync,
      restore.complete,
      managementEvent.type,
      view.status,
      log.events.length,
      replay.culpritId,
    ]).toEqual(['theme-or-app', 1, 1, true, true, 'uninstalled', 'awaiting-verdict', 0, 'aaaa']);
  });

  it('declares the full management port contract', () => {
    const methodNames: (keyof ManagementPort)[] = [
      'getCapabilities',
      'listCandidates',
      'applyTargetState',
      'verifyState',
      'restore',
      'watchEvents',
    ];
    expect(methodNames).toHaveLength(6);
  });
});
