import { browser } from 'wxt/browser';

export interface EscalationOutcome {
  extensionId: string;
  ok: boolean;
  error?: string;
}

/**
 * The one place the side panel touches `management` itself. `kGestureNeededForEscalationError`
 * exists because Chrome requires user activation for the re-enable, and user activation
 * does not survive a `runtime.sendMessage` hop — a background handler has none. The call
 * therefore has to run in the click handler's own task, and the panel then reports the
 * outcome to the background, which stays the only writer of the log.
 *
 * The error message is returned verbatim so the background can map it with the same
 * vocabulary the adapters use; the panel never classifies it.
 */
export async function enableExtensionWithClick(extensionId: string): Promise<EscalationOutcome> {
  try {
    await browser.management.setEnabled(extensionId, true);
    return { extensionId, ok: true };
  } catch (error) {
    return {
      extensionId,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
