/* The reference "bad extension" symptom. Both error modes are raised by this
   single injection, so a human and an autonomous agent observe the same fault:
   a visible red banner for the human, and a stable, machine-readable marker for
   an agent. The marker answers whether *any* extension is bad; it never claims
   which one, because naming the culprit is the bisect's job. */
(() => {
  const MARKER_ATTRIBUTE = 'data-bad-extension';
  const MARKER_VALUE = 'active';
  const CONSOLE_MARKER = '[BAD_EXT_ACTIVE]';
  const META_NAME = 'bad-extension-state';
  const BANNER_ID = 'bad-extension-banner';
  const BANNER_TEXT = 'Bad extension enabled';

  document.documentElement.setAttribute(MARKER_ATTRIBUTE, MARKER_VALUE);

  const meta = document.createElement('meta');
  meta.setAttribute('name', META_NAME);
  meta.setAttribute('content', MARKER_VALUE);
  document.documentElement.appendChild(meta);

  console.info(CONSOLE_MARKER);

  const renderBanner = () => {
    if (document.getElementById(BANNER_ID) !== null) return;
    const banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.setAttribute('role', 'status');
    banner.textContent = BANNER_TEXT;
    (document.body ?? document.documentElement).appendChild(banner);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderBanner, { once: true });
  } else {
    renderBanner();
  }
})();
