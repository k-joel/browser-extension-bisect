export const FIXTURES = {
  alpha: { dir: 'fixture-alpha', name: 'Fixture Alpha' },
  bravo: { dir: 'fixture-bravo', name: 'Fixture Bravo' },
  dormant: { dir: 'fixture-dormant', name: 'Fixture Dormant' },
  theme: { dir: 'fixture-theme', name: 'Fixture Theme' },
};

export const ELIGIBLE_FIXTURES = [FIXTURES.alpha, FIXTURES.bravo];

/**
 * Both browsers install the dormant fixture. Chrome disables it through
 * `management.setEnabled`; Firefox's temporary add-ons are always enabled, so the
 * documented test-mode driver records it as disabled instead (ISS-005, ISS-014).
 */
export function fixturesFor(_browserName) {
  return [...ELIGIBLE_FIXTURES, FIXTURES.dormant, FIXTURES.theme];
}
