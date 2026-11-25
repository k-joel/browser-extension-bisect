import type {
  CandidateExtension,
  CandidateLists,
  DriftReport,
  EnabledStateMap,
  ExtensionKind,
  IneligibleExtension,
  ManagementEvent,
  ManagementPort,
  ManualBatch,
  RestoreError,
  RestoreResult,
  TargetState,
  ToggleError,
  ToggleErrorCode,
  ToggleResult,
} from './domain';

export interface ManagementExtensionInfo {
  id: string;
  name: string;
  version: string;
  description?: string;
  enabled: boolean;
  mayDisable: boolean;
  installType: string;
  type: string;
  icons?: { url: string; size: number }[];
}

export interface ManagementEventSurface<T> {
  addListener(listener: (value: T) => void): void;
  removeListener(listener: (value: T) => void): void;
}

export interface ManagementSurface {
  getAll(): Promise<ManagementExtensionInfo[]>;
  getSelf(): Promise<ManagementExtensionInfo>;
  setEnabled(id: string, enabled: boolean): Promise<void>;
  onEnabled: ManagementEventSurface<ManagementExtensionInfo>;
  onDisabled: ManagementEventSurface<ManagementExtensionInfo>;
  onInstalled: ManagementEventSurface<ManagementExtensionInfo>;
  onUninstalled: ManagementEventSurface<string>;
}

export interface PortDependencies {
  management: ManagementSurface;
}

export const NOT_IMPLEMENTED_MESSAGE = 'not implemented';

export interface CandidateFilterOptions {
  selfId: string;
}

function toCandidate(info: ManagementExtensionInfo): CandidateExtension {
  return {
    id: info.id,
    name: info.name,
    version: info.version,
    description: info.description ?? '',
    enabledAtStart: info.enabled,
    mayDisable: info.mayDisable,
    installType: info.installType,
    type: info.type as ExtensionKind,
    icons: info.icons ?? [],
  };
}

export function resolveIneligibleReason(
  info: ManagementExtensionInfo,
  options: CandidateFilterOptions,
): IneligibleExtension['reason'] | null {
  if (info.id === options.selfId) return 'self';
  if (info.type !== 'extension') return 'theme-or-app';
  if (!info.enabled) return 'disabled-at-start';
  if (!info.mayDisable) return 'policy-locked';
  return null;
}

export function compareCandidates(left: { name: string; id: string }, right: { name: string; id: string }): number {
  const byName = left.name.localeCompare(right.name, 'en', { sensitivity: 'variant' });
  if (byName !== 0) return byName;
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export function partitionCandidates(infos: ManagementExtensionInfo[], options: CandidateFilterOptions): CandidateLists {
  const eligible: CandidateExtension[] = [];
  const ineligible: IneligibleExtension[] = [];

  for (const info of infos) {
    const reason = resolveIneligibleReason(info, options);
    if (reason === null) {
      eligible.push(toCandidate(info));
    } else {
      ineligible.push({
        id: info.id,
        name: info.name,
        version: info.version,
        type: info.type as ExtensionKind,
        reason,
      });
    }
  }

  eligible.sort(compareCandidates);
  ineligible.sort(compareCandidates);
  return { eligible, ineligible };
}

export async function listSharedCandidates(management: ManagementSurface): Promise<CandidateLists> {
  const [all, self] = await Promise.all([management.getAll(), management.getSelf()]);
  return partitionCandidates(all, { selfId: self.id });
}

function toManagementEvent(info: ManagementExtensionInfo, enabled: boolean): ManagementEvent {
  return enabled
    ? { type: 'enabled', extensionId: info.id, name: info.name }
    : { type: 'disabled', extensionId: info.id, name: info.name };
}

export function subscribeToManagementEvents(
  management: ManagementSurface,
  listener: (event: ManagementEvent) => void,
): () => void {
  const onEnabled = (info: ManagementExtensionInfo) => listener(toManagementEvent(info, true));
  const onDisabled = (info: ManagementExtensionInfo) => listener(toManagementEvent(info, false));
  const onInstalled = (info: ManagementExtensionInfo) =>
    listener({
      type: 'installed',
      extensionId: info.id,
      name: info.name,
      version: info.version,
      enabled: info.enabled,
    });
  const onUninstalled = (id: string) => listener({ type: 'uninstalled', extensionId: id });

  management.onEnabled.addListener(onEnabled);
  management.onDisabled.addListener(onDisabled);
  management.onInstalled.addListener(onInstalled);
  management.onUninstalled.addListener(onUninstalled);

  return () => {
    management.onEnabled.removeListener(onEnabled);
    management.onDisabled.removeListener(onDisabled);
    management.onInstalled.removeListener(onInstalled);
    management.onUninstalled.removeListener(onUninstalled);
  };
}

export function createNotImplementedWatchEvents(): Pick<ManagementPort, 'watchEvents'> {
  const throwSync = (): never => {
    throw new Error(NOT_IMPLEMENTED_MESSAGE);
  };
  return { watchEvents: throwSync };
}

export function createNotImplementedMethods(): Pick<
  ManagementPort,
  'applyTargetState' | 'verifyState' | 'restore' | 'watchEvents'
> {
  const reject = () => Promise.reject(new Error(NOT_IMPLEMENTED_MESSAGE));
  return {
    applyTargetState: reject,
    verifyState: reject,
    restore: reject,
    ...createNotImplementedWatchEvents(),
  };
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface ToggleErrorPattern {
  code: ToggleErrorCode;
  patterns: RegExp[];
}

/**
 * Ordered because the browser's messages overlap: a greylisted extension is also
 * refused "for policy", so the specific cause has to be recognised first. Every
 * code here is a distinct recovery, so a wrong match sends the user to the wrong
 * place — the fallback is the honest "the browser refused, we cannot fix it".
 *
 * The symbolic names (`kGestureNeededForEscalationError` and friends) are matched
 * verbatim because Chromium only carries them in the message of the error it throws,
 * and a test-mode or older build may surface the symbol rather than the sentence.
 */
const TOGGLE_ERROR_PATTERNS: readonly ToggleErrorPattern[] = [
  { code: 'manual-recovery-required', patterns: [/kCannotReEnableGreylistedError/, /greylist/i] },
  {
    code: 'needs-user-gesture',
    patterns: [/kGestureNeededForEscalationError/, /user gesture/i, /requires? a click/i, /user activation/i],
  },
  {
    code: 'extension-removed',
    patterns: [
      /kNoExtensionError/,
      /no extension with id/i,
      /no (such|matching) extension/i,
      /unknown extension/i,
      /not installed/i,
    ],
  },
  {
    code: 'policy-blocked',
    patterns: [
      /extensionmaymodifysettings/i,
      /may modify settings/i,
      /(cannot|can not|is not|not) (be )?modified/i,
      /blocked by (the )?policy/i,
      /managed by your (administrator|organisation|organization)/i,
      /policy/i,
    ],
  },
  {
    code: 'unsupported-requirements',
    patterns: [/requirements/i, /new version of the browser/i, /unsupported/i],
  },
];

/**
 * Maps a `setEnabled` rejection onto the documented error-code vocabulary. The
 * unknown case is `unsupported-requirements`: the vocabulary has no separate
 * "unknown" code, and that code already means "the browser refused and the add-on
 * cannot fix it", which is what an unrecognised message tells us.
 */
export function mapToggleError(error: unknown): ToggleErrorCode {
  const message = describeError(error);
  for (const entry of TOGGLE_ERROR_PATTERNS) {
    if (entry.patterns.some((pattern) => pattern.test(message))) return entry.code;
  }
  return 'unsupported-requirements';
}

export function isManualBatch(result: ToggleResult | ManualBatch): result is ManualBatch {
  return 'enableIds' in result && !('applied' in result);
}

export function targetEnabledMap(target: TargetState): EnabledStateMap {
  const map: EnabledStateMap = {};
  for (const id of target.enabled) map[id] = true;
  for (const id of target.disabled) map[id] = false;
  return map;
}

/**
 * The state to apply to undo a partially applied target: exactly the ids this apply
 * moved, each back to the value the target replaced. Re-applying the previous trial's
 * whole target would retry the toggle that just failed and reach for ids this apply
 * never touched, so the rollback is scoped to what actually changed.
 */
export function rollbackTarget(target: TargetState, applied: readonly string[]): TargetState {
  const desired = targetEnabledMap(target);
  const enabled: string[] = [];
  const disabled: string[] = [];
  for (const extensionId of applied) {
    const wanted = desired[extensionId];
    if (wanted === true) disabled.push(extensionId);
    else if (wanted === false) enabled.push(extensionId);
  }
  return { enabled, disabled, allOutsideSuspectsEnabled: true };
}

export interface ScopedTarget {
  expected: EnabledStateMap;
  outsideTrialIds: string[];
}

/**
 * The full map the trial expects: its own batch, plus every candidate the trial left
 * outside the partition. Those must stay enabled for the search to stay valid, and
 * naming them is what lets the comparison report a toggle *outside* the trial.
 */
export function targetExpectedMap(target: TargetState): ScopedTarget {
  const expected = targetEnabledMap(target);
  const outsideTrialIds = [...(target.outsideTrialIds ?? [])];
  for (const id of outsideTrialIds) {
    if (expected[id] === undefined) expected[id] = true;
  }
  return { expected, outsideTrialIds };
}

export interface VerifyStateOptions {
  /**
   * Decides whether a target mismatch is a toggle the trial actually asked for. The
   * automated adapters asked for every target change, so they omit it; the assisted
   * adapter reports a mismatch it never requested as an unexpected toggle.
   */
  wasRequested?: (extensionId: string, enabled: boolean) => boolean;
}

/**
 * The one drift comparison both adapters report. Every category the panel renders is
 * derived here, so Chrome and Firefox cannot disagree about what drifted.
 */
export function summarizeDrift(
  infos: ManagementExtensionInfo[],
  target: TargetState,
  options: VerifyStateOptions = {},
): DriftReport {
  const { expected, outsideTrialIds } = targetExpectedMap(target);
  const outside = new Set(outsideTrialIds);
  const actual: EnabledStateMap = {};
  const missingIds: string[] = [];
  const pendingManualToggles: string[] = [];
  const unexpectedToggles: string[] = [];

  for (const [extensionId, wanted] of Object.entries(expected)) {
    const info = infos.find((entry) => entry.id === extensionId);
    if (info === undefined) {
      missingIds.push(extensionId);
      continue;
    }
    actual[extensionId] = info.enabled;
    if (info.enabled === wanted) continue;

    const requested = options.wasRequested?.(extensionId, wanted) ?? true;
    if (outside.has(extensionId) || !requested) unexpectedToggles.push(extensionId);
    else pendingManualToggles.push(extensionId);
  }

  return {
    expected,
    actual,
    pendingManualToggles,
    unexpectedToggles,
    missingIds,
    inSync: pendingManualToggles.length === 0 && unexpectedToggles.length === 0 && missingIds.length === 0,
  };
}

/**
 * The ids whose current state differs from the target, split by the direction the
 * user (or the adapter) still has to move them. A disappeared id is skipped: no
 * toggle can fix it, and `verifyState` reports it as missing instead.
 */
export function diffAgainstTarget(
  infos: ManagementExtensionInfo[],
  target: TargetState,
): { enableIds: string[]; disableIds: string[] } {
  const desired = targetEnabledMap(target);
  const enableIds: string[] = [];
  const disableIds: string[] = [];

  for (const [extensionId, enabled] of Object.entries(desired)) {
    const current = infos.find((info) => info.id === extensionId);
    if (current === undefined || current.enabled === enabled) continue;
    if (enabled) enableIds.push(extensionId);
    else disableIds.push(extensionId);
  }

  return { enableIds, disableIds };
}

export async function applySharedTargetState(
  management: ManagementSurface,
  target: TargetState,
): Promise<ToggleResult> {
  const before = await management.getAll();
  const desired = targetEnabledMap(target);
  const applied: string[] = [];
  const errors: ToggleError[] = [];

  for (const [extensionId, enabled] of Object.entries(desired)) {
    const current = before.find((info) => info.id === extensionId);
    if (current === undefined || current.enabled === enabled) continue;
    try {
      await management.setEnabled(extensionId, enabled);
      applied.push(extensionId);
    } catch (error) {
      errors.push({ extensionId, code: mapToggleError(error), message: describeError(error) });
    }
  }

  return { applied, errors, ok: errors.length === 0 };
}

export async function verifySharedState(
  management: ManagementSurface,
  expected: TargetState,
  options: VerifyStateOptions = {},
): Promise<DriftReport> {
  return summarizeDrift(await management.getAll(), expected, options);
}

export async function restoreSharedState(
  management: ManagementSurface,
  original: EnabledStateMap,
): Promise<RestoreResult> {
  const current = await management.getAll();
  const restoredIds: string[] = [];
  const manualIds: string[] = [];
  const errors: RestoreError[] = [];

  for (const [extensionId, enabled] of Object.entries(original)) {
    const info = current.find((entry) => entry.id === extensionId);
    if (info === undefined) {
      manualIds.push(extensionId);
      continue;
    }
    if (info.enabled === enabled) continue;
    try {
      await management.setEnabled(extensionId, enabled);
      restoredIds.push(extensionId);
    } catch (error) {
      errors.push({ extensionId, code: mapToggleError(error), message: describeError(error) });
    }
  }

  return {
    restoredIds,
    manualIds,
    errors,
    complete: errors.length === 0 && manualIds.length === 0,
  };
}
