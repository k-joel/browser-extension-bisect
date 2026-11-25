import type { CandidateExtension, InstalledExtension, SnapshotChange, SnapshotChangeKind } from './domain';

/**
 * Compares the immutable `session-started` snapshot against what the browser reports now.
 *
 * The result is a *report*, never a merge: nothing here can add an extension to the
 * snapshot, because the snapshot is the seed both the live search and every replay
 * partition from. A newly installed extension is therefore visible to the user and
 * invisible to the search.
 */
export function snapshotChanges(
  snapshot: readonly CandidateExtension[],
  installed: readonly InstalledExtension[],
): SnapshotChange[] {
  const byId = new Map(installed.map((entry) => [entry.id, entry]));
  const snapshotIds = new Set(snapshot.map((entry) => entry.id));
  const changes: SnapshotChange[] = [];

  for (const candidate of snapshot) {
    const current = byId.get(candidate.id);
    if (current === undefined) {
      changes.push({
        kind: 'removed',
        extensionId: candidate.id,
        name: candidate.name,
        snapshotVersion: candidate.version,
        currentVersion: null,
      });
      continue;
    }
    if (current.version === candidate.version) continue;
    changes.push({
      kind: 'updated',
      extensionId: candidate.id,
      name: current.name,
      snapshotVersion: candidate.version,
      currentVersion: current.version,
    });
  }

  for (const entry of installed) {
    if (snapshotIds.has(entry.id)) continue;
    changes.push({
      kind: 'installed',
      extensionId: entry.id,
      name: entry.name,
      snapshotVersion: null,
      currentVersion: entry.version,
    });
  }

  return changes;
}

const PAUSING_KINDS: readonly SnapshotChangeKind[] = ['updated', 'removed'];

/**
 * An update can change what the candidate does, and a removal takes it out of the
 * partition entirely, so both invalidate the question the open trial is asking. An
 * install changes nothing the search depends on, so it is only ever a warning.
 */
export function isPausingChange(change: SnapshotChange): boolean {
  return PAUSING_KINDS.includes(change.kind);
}

export function pausingChanges(changes: readonly SnapshotChange[]): SnapshotChange[] {
  return changes.filter(isPausingChange);
}

export function describeSnapshotChanges(changes: readonly SnapshotChange[]): string {
  const parts = changes.map((change) => {
    if (change.kind === 'removed') return `${change.name} is no longer installed`;
    if (change.kind === 'updated') {
      return `${change.name} changed from version ${change.snapshotVersion ?? 'unknown'} to ${change.currentVersion ?? 'unknown'}`;
    }
    return `${change.name} was installed`;
  });
  return `The browser changed under this session: ${parts.join(', ')}.`;
}
