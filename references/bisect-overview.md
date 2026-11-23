# Generalized Bisection Methodology: Architecture & Design Guidelines

## 1. What Is Bisection?

**Bisection** is a systematic root-cause isolation methodology that applies **binary search** (or divide-and-conquer partitioning) over a space of candidate changes, components, or states to pinpoint the exact cause of an observable behavioral change.

Rather than testing candidates one by one, a bisect tool repeatedly partitions the active suspect space into two roughly equal halves, materializes a test state, and queries an **oracle** (a human observer or an automated script) for a binary verdict. Each answer eliminates ~50% of the remaining search space, isolating a single culprit out of $N$ candidates in $O(\log_2 N)$ steps.

While popularized by `git bisect` (searching software revision history) and Visual Studio Code’s Extension Bisect (searching active plugins), the underlying pattern generalizes to almost any modular, configurable, or versioned software system—including compiler passes, feature flags, test suites, configuration files, dependency graphs, and prompt/context pipelines.

---

## 2. Why Does It Exist?

Manual troubleshooting degrades poorly as software systems grow in complexity:

1. **Overcoming $O(N)$ Human & Compute Bottlenecks:**
   Testing $N$ suspects sequentially takes $O(N)$ worst-case and $O(N/2)$ average-case trials. When each trial requires compiling a binary, restarting an application, or manually reproducing a UI glitch, even $N = 30$ becomes prohibitive. Bisection turns $N = 1{,}000$ into ~10 trials, and scaling from 24 to 38 items adds only a single step.
2. **Decoupling Diagnosis from Domain Expertise:**
   A user or automated agent does not need to understand *how* an extension, commit, or flag works internally to isolate it. They only need to recognize whether the target symptom is present in a given state.
3. **Eliminating False Leads (Host vs. Suspect Attribution):**
   Well-designed bisect tools test the "null hypothesis" (e.g., running with all plugins disabled) before searching candidates, preventing users from wasting time debugging plugins when the host application itself is broken.
4. **General Change Detection (Beyond Bugs):**
   Bisection does not just find regressions ("good" $\to$ "bad"). It locates *any* monotonic state transition—such as when a bug was fixed ("broken" $\to$ "fixed"), when performance degraded ("fast" $\to$ "slow"), or when a property first appeared ("old" $\to$ "new").

---

## 3. Taxonomy of Bisection Archetypes

When designing a bisect tool for new software, the first architectural decision is identifying which of the two primary search models fits your domain.

| Dimension | Archetype A: Sequential / Graph Bisection | Archetype B: Combinatorial Set Bisection |
| :--- | :--- | :--- |
| **Reference Example** | `git bisect` | VS Code Extension Bisect |
| **Search Space** | An ordered timeline or Directed Acyclic Graph (DAG) of discrete states (commits, releases, compiler passes). | An unordered set of active modules, plugins, flags, or rules loaded simultaneously. |
| **Target Culprit** | A **transition point** (the first state $s_k$ exhibiting the property where its predecessor $s_{k-1}$ did not). | An **element** (or minimal subset) whose presence causes the property. |
| **Step Operation** | Pick a midpoint node in the timeline/DAG and check out that single historical snapshot. | Partition the active suspect set into two halves; disable one half while keeping the other active. |
| **Baseline Step** | User supplies two known boundary anchors (`good` and `bad`) before step 1. | Tool typically executes an initial all-off baseline check ($\log_2 N + 1$ steps) to verify the host isn't at fault. |
| **Key Assumption** | **Monotonicity:** Before the transition, all states are `old`; after it, all states are `new`. | **Additive Single-Culprit:** Disabling the culprit removes the symptom; enabling it restores the symptom. |
| **Primary Failure Modes** | Unbuildable intermediate states, non-monotonic fixes/reversions, complex merge histories. | Pairwise interaction bugs ($A + B$ fail together, neither alone), hard dependencies between items, order sensitivity. |

### Hybrid & Extended Archetypes
* **Delta Debugging (`ddmin`):** Extends Set Bisection to handle *multiple* culprits or *interaction* bugs (e.g., finding the minimal subset of a crashing config file or test sequence). If both halves pass independently, the bug is an interaction between halves, requiring subsets from both to remain active.
* **Numeric / Parameter Bisection:** Searches a continuous or large integer range (e.g., LLVM `opt-bisect-limit`, memory buffer sizes, timeout thresholds) using standard binary search over `[low, high]`.

---

## 4. How It Works: The Generalized Execution Loop

Regardless of domain, every bisection engine implements the same core state machine:

```
  [1. Initialize & Snapshot]
             │
             ▼
  [2. Baseline Sanity Check] ──(Host broken / Bounds invalid)──► [Abort & Report]
             │
             ▼
  [3. Partition Search Space] ◄────────────────────────┐
             │                                         │
             ▼                                         │
  [4. Materialize Candidate State]                     │
             │                                         │
             ▼                                         │
  [5. Query Oracle (Human / Script)]                   │
       │           │             │                     │
   (Pass/Old)  (Fail/New)  (Untestable/Skip)           │
       │           │             │                     │
       └─────┬─────┘             ▼                     │
             ▼             [Mark Skipped & Pick Neighbor]
  [6. Prune Search Space]                              │
             │                                         │
             ├──(Remaining suspects > 1)───────────────┘
             │
             ▼ (Suspect isolated or ambiguity boundary reached)
  [7. Report Attribution & Actionable Next Steps]
             │
             ▼
  [8. Teardown / Restore Original State]
```

### How Partitioning Differs in Practice

1. **In Sequential Bisection (`git bisect`):**
   * You have a known `good` boundary and a known `bad` boundary.
   * The engine computes a midpoint $m$ that maximizes information gain (in a DAG, the commit minimizing the maximum number of remaining reachable commits regardless of outcome).
   * If $m$ is `good`, the `good` boundary advances to $m$. If $m$ is `bad`, the `bad` boundary moves to $m$.

2. **In Set Bisection (VS Code Extension Bisect):**
   * Suppose you have $N=24$ enabled items (`1..24`), and item `8` is bad.
   * **Step 0 (Baseline):** Disable all 24 items. If the bug still occurs, the host software is broken—abort immediately.
   * **Step 1:** Enable items `1..12` (Suspect Half A), disable `13..24` (Half B). Bug occurs $\implies$ culprit is in `1..12`.
   * **Step 2:** Split `1..12`: enable `1..6`, disable `7..12`, and **re-enable the cleared items** `13..24`. *(Re-enabling cleared items keeps the user’s environment as functional as possible during testing and surfaces potential interactions early.)* Bug disappears $\implies$ culprit is in `7..12`.
   * **Repeat:** Continue subdividing the active suspect range (`7..9` vs `10..12`, etc.) until only item `8` is disabled and the system is `Good now`, isolating `8`.

> **Trade-off Note:** Bisection optimizes *worst-case* and *average-case* time ($O(\log_2 N)$), at the cost of *best-case* time—unlike linear search, which can get lucky on item #1 ($O(1)$), bisection always takes roughly $\log_2 N$ steps.

---

## 5. Design Guidelines for Building Bisect Tools

Use the following guidelines when building a bisect feature, CLI, or extension for another software system.

### Guideline 1: Model the Domain & Scoping Controls
* **Identify the Atomic Unit:** Choose the smallest toggleable or addressable unit users care about (commits, plugins, feature flags, config directives, middleware layers, test cases).
* **Support Pre-Filtering / Scoping:** Allow users to narrow the search space before starting using domain metadata.
  * *Sequential:* Restrict to changes touching specific paths (`pathspec`), supply multiple known-good anchors, or traverse only `--first-parent` on merge commits to avoid broken intermediate feature-branch commits.
  * *Set-based:* Initialize the suspect pool strictly from *currently active/enabled* items so users can manually exclude known-good items before starting.
* **Verify Boundaries Early:** Never start bisecting blindly. In set bisection, run the all-disabled baseline check (`+1` step). In sequential bisection, allow validating (or require asserting) that the two endpoints actually yield opposite oracle results.

### Guideline 2: Guarantee Safe State Management & Persistence
* **Snapshot Before Mutating:** Always record the original state (e.g., original `HEAD` branch, original list of enabled plugins/configs) before the first trial.
* **Persist Session State Across Restarts:** In GUI apps, servers, or OS tools, toggling modules often requires a process reload or window restart. Store bisection state (original state, current suspect bounds, step log) durably on disk or in a dedicated state file/ref so the loop seamlessly resumes after restart.
* **Provide Idempotent Teardown (`reset`):** Always offer a one-command/one-click escape hatch that restores the pre-bisect state, plus an optional `--reset-when-found` mode that cleans up automatically upon completion.
* **Separate State Updates from Execution When Needed:** Support a headless/dry-run pointer mode (analogous to `git bisect --no-checkout` updating `BISECT_HEAD`) when tests can inspect a candidate without mutating the active workspace.

### Guideline 3: Design Dual-Mode Oracles (Human UX + Automation API)

#### A. Human-in-the-Loop UX
* **Minimize Cognitive Load:** Present a clear binary choice (`Good now` vs. `This is bad`) alongside a cancel/reset option and a progress estimate (e.g., `"~4 steps remaining"`).
* **Support Semantic Terminology:** Hardcoding `"good"` and `"bad"` confuses users hunting for a *fix* or a *performance improvement*. Support neutral pairs (`old` / `new`) and custom terms (e.g., `fast` / `slow`, `broken` / `fixed`).
* **Warn About Oracle Consistency:** Make it clear that misreporting breaks convergence—always answering "good" blames the final boundary element, while always answering "bad" yields no single culprit.

#### B. Automated Oracle Protocol (`run`)
Provide a non-interactive runner (`<tool> bisect run <command>`) that delegates evaluation to an external script or test harness using standard exit codes:
* **`0`**: Property absent / state is `good` (or `old`).
* **`1–124`, `126–127`** *(or `1–127` excluding `125`)*: Property present / state is `bad` (or `new`). *(Note: reserving `126`/`127` or letting shell command-not-found errors behave deliberately is important—document exact semantics clearly! In Git, `1–127` except `125` means `bad`, while `125` means `skip`, and `>127` e.g. `255` from `exit(-1)` aborts.)*
* **`125` (Sentinel for Untestable):** Candidate cannot be evaluated (e.g., build error unrelated to the target bug); treat as `skip`.
* **Out-of-Band Abort (`>127` or negative/signal):** Fatal test harness failure; halt bisection immediately rather than poisoning search bounds.
* **Support Ephemeral Workarounds (Hot-Fix Hook):** Document or provide pre-test/post-test hooks so automated scripts can apply a temporary patch (e.g., fixing an old build script) before testing and cleanly revert it before the next step. Ensure test scripts live *outside* the mutated workspace.

### Guideline 4: Handle Real-World Imperfections Gracefully
* **Untestable Candidates (`skip`):** Allow users and scripts to skip broken candidates or entire ranges. When a skipped region sits immediately adjacent to the transition point, **do not guess**—explicitly report the exact set of ambiguous suspects (e.g., `"The culprit is one of: [commit A, commit B]"`).
* **Non-Monotonicity & Flakiness:**
  * If a test is flaky, support optional `--retries N` or majority-voting in the automated runner.
  * If a transition contradicts monotonicity (e.g., a state marked `good` turns out to follow a state marked `bad`), emit a clear diagnostic error rather than silently looping or blaming an arbitrary item.
* **Dependency & Interaction Constraints (Set Bisection):**
  * **Hard Dependencies:** If item $B$ depends on item $A$, disabling $A$ while leaving $B$ enabled will trigger unrelated errors or auto-disable $B$. Your partitioner should either compute dependency closures (keeping prerequisites active or grouping dependent clusters) or treat dependency-broken states as untestable.
  * **Multi-Culprit / Pairwise Interactions:** Standard binary set bisection assumes a single culprit (or an OR-combination of culprits). If testing reveals *both* Half A and Half B are `good` in isolation despite the full set being `bad`, detect this explicitly and either alert the user to an interaction bug or escalate to a Delta Debugging (`ddmin`) fallback.

### Guideline 5: Ensure Auditability, Recovery, and Visualization
* **Append-Only Action Log (`log`) & Deterministic Replay (`replay`):** Humans inevitably misclick `good` instead of `bad`. Maintain a human-readable, editable log of every verdict (`start`, `good`, `bad`, `skip`). Let users delete/edit an erroneous line and `replay` the session from scratch to recover without re-running every prior manual step.
* **Inspect Remaining Suspects (`visualize`):** Provide a view or list showing which candidates remain under suspicion, which have been cleared, and which were skipped.

### Guideline 6: End with Actionable Attribution
Identifying an ID or hash is rarely the user's true end goal. At termination:
* Print full context about the culprit (commit author/diff/summary, or plugin name/version/description).
* Offer immediate **next-step integrations**: e.g., *"Keep culprit disabled"*, *"File an issue / copy diagnostic report"* (as VS Code does), or *"Checkout culprit / revert culprit"*.

---

## 6. Reference Blueprint for Implementers & Agents

Below are clean, minimal reference skeletons an engineer or AI agent can adapt to any target system.

### A. Sequential Bisect Core Algorithm (Ordered List / Linearized DAG)

```python
from enum import Enum
from typing import Callable, List, Optional

class Verdict(Enum):
    GOOD = "good"    # / old
    BAD  = "bad"     # / new
    SKIP = "skip"    # untestable
    ABORT = "abort"

def bisect_sequential(
    states: List[str],                   # Ordered oldest [0] -> newest [N-1]
    apply_state: Callable[[str], None],  # Materialize state in target software
    evaluate: Callable[[str], Verdict],  # Human prompt or script runner
    restore: Callable[[], None],         # Teardown to original state
) -> List[str]:
    """Returns minimal list of candidate culprit states (len > 1 if skips caused ambiguity)."""
    low = 0            # Known GOOD index
    high = len(states) - 1  # Known BAD index
    skipped = set()

    try:
        while True:
            # Find untested indices strictly between low and high
            candidates = [i for i in range(low + 1, high) if i not in skipped]
            if not candidates:
                # Suspects are everything skipped in (low, high) plus `high` itself
                return [states[i] for i in range(low + 1, high + 1)]

            mid = candidates[len(candidates) // 2]
            apply_state(states[mid])
            verdict = evaluate(states[mid])

            if verdict == Verdict.GOOD:
                low = mid
            elif verdict == Verdict.BAD:
                high = mid
            elif verdict == Verdict.SKIP:
                skipped.add(mid)
            else:
                raise RuntimeError(f"Bisection aborted at {states[mid]}")
    finally:
        restore()
```

### B. Combinatorial Set Bisect Core Algorithm (Plugins / Flags / Configs)

```python
from typing import Callable, List, Optional, Set

def bisect_set(
    all_enabled: List[str],
    apply_enabled_set: Callable[[Set[str]], None],
    is_still_bad: Callable[[], bool],    # True = symptom persists ("This is bad")
    restore: Callable[[], None],
    check_baseline: bool = True,
) -> Optional[str]:
    """Isolates a single faulty item from `all_enabled`, or returns None if host/interaction."""
    try:
        # Step 0 (+1 step): Verify the problem disappears when ALL candidates are disabled
        if check_baseline:
            apply_enabled_set(set())
            if is_still_bad():
                return None  # Fault is in the host software, not the candidate set

        suspects = list(all_enabled)
        full_set = set(all_enabled)

        while len(suspects) > 1:
            mid = len(suspects) // 2
            first_half = set(suspects[:mid])
            second_half = set(suspects[mid:])

            # Disable second_half; keep first_half AND all previously cleared items enabled
            cleared_items = full_set - set(suspects)
            apply_enabled_set(first_half | cleared_items)

            if is_still_bad():
                # Symptom persisted while second_half was disabled -> culprit is in first_half
                suspects = suspects[:mid]
            else:
                # Symptom disappeared -> culprit is in second_half
                suspects = suspects[mid:]

        # Final confirmation: disable only the lone suspect
        lone_suspect = suspects[0]
        apply_enabled_set(full_set - {lone_suspect})
        if not is_still_bad():
            return lone_suspect

        return None  # Inconsistent oracle or multi-item interaction bug
    finally:
        restore()
```

---

## 7. Pre-Flight Checklist for Building a Bisect Extension

Before shipping a bisect tool for your software, verify these criteria:

- [ ] **Archetype Fit:** Have you chosen Sequential (timeline/range), Set (active components), or `ddmin` (minimal failing subset)?
- [ ] **Null-Hypothesis Check:** Does the tool verify that disabling all suspects fixes the issue (or that the endpoints genuinely differ) before entering the loop?
- [ ] **Restart Resilience:** If applying a state restarts the target app, is bisection state persisted and resumed automatically?
- [ ] **Guaranteed Rollback:** Does cancelling, crashing, or finishing cleanly restore the user's pre-bisect state (`reset`)?
- [ ] **Terminology Clarity:** Can users express non-bug transitions (`old`/`new` or custom labels) without mental inversion?
- [ ] **Skip & Ambiguity Handling:** Can untestable states be skipped, and does the output honestly report an ambiguity range rather than blaming an arbitrary neighbor?
- [ ] **Log & Replay:** Can a user undo a misreported verdict without restarting the whole session from step 1?
- [ ] **Headless Automation:** If applicable, is there a `run` command obeying deterministic exit codes (`0` = good, non-zero = bad, sentinel `125` = skip, abort code = halt)?
- [ ] **Actionable Exit:** Does the final screen offer a direct remediation (e.g., disable culprit, open issue, inspect diff)?