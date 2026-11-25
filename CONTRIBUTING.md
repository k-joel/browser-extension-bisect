# Contributing

Thanks for considering a contribution. This file is a router: the how-to lives in the
runbook and the house rules in [AGENTS.md](AGENTS.md) — neither is restated here.

## Setup

Node.js **22 or newer**, then `npm install`. Full instructions: RUN-001 in
[docs/RUNBOOK.md](docs/RUNBOOK.md).

## The loop you are expected to run

- While iterating: RUN-002 (the fast inner loop); RUN-004 to iterate on a single browser.
- Before handing anything over: RUN-003 — `npm run agent:verify` runs lint, typecheck, unit
  tests, both builds, and E2E in both browsers.

## Code conventions

Naming, formatting, comment, and styling rules live in the Code Style Guidelines of
[AGENTS.md](AGENTS.md). Styling uses plain CSS files with the existing custom-property
tokens rather than new hard-coded values.

## Documentation that must change with your code

- [docs/CHANGELOG.md](docs/CHANGELOG.md) — every user-visible change, under `Unreleased`.
- [docs/ARCH.md](docs/ARCH.md) — when topology, data flow, interfaces, schema, or test
  gates change.
- [docs/DECISIONS.md](docs/DECISIONS.md) — a new ADR for every architectural decision.
- [docs/ISSUES.md](docs/ISSUES.md) — every defect found; delete the entry once fixed.
- [docs/NOTES.md](docs/NOTES.md) — gotchas a future session needs to know.
- [docs/TECH_DEBT.md](docs/TECH_DEBT.md) — structural anti-patterns and code smells.

## Where the design lives

The intended v1 behaviour is [docs/SPEC.md](docs/SPEC.md), the as-built architecture is
[docs/ARCH.md](docs/ARCH.md), and the reasoning behind structural choices is in the ADRs in
[docs/DECISIONS.md](docs/DECISIONS.md). When code and a document disagree, the code wins;
update both in the same change.
