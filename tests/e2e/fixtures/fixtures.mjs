export const FIXTURES = {
  alpha: { dir: 'fixture-alpha', name: 'Fixture Alpha' },
  bravo: { dir: 'fixture-bravo', name: 'Fixture Bravo' },
  dormant: { dir: 'fixture-dormant', name: 'Fixture Dormant' },
  theme: { dir: 'fixture-theme', name: 'Fixture Theme' },
};

export const ELIGIBLE_FIXTURES = [FIXTURES.alpha, FIXTURES.bravo];

/**
 * Firefox WebDriver BiDi can only install temporary add-ons, and a temporary
 * add-on is always enabled and cannot be disabled through `management`. So the
 * "already disabled" fixture is Chrome-only; the Firefox run asserts the
 * theme/app exclusion instead (ISS-014).
 */
export function fixturesFor(browserName) {
  if (browserName === 'chrome') return [...ELIGIBLE_FIXTURES, FIXTURES.dormant, FIXTURES.theme];
  return [...ELIGIBLE_FIXTURES, FIXTURES.theme];
}
