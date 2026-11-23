import { CONTENT_MARKER_ATTRIBUTE, CONTENT_TAB_ID_ATTRIBUTE } from '@/utils/content-marker';
import { messenger } from '@/utils/messaging';
import { enabledItem } from '@/utils/storage';
import { isTestMode } from '@/utils/test-mode';

function renderMarker(enabled: boolean): void {
  document.documentElement.setAttribute(CONTENT_MARKER_ATTRIBUTE, enabled ? 'enabled' : 'disabled');
}

async function publishTestTabId(): Promise<void> {
  const tabId = await messenger.sendMessage('getTabId');
  if (tabId === null) return;
  document.documentElement.setAttribute(CONTENT_TAB_ID_ATTRIBUTE, String(tabId));
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  async main() {
    const enabled = await enabledItem.getValue();
    renderMarker(enabled);

    enabledItem.watch((nextEnabled) => {
      renderMarker(nextEnabled);
    });

    messenger.onMessage('getContentMarker', () => document.documentElement.getAttribute(CONTENT_MARKER_ATTRIBUTE));

    if (isTestMode()) {
      await publishTestTabId();
    }
  },
});
