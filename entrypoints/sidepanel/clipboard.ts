export interface ClipboardWriter {
  writeText(text: string): Promise<void>;
}

export interface CopyDependencies {
  clipboard?: ClipboardWriter | null;
  legacyCopy?: (text: string) => boolean;
}

export type CopyOutcome = 'copied' | 'manual';

export const MANUAL_COPY_MESSAGE =
  'The text could not be copied automatically. Select it in the box below and copy it yourself.';

export interface CopyStatus {
  kind: 'copied' | 'error';
  message: string;
  text: string | null;
}

/**
 * The side panel is a normal extension document, so `navigator.clipboard` is available
 * there but still rejects without focus or permission. When it does, fall back to the
 * `execCommand` path over a temporary textarea; when that also fails, the caller reveals
 * the selectable textarea so the user can copy the text by hand.
 */
export function resolveClipboard(): ClipboardWriter | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.clipboard ?? null;
}

export function legacyCopyText(text: string): boolean {
  if (typeof document === 'undefined') return false;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', 'true');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();
  try {
    return typeof document.execCommand === 'function' && document.execCommand('copy');
  } finally {
    area.remove();
  }
}

export async function copyText(text: string, dependencies: CopyDependencies = {}): Promise<CopyOutcome> {
  const clipboard = dependencies.clipboard === undefined ? resolveClipboard() : dependencies.clipboard;
  if (clipboard !== null && text.length > 0) {
    try {
      await clipboard.writeText(text);
      return 'copied';
    } catch {
      // Fall through to the legacy path; a clipboard denial must not break the screen.
    }
  }

  const legacyCopy = dependencies.legacyCopy ?? legacyCopyText;
  try {
    if (legacyCopy(text)) return 'copied';
  } catch {
    // The selectable textarea is the last resort.
  }
  return 'manual';
}
