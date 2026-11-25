# Bad Extension

The reference faulty extension for the real-extension bisect workflow. It exists so a human and an
autonomous agent share one unambiguous, independently verifiable definition of "the page is broken".

It is deliberately trivial: one content script, one stylesheet, no background worker, no storage, no
network access, no libraries and no bundler.

## What it does

Injected at `document_start` on every `http`/`https` page, `content.js` raises both error modes at
once:

| Audience | Signal |
|---|---|
| Human | Fixed red banner reading `Bad extension enabled` (`#bad-extension-banner`) |
| Agent | `data-bad-extension="active"` on `<html>`, a `<meta name="bad-extension-state">` tag, and `[BAD_EXT_ACTIVE]` on the console |

The signal is **present or absent only**. It answers *whether* a faulty extension is active, never
*which* one — identifying the culprit is the bisect's job, not the extension's.

## Build

```bash
npm run bad-extension:build      # node bad_extension/build.mjs
```

Outputs `dist/chrome-mv3/` (Manifest V3) and `dist/firefox-mv2/` (Manifest V2, gecko id
`bad-extension@browser-extension-bisect.test`). `dist/` is gitignored and rebuilt on demand.

## Verify

```bash
node tools/bad-extension-probe.mjs \
  --browser=chrome \
  --extension=bad_extension/dist/chrome-mv3 \
  --url=http://example.com \
  --expect=active
```

The probe prints a JSON verdict and exits non-zero when the observed marker disagrees with
`--expect`. Use `--expect=inactive` to prove the fault is gone.
