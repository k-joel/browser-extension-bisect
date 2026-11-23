import { fakeBrowser } from 'wxt/testing/fake-browser';

interface MessagingRuntime {
  sendMessage: (message: unknown) => Promise<unknown>;
}

export function installMessagingBridge(): void {
  const runtime = fakeBrowser.runtime as unknown as MessagingRuntime;
  runtime.sendMessage = async (message: unknown) => {
    const results = await fakeBrowser.runtime.onMessage.trigger(message, {}, () => undefined);
    return results[0];
  };
}
