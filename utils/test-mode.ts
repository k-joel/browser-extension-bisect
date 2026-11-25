declare const __EXT_TEST_MODE__: boolean;

/**
 * The build-time test-mode flag as a value, so a call site can be written as a
 * plain ternary over a literal. `isTestMode()` wraps the same constant for code
 * that needs a call, but a function call is opaque to tree shaking: only the
 * hoisted constant lets a bundler fold the branch away and drop the test-only
 * modules from `build:prod:*` (see `docs/NOTES.md` §test-builds).
 */
export const TEST_MODE_ENABLED = typeof __EXT_TEST_MODE__ !== 'undefined' && __EXT_TEST_MODE__ === true;

export function isTestMode(): boolean {
  return TEST_MODE_ENABLED;
}
