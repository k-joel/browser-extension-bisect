<img src="public/icon/128.png" width="88" alt="Browser Extension Bisect icon" align="right">

# Browser Extension Bisect 🔍 — twenty extensions, six questions, one culprit

[![CI](https://img.shields.io/github/actions/workflow/status/k-joel/browser-extension-bisect/ci.yml?branch=main&style=flat-square&label=ci)](https://github.com/k-joel/browser-extension-bisect/actions/workflows/ci.yml)
[![Platform](https://img.shields.io/badge/platform-chrome%20%7C%20firefox-blue?style=flat-square)](#platforms-permissions-and-privacy)
[![Node](https://img.shields.io/badge/node-%3E%3D22-339933?style=flat-square&logo=nodedotjs&logoColor=white)](#install)
[![License](https://img.shields.io/github/license/k-joel/browser-extension-bisect?style=flat-square)](LICENSE)

Browser Extension Bisect is an add-on for Chrome and Firefox that finds out which of your
installed extensions is breaking a page. Instead of disabling them one at a time, it runs a
binary search: each round turns off half of the remaining suspects, reloads the page, and
asks you one question — until a single extension is left.

It changes nothing before you say go, puts every extension it touched back exactly as it
found it, and neither reads page content nor talks to the network.

> **Status:** the v1 feature set is complete and its cross-browser test suite passes in CI,
> but the add-on is not published on the Chrome Web Store or AMO — building from this
> repository is the only way to run it.

## Install

Not published to a store, so you build it yourself. You need [Node.js](https://nodejs.org)
**22 or newer**.

```bash
npm install
npm run build:prod:chrome    # → .output/chrome-mv3
npm run build:prod:firefox   # → .output/firefox-mv2
```

Use the `build:prod:*` scripts for everyday use; the plain `build:chrome` / `build:firefox`
scripts set `EXT_TEST_MODE=1` and compile in extra hooks used only by the test harness.

**Chrome** — open `chrome://extensions`, switch on **Developer mode**, click
**Load unpacked**, and select the `.output/chrome-mv3` folder.

**Firefox** — open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on…**,
and select `.output/firefox-mv2/manifest.json`. A temporary add-on is removed when Firefox
closes, so plan to finish a session in one sitting.

## Quick start

1. Open a tab where the problem reliably shows up, and keep it open. The add-on reloads
   this **test tab** after every batch, so each answer reflects a fresh load.
2. Open the panel: click the toolbar icon on Chrome, or open the Firefox sidebar
   (**View → Sidebar → Extension Bisect**).
3. Untick anything you want left out of the search, then press **Review N candidates**
   (N is your extension count).
4. On the consent screen, press **Bind the current tab**, then **Start baseline**. Nothing
   in your browser changes until that click.
5. The baseline disables every candidate at once and reloads the test tab. If the problem
   survives with all candidates off, no installed extension is implicated, and the session
   ends as a **host issue** instead of blaming one.
6. The halving begins. Each batch turns one half of the remaining suspects off and the
   other half on, and you answer the same two-button question after each reload. On Firefox
   you apply each batch by hand from a checklist in the Add-ons Manager and the add-on
   verifies it — see [Platforms, permissions, and privacy](#platforms-permissions-and-privacy).
7. When one extension is left, it is named and **left disabled** so you can confirm the
   fault yourself. **Restore** then returns every extension the session touched to the state
   it had before the search.

## Search mechanics

The all-off baseline comes first for a reason: it proves an installed extension is
implicated before any halving starts. From there, every answer halves the suspect pool, so
the number of questions grows logarithmically:

| Extensions in the search | Questions | Worst case |
|---|---|---|
| 8 | 4 | 5 |
| 24 | 6 | 7 |
| 50 | 7 | 8 |

Counts include the baseline question; the worst case adds one final confirmation.

You are the detector: the add-on reloads the page and asks, you look and answer. A misclick
is therefore possible — the [session log](#the-session-log) and its replay exist to catch one.

If your answers contradict each other — the search runs out of suspects, or the last one
standing still reproduces the problem — the session ends **inconclusive** and lists the
extensions that could be responsible, rather than pinning the blame blindly.

## The session log

Every session is written to local storage as an append-only event log, capped at 500 events
(a session stops rather than dropping its history). Closing the panel or the browser loses
nothing: on reopen, an unfinished session offers **Resume the session** or **Restore**.

From the session history you can:

- **Copy the bisect log** — copy the persisted log as JSON.
- **Copy the report** — copy a readable summary of the baseline, every batch, and the
  outcome.
- **Correct a verdict and replay** — replay recomputes the search on a copy of the log from
  your corrected answers and shows the outcome it would have produced, plus any recorded
  batch that disagrees. Replay never toggles an extension.

The log also keeps the session honest when the world changes under it:

- An extension installed mid-search is reported but never joins the candidates.
- An extension updated or removed mid-search pauses the session and offers restore or a
  fresh start.
- A toggle the browser refuses pauses the session with the browser's own error and the
  recovery it needs; nothing is claimed restored unless it was.

## Platforms, permissions, and privacy

| | Chrome | Firefox |
|---|---|---|
| Manifest | V3 | V2 |
| Panel | Side panel, opened by the toolbar icon | Sidebar, opened from the sidebar menu |
| Applying a batch | Automatic | By hand from checklists — automatic only when the add-on itself was installed by policy (`installType: admin`) |

The add-on requests only `storage` and `management` (plus `sidePanel` on Chrome). It has no
host permissions and no content scripts, so it cannot read page content, tab URLs, or tab
titles. It makes no network requests at all — no telemetry, no analytics, no remote code —
and the Firefox build declares `data_collection_permissions: none`.

## What it deliberately does not do

- **Detect the fault for you.** Verdicts are human answers to one question; the add-on only
  reloads the tab and records what you said.
- **Isolate more than one culprit.** Contradictory verdicts end inconclusive. Multi-culprit
  isolation (delta debugging) is not implemented.
- **Search without a reproducible page.** You need a tab where the problem shows up
  reliably; a flaky symptom makes every verdict unreliable.

## Development

```bash
npm run dev            # WXT dev server, Chrome
npm run dev:firefox    # WXT dev server, Firefox
npm run lint           # Biome
npm run typecheck      # wxt prepare + vue-tsc
npm run test:unit      # Vitest
npm run agent:verify   # full gate: lint, typecheck, unit tests, both builds, E2E in both browsers
```

### Testing against real extensions

The fixture suite above is fast and deterministic. To check the search against a browser that is
actually broken, `agent:verify-full` installs 20 curated marketplace extensions plus one deliberately
faulty extension and bisects them with no human answering anything:

```bash
npm run extensions:download          # 20 extensions from both stores → good_extensions/
npx puppeteer browsers install firefox@nightly
npm run agent:verify-full            # the real-world gate, both browsers
npm run manual:chrome-full           # the same set, driven by hand
```

The fault extension lives in [bad_extension/](bad_extension/README.md). It signals the fault twice —
a red banner for a human and a `data-bad-extension` marker plus `[BAD_EXT_ACTIVE]` console line for a
program — so the automated gate can answer the bisect from the page instead of from its own
bookkeeping. To check a page by hand or from a script:

```bash
npm run bad-extension:probe -- --url=https://example.com --expect=active
```

This gate is not in CI: it downloads from two stores and needs a Nightly Firefox, so it is opt-in.

Setup and step-by-step procedures live in [docs/RUNBOOK.md](docs/RUNBOOK.md) (RUN-001 to
RUN-011); conventions and the contribution path in [CONTRIBUTING.md](CONTRIBUTING.md).

## Documentation

- [docs/ARCH.md](docs/ARCH.md) — as-built architecture, data flow, component inventory
- [docs/SPEC.md](docs/SPEC.md) — the v1 behavioural specification
- [docs/DECISIONS.md](docs/DECISIONS.md) — architecture decision records
- [docs/RUNBOOK.md](docs/RUNBOOK.md) — numbered setup, verification, and debugging procedures
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — notable changes

## License

Apache-2.0 — see [LICENSE](LICENSE).
