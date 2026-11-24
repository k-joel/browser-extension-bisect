import type { CandidateExtension, CapabilityReport, IneligibleReason } from '@/utils/bisect/domain';

const REASON_LABELS: Record<IneligibleReason, string> = {
  'theme-or-app': 'Theme or app',
  'disabled-at-start': 'Disabled at start',
  'policy-locked': 'Policy-locked',
  self: 'This add-on',
};

export interface PickerRow {
  id: string;
  name: string;
  version: string;
  excluded: boolean;
}

export function formatIneligibleReason(reason: IneligibleReason): string {
  return REASON_LABELS[reason];
}

export function formatToggleMode(capability: CapabilityReport): string {
  return capability.canAutoToggle
    ? 'Automatic — the add-on toggles extensions for you'
    : 'Assisted — you apply each batch in the browser’s add-on manager';
}

export function formatSideSurface(capability: CapabilityReport): string {
  return capability.sideSurface === 'sidebar' ? 'Sidebar' : 'Side panel';
}

export function compareByNameThenId(left: { name: string; id: string }, right: { name: string; id: string }): number {
  const byName = left.name.localeCompare(right.name, 'en', { sensitivity: 'variant' });
  if (byName !== 0) return byName;
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export function buildPickerRows(eligible: CandidateExtension[], excludedIds: readonly string[]): PickerRow[] {
  return eligible
    .map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      version: candidate.version,
      excluded: excludedIds.includes(candidate.id),
    }))
    .sort(compareByNameThenId);
}

export function initialsFor(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  if (words.length === 0) return '?';
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

export function matchesSearch(name: string, query: string): boolean {
  const trimmed = query.trim();
  if (trimmed.length === 0) return true;
  return name.toLowerCase().includes(trimmed.toLowerCase());
}
