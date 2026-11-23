declare const __EXT_TEST_MODE__: boolean;

export function isTestMode(): boolean {
  return typeof __EXT_TEST_MODE__ !== 'undefined' && __EXT_TEST_MODE__ === true;
}

export function readTabIdParam(search: string): number | undefined {
  const raw = new URLSearchParams(search).get('tabId');
  if (raw === null) return undefined;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
