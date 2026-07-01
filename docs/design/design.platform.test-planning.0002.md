---
schema_version: 1
id: design.platform.test-planning.0002
type: design
title: "Verification Ownership Across the OMG Plan/Build Phases — Design"
status: draft
domain: platform
supersedes: design.platform.test-planning.0001
created_at: 2026-07-01T01:43:40Z
updated_at: 2026-07-01T04:25:58Z
hindsight:
  strategy: spec-or-adr
  tags:
    - source:authored
    - domain:platform
    - discipline:engineering
    - memory_type:design
---

# Verification Ownership Across the OMG Plan/Build Phases — Design Doc

> Design document. Argues for a whole approach to building something: the proposed structure, the alternatives weighed, and the reasoning that connects goals to design.
>
> **Status: draft.** Supersedes `design.platform.test-planning.0001`. Serves `prd.platform.test-planning.0002` and realizes `adr.platform.plan-time-orchestration.0001`, `adr.platform.verification-independence.0001`, and (new this round, for R16/Goal 8) `adr.platform.memory-shipping-boundary.0001`. It is **not yet approved for build**; the superseding spec (`spec.platform.test-planning.0002`) returns to the PM after this design and the ADRs land.

## Why this supersedes `design.platform.test-planning.0001`

The v1 design gave test planning an owner — a read-only `omg-test-planner` — and a deadlock-free findings loop proven by trace. That mechanism works and is dogfed. What v1 got wrong, and what this design corrects, is *where the judgments and the authorship live*:

- v1 kept planning an operator-invoked step (`/omg-test-plan`) run **after** decomposition, over an already-built epic. That defeats test-first ordering and makes verification optional by omission.
- v1 gave the review bead **two authors** (decomposer writes it plain; planner rewrites it), which spawned its most intricate machinery — a sentinel, a "rewrite to the same content" convergence rule, a survey step to detect the other author's work.
- v1 accepted the **builder authoring tests** ("baseline" tests), so the same context wrote code and some of the tests that check it — the grading-your-own-work failure the feature was meant to prevent.

This design re-homes verification per the two governing ADRs: a **plan-time orchestrator** (the decomposer) drives **verification planning first, then build planning**, as a standard non-optional phase; the review bead has **one author**; and writing splits into a **test-writer** and an **implementation agent** whose independence is structural (ordering + context isolation, made enforceable by per-agent permission). The v1 findings loop survives the re-homing, and its termination is **re-derived here** under the new topology — that re-derivation is the load-bearing content of this document.

The v1 design is preserved as the record of what was tried; this document records the corrected topology.

## Goals

This design must deliver a buildable, correct mechanism for the PRD's intent. Concretely:

1. **A concrete plan-phase sequencing mechanism** by which the plan-time orchestrator (decomposer) drives test-planning then build-planning, with the correctness constraint that the build plan is wired only to test beads that already exist, and both after the epic is minted (PRD OQ1).
2. **The test-planner's intent reaches the dependency wiring with no second review-bead author** (PRD OQ2).
3. **Exactly one test-authorship path** — the test-writer, from planned beads — with no residual place the implementer produces a test (PRD OQ3).
4. **The findings-driven loop survives the re-homing and still terminates**, proven by trace under single-author review beads and separate writing agents (PRD R11).
5. **The failing-test escape hatch, Modes 1 and 2**, wired so a stuck test surfaces and never becomes a silent hack, with the Mode-2 PM decision recorded for the build report — and, when the PM cannot decide, a clean human-gate pause via `bd gate` (PRD R13, R15, OQ4).
6. **The foreman's routing invariant is untouched**; only build-mode looping mechanics extend, and only for the fresh-context test-writing dispatch (PRD R9 routing sacred; R6 independence).
7. **A two-hop done-target metadata chain** by which an implementation bead learns which focused test proves it is done — resolved through bead metadata only, never by reading test source — so the answer survives the deferred read-deny (PRD R7).
8. **A focused per-bead done-check plus a single full-suite run at the review bead**, the systematic catch for prior-epic breakage and for any hole a broken metadata chain leaves, filed through the reviewer's existing findings discipline (PRD R8).
9. **The epic's terminal work is beads on the graph, the foreman loses its closing ceremony, and shipping leaves the automated flow** — the report-writer bead writes the build report and stops; nothing in the build loop ships to Hindsight; the human-gate trap is removed structurally because an empty queue no longer triggers a terminal ship (PRD R16, Goal 8; `adr.platform.memory-shipping-boundary.0001`).

## Non-Goals

Inherited from the PRD and the ADRs; this design does not relitigate them and must not quietly reintroduce any:

- **No optionality / opt-in invocation of verification planning.** It is a standard phase.
- **No change to the foreman's routing.** Routing stays label-only and stateless; only looping mechanics may extend.
- **No second build-time orchestrator.** The plan-time orchestrator operates in the plan phase only.
- **No sharing of the `test-writing` skill with the implementer.** One owner.
- **No test taxonomy, type enum, or risk/cost scoring rubric.** The confidence judgment reasons in prose.
- **No coverage thresholds, CI wiring, or merge gating.**
- **No building of the implementer's test-directory read-deny.** Designed-for; configured at onboarding; built later.
- **No systematic cross-epic verification.** Mode 2 handles the reactive case; the systematic version is a future PRD.
- This design does **not** define the planners' prose reasoning quality (that is each planner's persona); it defines the *mechanism and structure* they operate within.

## Context

### The existing system, verified against the real instruments

Confirmed by reading the actual agent, skill, and command files in `opencode/` and `.opencode/`, not taken on faith:

- **Dispatch is label-only and stateless.** `omg-foreman.md` + `omg-foreman/SKILL.md`: the foreman loops on `bd ready --parent <epic> --json`, reads `bd state <id> agent` per ready bead, dispatches via the Task tool, holds no orchestration state; newly-unblocked beads surface on the next pass. Its `bd ready` call passes no `--include-ephemeral`, so a bead it must dispatch cannot be ephemeral.
- **The bead body is the universal work order.** The foreman passes a bead *id*; the dispatched worker fetches its own body (`bd show <id>`) and executes it (`omg-builder` skill steps 2–3; `omg-review` skill "Process" now states the same fetch-and-execute contract explicitly). This is the contract the review-bead mechanism rests on.
- **The decomposer is a primary agent that carries out decomposition end to end.** `omg-decomposer.md` + `omg-decompose.md` + `omg-epics/SKILL.md`: it mints the epic from the spec, mints children with `--parent <epic> --no-inherit-labels`, stamps each bead's `agent` state label with `bd set-state`, creates one review bead stamped `agent=omg-reviewer` blocked by all other children, and validates the DAG. It drives the whole sequence as ordinary work under skill instruction — it is not a slash-command chain.
- **The v1 findings loop already exists in `omg-epics`.** The "Test-planning wiring" section carries the summons-bead hard rules, Case A / Case B edges, the mandatory `y` close, the same-file `z` sequencing rule, and the canonical test-aware `R` body block with an `<!-- omg-test-aware -->` sentinel. This is the mechanism this design re-homes.
- **The test-writer exists and is philosophically correct.** `omg-tester.md` (`write/edit/bash: true`, `skill: test-writing: allow`) refuses tests that do not increase justified confidence. `test-writing/SKILL.md` is the ecosystem-specific *how*.
- **The implementation agent currently writes tests.** `omg-builder.md` persona line: *"You implement features, fix bugs, **and write tests**."* It holds `edit: allow` and the `omg-builder`/`omg-epics`/`omg-commands` skills — but **not** `test-writing`. This test-writing charter is the residual v1 authorship path this design must close (OQ3).
- **The reviewer is read-only and blind to test mode.** `omg-reviewer.md` (`edit: deny`) files a bead per finding and runs the findings loop by executing its review bead; it branches on nothing about testing.
- **The PM agent has Hindsight and is the product-intent authority.** `omg-product-manager.md` (`edit **/*.md: allow`, `skill: hindsight-cli: allow`) is the Mode-2 adjudicator with the memory of why prior guarantees exist.
- **Sync is plugin-owned.** Per `adr.platform.beads-sync-ownership.0001`, every instrument carries task semantics only and is mode-agnostic; none names a `bd dolt` sync command or branches on `dolt_mode`.

### Binding constraints (which forces dominate)

In order:

1. **Correctness of the plan/build graph — deadlock-freedom and no leaked beads.** The whole value is a loop that terminates cleanly across a *larger* set of beads than v1 (now also the escape-hatch beads). A graph that can wedge is worse than no feature. This dominates.
2. **Enforceability of verification independence.** Independence must rest on ordering, context isolation, and per-agent permission (`adr.platform.verification-independence.0001`) — mechanisms the harness holds — not on prose an agent may drift from.
3. **Operability under the foreman's untouchable routing invariant.** Every new bead kind (`y`, `z`, escape-hatch beads) must route by label with zero foreman routing change; only looping mechanics may extend.
4. **Maintainability via the who/how/ask split.** Judgment lives in personas; wiring mechanics live in `omg-epics`; the plan-phase sequence lives in a skill runbook, not baked into a persona.

Scale, security-as-multitenancy, and cost are non-binding: single-operator workflow tooling on a beads graph. (Security *does* appear, narrowly, as the per-agent read-boundary in constraint 2.)

## Proposed Approach

### The four roles and the two phases

The v1 decomposer split into three plan-time roles, plus the writing split, gives four judgments each with one owner, across two phases:

| Phase | Role | Agent | Judgment / job | Source access |
|---|---|---|---|---|
| Plan | Plan-time orchestrator | `omg-decomposer` | Mint epic, sequence the passes, author the review bead once, validate the DAG. Absorbs **no** planning judgment. | read-only |
| Plan | Confidence planner (test-planner) | `omg-test-planner` | Decide **what to verify** (or deliberately not to); mint + wire test beads; the escape-hatch Mode-1 authority. | read-only |
| Plan | Build planner | `omg-build-planner` (new) | Decide **what to implement**; mint implementation beads covering every spec requirement/AC; read the test beads to wire satisfies-test edges; **write the test-bead id(s) onto each implementation bead** (metadata chain, hop 1). Mints **no** test scope. | read-only |
| Build | Test-writer | `omg-tester` | **Write** tests from the confidence planner's beads; **write the run-selector onto the test bead** (metadata chain, hop 2); owns `test-writing`. | read/write |
| Build | Implementation agent | `omg-builder` | **Write** code; satisfy its focused test (resolved via metadata chain, never test source); author/alter **no** test; mint **no** test scope. | read/write; test-dir **read-deny** (deferred) |
| Build | Reviewer | `omg-reviewer` | Find and file; **run the full suite once at the review bead**; run the findings loop; blind to test mode. | read-only |
| Build | Foreman | `omg-foreman` | Drain the ready queue by label. **Dispatches the terminal beads like any other work; holds no closing ceremony and no terminal state.** | read-only (code) |
| Build | Report-writer | `omg-reviewer` (report-writer bead) | **Write** the build report to the docs tree from the epic's bead comments, and **stop** — it does not ship. | read-only (code), write `**/*.md` |
| Build | PM (Mode-2 adjudicator) | `omg-product-manager` | Resolve a broken prior-epic test using product intent + Hindsight; decision recorded on the bead for the report. | read-only (code) |

The plan phase produces a validated graph; the build phase drains it. The orchestrator never enters the build phase, and the foreman never enters the plan phase — this is the phase separation of `adr.platform.plan-time-orchestration.0001`. **The foreman also never enters a *terminal* phase:** with R16 the epic's closing work is dispatched beads on the graph, so "drain the queue" is the foreman's whole job and the queue draining to empty means the same thing for terminal work as for any work — done (see "The epic's terminal work is beads on the graph").

### Resolution of OQ1 — the plan-phase sequencing mechanism

At plan time there is **no foreman** and no ready queue to carry ordering. The orchestrator itself must drive the passes in order. Three mechanisms were weighed (full analysis in *Alternatives Considered*); the chosen one:

**The orchestrator (decomposer) dispatches the two planners as subagents, in a fixed order, driven by the `omg-epics` plan-phase runbook.** In one decomposition run, driven end to end as ordinary work (exactly as `omg-decompose.md` already drives decomposition):

1. **Mint the epic** from the spec (`bd create … -t epic --spec-id …`), and its `relates-to` ADR beads. Unchanged from today.
2. **Dispatch the confidence planner** (`omg-test-planner`) via the Task tool, handing it the epic id. It surveys the spec's behaviors, mints test beads (`agent=omg-tester`) for those it judges warrant independent verification, and records "no test needed, because…" for the rest. It returns when its pass is complete. **It authors no build beads and does not touch the review bead.**
3. **Dispatch the build planner** (`omg-build-planner`) via the Task tool, handing it the epic id. It runs *after* step 2, so the test beads already exist. It mints one implementation bead (`agent=omg-builder`) per spec requirement/AC — its completeness derives from the **spec**, not from the test beads — then **reads** the test beads and wires the satisfies-test dependency edges (below). It returns when its pass is complete.
4. **Author the review bead once** (`agent=omg-reviewer`), from the static canonical block in `omg-epics`, blocked by all other children. The orchestrator writes it; no planner ever touches it.
5. **Validate** (`bd swarm validate`, `bd dep tree`) and run the refinement passes.

The ordering constraint — build plan after test beads exist, both after the epic — is **guaranteed by sequential subagent dispatch**: each Task call completes and returns before the orchestrator issues the next. There is no queue to race and no concurrency at plan time. The sequence is skill-based instruction in `omg-epics` (the *how*), invoked by the `omg-decompose` command (the *ask*); it is **not** baked into any planner persona and **not** a slash-command chain (an agent cannot invoke one — the v1 blocker).

**Why this dissolves the v1 blocker.** v1 deferred non-optional planning because "an agent cannot invoke a slash command," so the decomposer could not call `/omg-test-plan`. Here the orchestrator does not *call a command* — it *dispatches a subagent* via the Task tool, which primary agents already do (the foreman dispatches every worker this way). The capability the harness lacked (conditional command chaining) is never needed.

**Permission note (buildability).** The `omg-decomposer` frontmatter today has no `task:` block. Dispatching subagents requires the `task` permission. The build must grant `omg-decomposer` `task` (scoped to `omg-test-planner` and `omg-build-planner`), or the sequencing cannot run. This is a required frontmatter change flagged in the buildability review and the Instruments checklist.

### Resolution of OQ2 — the test-planner's intent reaches the wiring without a second review-bead author

The concern: in v1 the planner rewrote the review bead to carry the findings-loop instructions, making it a second author. How does the confidence planner's intent reach the dependency wiring here without touching the review bead?

**It reaches it through the build planner reading the test beads, and through the static review-bead block — two disjoint channels, neither of which is the planner writing the review bead.**

- **Original-graph wiring (the default "test blocks implementation" shape).** The confidence planner mints a test bead `z` (`agent=omg-tester`) for a behavior. It does **not** wire `z` to any implementation bead, because at step 2 the implementation beads do not yet exist. The **build planner**, running second (step 3), reads the epic's test beads (`bd list --parent <epic> --json`, filtering `agent=omg-tester`), and for each implementation bead it mints, wires **`z` blocks the implementation bead** (`bd dep add <impl> <z>`) — the Case-A "test authored before implementation, blocks it" shape as the plan-time default. The confidence planner's intent (this behavior is verified) is expressed as a test bead; the build planner's reading of that bead completes the edge. The confidence planner never wires across to the build plan because the build plan is not there yet; the build planner never *decides* scope, it only *reads* and *wires*. This cleanly separates the two judgments and needs no shared review-bead author.

  For a behavior the confidence planner declined to test (recorded "no test needed"), the build planner still mints its implementation bead (completeness from the spec) with no test dependency.

- **Findings-loop wiring (the summons mechanism).** The review bead carries the *static* canonical block (the `<!-- omg-test-aware -->` steps in `omg-epics`), authored once by the orchestrator. Because it is now **always** present (verification is a standard phase, not an operator toggle), it need not be *conditionally* installed by a planner — which is exactly why the second author disappears. The reviewer executes that static block as its work order at review time: on an epic-scoped finding it files the fix `x` and the summons bead `y` and wires them (below). The confidence planner is summoned *later*, at build time, by `y` — it does not pre-author the review bead.

So the two channels are: **build planner reads test beads → wires satisfies-test edges** (original graph), and **static review-bead block → summons planner** (findings). Neither is a planner writing the review bead. OQ2 resolved.

### Resolution of OQ3 — the single test-authorship path

With all tests written by the test-writer from confidence-planner beads, v1's "builder writes baseline, planner reserves independent" distinction dissolves. There is **one** authorship path: the confidence planner mints a test bead; the foreman dispatches it (`agent=omg-tester`) to the test-writer; the test-writer writes it. The implementer's only relationship to a test is **satisfying** it.

For this to be true with no residual authorship path, two instrument changes are required (both flagged for build):

1. **`omg-builder` must stop writing tests.** Its persona today says *"you implement features, fix bugs, and write tests."* Per R5, that sentence must be **deleted outright, not merely left unmentioned** — an unmentioned-but-present charter is the residual authorship path this design exists to close, so leaving it in place while relying on other prose to steer around it would reopen the exact gap OQ3 resolves. The implementation agent authors and alters **no** test and mints **no** test scope. The `omg-builder` skill's discovered-work rule stands (it still files beads for gaps), but a "missing test" it notices is filed as a finding/discovered bead routed to the confidence planner's franchise, not written by the builder.
2. **`omg-builder` must not hold the `test-writing` skill** (it already does not) **and is designed for an eventual test-directory read-deny.** No design step may assume the builder can read tests. This is why the split is two agents (`adr.platform.verification-independence.0001`): per-agent permission is the enforcement point.

The test-writer's `omg-tester` already honors a pre-planned bead's wiring intent (its Workflow section: "write the *failing* test for a Case-A bead, author/run the post-fix test for a Case-B bead"). That is preserved; it is the sole author. OQ3 resolved: **no residual place the implementer produces a test.**

### The two-hop done-target metadata chain (R7)

The implementer must be able to answer "which focused test proves I am done?" **without reading any test file** — because the deferred read-deny (R6) will bar it from the test directory, and a done-target it can only learn by reading test source would break the moment that permission lands. The reference is therefore carried in **bead metadata**, written in two hops, each by the agent that authoritatively knows the value at the moment it knows it. Neither hop can be collapsed into the other: the stable reference exists at plan time but the concrete selector does not exist until the test is written.

**The two metadata fields.** These are the concrete data the chain rides on (exact field names are a build-time detail for the spec; the shape is fixed here):

- On the **implementation bead** — a `test-beads` reference: the bead id(s) of the test bead(s) this implementation must satisfy. Written by the **build planner** at plan time (hop 1), because the test beads already exist (R2) and their ids are stable.
- On the **test bead** — a `run-selector`: the concrete, runnable identifier of the test the test-writer just authored (test file + test name/filter). Written by the **test-writer** at test-write time (hop 2), because it is the only agent that can — it just wrote the test and knows its real, valid identifier. The build planner cannot pre-commit this at plan time: the test does not exist yet.

**The resolution flow (hop 3, at build time).** The implementer, working an implementation bead, reads its own bead's `test-beads` reference, queries each referenced test bead's metadata for its `run-selector`, and runs exactly those selectors. It resolves the chain through **bead metadata only** — `bd` queries against beads it is entitled to read — and **never reads the test's source**. The Case-A `test blocks implementation` edge (R2, and the build planner's default wiring) guarantees the test bead is written and *closed* — and therefore its `run-selector` is present — before the implementer's bead comes ready. So the selector is always populated when the implementer needs it.

**Why this adds no gating edge, and the termination proof still holds.** The metadata chain is **data written onto beads that already exist**, not a new dependency. The only relationship it *relies on* — that the test bead is closed before the implementer runs — is the **already-present** Case-A `test blocks impl` edge counted in Region 1 and Region 2 of the termination proof. The chain introduces no `bd dep add`, no new bead, and no new gate. Termination is therefore untouched by R7: the proof below stands exactly as written.

**Why skill-instructed rather than enforced is acceptable.** Both writes are runbook discipline, not harness-enforced (the harness does not validate that a build planner stamped `test-beads`, nor that a test-writer stamped `run-selector`). This is safe because **R8 is the safety net**: if either write is skipped or malformed, the implementer's focused-run path degrades — the impl bead has no focused target, or a stale one — but the **full-suite run at the review bead** (below) still exercises the planned test and files a finding if it is red. A broken chain costs the fast focused path; it never lets broken code ship. The failure mode is "caught at review," not "ships green."

### The findings-driven mechanism (the hard core), re-homed

Names, unchanged from v1: **`R`** = the epic's review bead; **`x`** = a finding's fix bead (`agent=omg-builder`); **`y`** = the summons bead (`agent=omg-test-planner`), a **real, non-ephemeral** child; **`z`** = a planned test bead (`agent=omg-tester`).

The re-homing changes **who authors `R`** (the orchestrator, once, statically — not the planner) and **who writes `z`** (always the test-writer, never the builder). It changes **no edge** in the loop. The summons bead is still required and still real, because the confidence planner runs at plan time but a finding arrives at build time, so the finding must *summon* the planner back as a dispatchable bead — and `bd ready` hides ephemeral beads, so `y` must be real (v1's central constraint, preserved).

**Hard rules — the static review-bead block (authored once by the orchestrator) tells the reviewer, on an epic-scoped build finding:**

1. File the fix bead `x`, `agent=omg-builder`, `--parent <epic> --no-inherit-labels`, `discovered-from:<R>`.
2. File the summons bead `y`, a **real** bead (no `--ephemeral`), `agent=omg-test-planner`, `--parent <epic> --no-inherit-labels`, `discovered-from:<R>`.
3. Wire `y` blocks `x`: `bd dep add <x> <y>`.
4. Wire `R` depends on `x`: `bd dep add <R> <x>`.
5. Reopen `R`: `bd update <R> --status open`.

**The queue carries it, zero foreman/reviewer routing change:** the foreman's next `bd ready` surfaces `y` (real, unblocked); `x` is hidden (blocked by `y`). Foreman reads `bd state <y> agent` → `omg-test-planner` → dispatches `y`. The confidence planner, working `y`, decides `x`'s verification, wires Case A or Case B (below), and **closes `y` in every branch** — the mandatory close, the one deadlock guard.

- **Case A — design-before-fix:** `z` blocks `x` (`bd dep add <x> <z>`). After `y` closes: `z` ready → **test-writer** writes the failing test, closes `z` → `x` unblocks → **implementer** makes it pass, closes `x` → `R` unblocks.
- **Case B — run-after-fix:** `x` blocks `z` (`bd dep add <z> <x>`) **and** `z` blocks `R` (`bd dep add <R> <z>`). After `y` closes: `x` unblocks → implementer fixes, closes `x` → `z` unblocks → test-writer runs/authors the test, closes `z` → `R` unblocks.
- **No-test:** no `z`; planner records the reason, closes `y` → `x` unblocks → implementer fixes → `R` unblocks.

The only difference from v1 in these traces is that `z` dispatches to the test-writer and `x` to the implementer — which was already true in v1 (`z` was `agent=omg-tester`, `x` was `agent=omg-builder`). The separation adds **no** edge and **no** new bead to the core loop.

### The failing-test escape hatch (new in v2), Modes 1 and 2

A focused test going red is the **normal** build step, not an alarm (R13): the implementer iterates red → green using the run output to judge progress. It escalates **only when genuinely stuck** — when the output shows the test is wrong or impossible to satisfy, not merely unmet. When it does escalate, it **never** modifies the test, forces it green, or closes silently. It files a bead and the blocked work waits. The recognition and routing (OQ4):

**Recognition — how the implementer classifies the failure, on the R7 chain.** The implementer knows this epic's planned test beads (the `z` beads its own implementation bead references via the R7 `test-beads` metadata, and the epic's `z` set visible via `bd dep tree`), and each `z` bead's `run-selector`. A failing test is:

- **Mode 1** if the failing selector is *one of this epic's planned tests* (a `z` for this epic, matched by `run-selector`) that is wrong or impossible to satisfy.
- **Mode 2** if the failing selector is *outside this epic's planned `z` set* — a pre-existing test the implementer's change broke that no `z` in this epic planned. The discriminator is membership in this epic's `z`-bead `run-selectors`: a failing selector inside → Mode 1, outside → Mode 2.

> **Read-deny interaction (buildability, low-risk).** Once the implementer is denied *read* access to the test directory (deferred), it cannot read the failing test's file to classify it by contents. Classification therefore keys on **test-run output** (the failing test's name/path as the runner reports it) matched against this epic's `z` beads' recorded `run-selectors` (R7) — information available without reading test source. The design keys recognition on run output + bead metadata, never on reading the test file, so enabling the read-deny later does not break Mode discrimination. And because the review-bead full-suite run (R8) is the systematic backstop, a mis-classification degrades to "caught at review," not "ships broken." Flagged as OQ-A.

**Mode 1 — routed to the confidence planner.** The implementer files bead `w₁`, `agent=omg-test-planner`, `--parent <epic> --no-inherit-labels`, `discovered-from:<x>`, and wires **`w₁` blocks `x`** (`bd dep add <x> <w₁>`) so `x` waits. The foreman dispatches `w₁` to the confidence planner, which:

- **Upholds** the test: comments the reasoning on `x` (why the test is right and the implementation must meet it), closes `w₁`. `x` unblocks; the implementer resumes with the reasoning in hand.
- **Re-plans** the test: mints a corrected test bead `z′` (`agent=omg-tester`), wires it Case A (`z′` blocks `x`), closes `w₁`. `z′` → test-writer rewrites the test, closes `z′` → `x` unblocks. The implementer **never edits the test**.

**Mode 2 — routed to the PM.** The implementer files bead `w₂`, `agent=omg-product-manager`, `--parent <epic> --no-inherit-labels`, `discovered-from:<x>`, and wires **`w₂` blocks `x`**. The foreman dispatches `w₂` to the PM (which has product-intent authority and Hindsight memory of why the prior guarantee exists). The PM resolves one of three ways:

- **Old behavior was intended (the change is wrong):** kick back — comment the correction on `x`, close `w₂`. `x` unblocks; the implementer reworks to preserve the prior behavior.
- **The change is intended (the old test is stale):** mint a **test-update bead** `u` (`agent=omg-tester`) targeting the prior-epic test, wire `u` blocks `x` (so the fix does not land while the stale test still fails against it) — or Case-B if the update must follow the change — close `w₂`. The test-writer updates the prior test; the implementer proceeds.
- **Genuine product decision (the PM cannot decide):** the PM does **not** close `w₂`. It places a **human gate** on it — `bd gate create --type=human --blocks <w₂> --reason "…"` — which hides `w₂` from `bd ready` until a human resolves the gate (`bd gate resolve <gate-id>` / `bd close <gate-id>`). This pauses the epic *cleanly*: `w₂` still blocks `x` (so the fix waits) but no longer appears as dispatchable work, so the foreman neither re-dispatches it nor mistakes the epic for done. **The gate, not the label, is what pauses** — adding the `human` label alone would leave `w₂` on `bd ready` and the foreman would re-dispatch it in a loop; the gate is the load-bearing mechanism. Once the human resolves the gate, `w₂` returns to `bd ready`, the PM records the human's decision, and it follows one of the two branches above (kick-back or mint `u`), then closes `w₂`.

**The Mode-2 decision lands in the build report — via the report-writer bead, not the foreman.** The PM records its Mode-2 decision as a **comment on `w₂`** (and on `x`), because the build report is synthesized from bead comments ("Gather the raw material from the beads, not your memory"). The `discovered-from:<x>` link and the `w₂` comment make the cross-epic decision a durable, discoverable event on the graph. Under R16 the synthesis is no longer the foreman's inline act: the **report-writer bead** (below) reads these comments and writes the Mode-2 resolution into the build report in the docs tree. The report-writer **stops there — it does not ship**. The decision reaches Hindsight only when the separate docs→Hindsight sync command is deliberately invoked (R16); at that point it enters the same memory the PM consults for the next such collision, and surfaces to the human (informed, not gated). This closes OQ4's "how it lands in the build report" and rehomes the "en route to Hindsight" half onto the deliberate sync act.

### The two-tier done-check: focused per bead, full suite once at the review bead (R8)

Validation splits into two tiers, and the split is deliberate: the fast tier runs constantly and cheaply; the systematic tier runs once and catches what the fast tier structurally cannot.

- **Per-bead (focused).** The implementer validates its own bead by running **only its focused test target** — the selector(s) resolved through the R7 metadata chain — and iterating red → green (R13). It does **not** run the whole suite; a full-suite run per implementation bead would cost full-suite time and tokens once per bead, for a signal the review-bead sweep gives once. The focused run is the implementer's done-check for *its own* work.
- **At the review bead (full suite, exactly once).** The review bead runs the **entire test suite one time**. This is the systematic catch for the two things no focused per-bead run can see: (a) a **prior-epic test this epic broke** (Mode 2, R13) — invisible to any focused run because no focused target in this epic points at it; and (b) a **hole left by a broken R7 metadata chain** — a planned test that never got wired to a focused run, so no implementer ever ran it. The full suite exercises both.

**The run command is inferred, not configured.** The suite run command is **not** onboarding-configured. The agent infers the runner from the repo's tooling (package manifests, test config, conventional layout) and may consult the web for an unfamiliar stack. This keeps a brittle per-repo "test run command" out of onboarding; only the R6 read-deny needs onboarding, because a *permission boundary* cannot be self-configured but a *run command* can be inferred. (Non-Goals records this: no per-repo run-command config.)

**Why the reviewer running the suite does not break "blind to test mode."** This is the reconciliation R8 forces, and it holds. Running a suite and filing findings on the failures is **work-order execution**, not test-awareness:

- The reviewer already fetches its review bead and executes it as a work order (`omg-review` "Process": `bd show <R>`, then carry out the standard steps *plus any filing steps the bead body names*). "Run the suite; file a finding for each red test" is one more such step in the static review-bead block — the same *kind* of instruction as "read every changed file."
- The reviewer needs **no** knowledge of test mode, of which tests are this-epic's `z` beads, or of any test's source to do this. It runs a command, reads pass/fail, and files findings — exactly the disposition it already has.
- **The Mode-2-vs-fix routing is the reviewer's existing change-locality judgment, expressed as a *label*, not as a block decision (R15).** When the full suite goes red, the reviewer files a finding bead that **blocks the review bead** — the existing file-and-reopen discipline, unchanged. What its change-locality judgment sets is only the finding's **`agent` label**: a failure caused by this epic reddening a **prior** guarantee is labeled for the **PM** (Mode 2); a failure that should be fixed **in this epic** is labeled for the **builder**. *Either way the finding blocks the review bead.* This is the resolution of the old OQ-E, and it is a correction to this design's earlier reading: a red prior-epic test is **not** an "out-of-scope standalone finding that does not hold the epic hostage." Because the breakage is *caused by this epic's change*, the epic cannot honestly ship over it, so it blocks like any in-scope finding — the reviewer's locality judgment picks the *handler*, never whether to block. This keys on the change diff (which code the epic authored), **not** on reading the failing test or knowing "test mode."
- **No new blocking machinery.** R15 adds no bead kind and no gate to the review path itself: the red-suite finding rides the identical `x → R` file-and-reopen edge the reviewer already uses, the foreman dispatches it by label, and when the handler closes it the review bead re-fires from a fresh context. The label does the routing; the block is ordinary.

So R8 adds a **responsibility** to the review bead (run the suite once) without adding **test-awareness** to the reviewer, and R15 confirms the red-suite finding blocks through the ordinary mechanism. The property in R11 — "the reviewer stays blind to test mode; it executes the review bead as a work order" — survives intact.

### The epic's terminal work is beads on the graph (R16, Goal 8)

v1 (and today's foreman) has a **special terminal branch**: when `bd ready --parent <epic>` returns nothing, the foreman leaves its dispatch loop and inline-runs "Closing the epic → The build report → Shipping" — it confirms close-eligibility, *authors the report itself*, and *ships both the epic and the report to Hindsight*. R16 dismantles this. The terminal work becomes ordinary labeled beads, and shipping leaves the automated flow entirely. This is the single largest structural change in this round, and it makes the foreman **simpler** — it loses its one piece of non-routing state — which is the direction Goal 6 demands where the foreman changes.

**What the terminal work is, as beads.** At plan time the decomposer mints, alongside the review bead, a **report-writer bead** `P`:

- `P` = the report-writer bead, `agent=omg-reviewer`, `--parent <epic> --no-inherit-labels`. **`P` blocks on the review bead `R`** (`bd dep add <P> <R>`): the report describes the finished epic, so it must not be written until `R` is green and all findings/fixes have drained. `P` is the *last* child to come ready.

`P`'s body (a static block owned by `omg-epics`, authored once by the decomposer exactly as `R` is) instructs its handler to: read every child bead's comments (`bd comments`), synthesize the build report using the `doc-templates` `build-report` template, mint its `id` via `next-id.sh`, write it to the docs tree at the resolver-computed path, give it a `hindsight` block iff the build carried something worth remembering (else omit it), and **stop.** `P` writes the report and closes; it performs **no** Hindsight write and **no** epic ship.

**Why the report-writer bead is labeled `omg-reviewer`, not a new agent, and not the foreman.** Three candidates were weighed:

- **Foreman-as-worker (rejected).** Keeping the foreman as the report author is exactly the terminal state R16 removes — it re-creates a "queue-empty → the foreman now does authoring work" branch, which is the human-gate trap's structural cause and a violation of "the foreman only dispatches." Rejected outright: it defeats the point of the change.
- **A dedicated `omg-report-writer` agent (rejected as gold-plating).** A new agent would need its own persona, permissions (read-only on code, `write **/*.md`), and skill — an instrument with exactly one job that an existing agent already has the shape for. `adr.platform.memory-lifecycle.0001` §5 **already assigns build-record synthesis to the review agent** ("at the epic's review bead, the review agent synthesizes those deviations into a dedicated in-tree build-record document"). Minting a separate agent would contradict a standing ADR and add a role with no franchise the reviewer lacks. Rejected: complexity with no buyer.
- **The reviewer (`omg-reviewer`) as report-writer (chosen).** The reviewer is already read-only on code, already synthesizes from bead evidence, already executes a bead body as a work order, and is **already named as the build-record author by `adr.platform.memory-lifecycle.0001` §5**. Labeling `P` `agent=omg-reviewer` reuses that exact disposition. The reviewer needs one added permission it does not have today — `write` scoped to `**/*.md`, to author the report file (it is `edit: deny` today) — which is a narrow, doc-only grant that does not touch its code-review blindness. The report-writer bead is a *different bead* from the review bead `R` (different job, blocked behind `R`), dispatched to the same agent by the same label; this reuses the agent without conflating the two beads. **Chosen** — it aligns with the memory-lifecycle ADR and adds no instrument.

  *One consistency note this forces (flagged for the spec):* `omg-reviewer` is `edit: deny` today. Authoring the report requires a `write`/`edit` grant scoped to Markdown. This is a required frontmatter change — narrow, and it does not weaken the reviewer's read-only stance toward *code* (the grant is `**/*.md` only). Flagged in the Instruments checklist and buildability review.

**How the epic-before-report ordering becomes a dependency edge.** Today "the epic ships first, then the report" is an *inline foreman rule* ("Order is not negotiable: the epic ships first"). With shipping gone from the automated flow, the only ordering the automated flow still owns is **report-after-epic-work**, and that is now the `P` blocks `R` edge: `P` cannot come ready until `R` (and thus every child) is closed, so the report is always written after the epic's work is genuinely done. The *ship* ordering (epic before report) is no longer an automated-flow concern at all — it moves to the **sync command's own logic**, which is deferred (R16); the sync command, when built, owns "ship the epic bead before the tree-sourced report," reconciled against `adr.platform.memory-lifecycle.0001` (which already fixes epic-ships-at-close and report-ships-tree-sourced).

**What the foreman still does at queue-drain — nothing special.** The foreman's "Closing the epic / The build report / Shipping" sections are **removed** from its skill. In their place: when `bd ready --parent <epic>` returns `R` (after all fixes drain), the foreman dispatches `R` to the reviewer like any bead; a green `R` closes, which unblocks `P`; the next `bd ready` surfaces `P`, and the foreman dispatches `P` to the reviewer like any bead. When `bd ready` *then* returns empty, every child — including the terminal beads — is closed, and the epic is close-eligible with **no authoring step left for the foreman to do**. The foreman may still run `bd epic close-eligible` to close the epic bead (a routing-neutral bookkeeping close, not the ceremony), but it writes nothing and ships nothing. An empty queue now means exactly one thing — *everything is done* — which is the property the human-gate-trap removal rests on (below).

**Why this removes the human-gate trap structurally, not by a guard.** Before R16, the foreman's logic was "queue empty → begin shipping." That leap was unsafe under R15's human gate: a gated `w₂` hides from `bd ready`, so the queue could read empty *while a fix was still pending a human*, and the foreman would mistake a paused epic for a finished one and ship it. R16 removes the leap. Now "queue empty" triggers **no terminal action** — the terminal work is beads that must themselves come ready and be dispatched. A human-gated epic has a hidden-but-open `w₂` still blocking `x`, so `R` never closes, so `P` never comes ready, so the epic is **not** close-eligible: the paused epic simply idles with open (blocked) work, indistinguishable from any other in-progress epic, and no report is written and nothing ships. The trap is gone because the dangerous inference ("empty queue ⇒ done ⇒ ship") no longer exists — not because a new check was added to catch it. This is the structural removal Goal 8 and R16 call for.

**"Epic close ≠ shipped to memory" is now an intentional semantic.** Closing the epic bead produces artifacts — the closed graph, the build report in the docs tree — and commits **nothing** to Hindsight. Durable memory enters only when a human deliberately invokes the docs→Hindsight sync command. This is what makes a future PR/merge workflow safe: a build that finishes on a branch that may never merge must not push memory into canon as a side effect. The boundary this design draws — *the automated flow stops at the written report; shipping is a separate deliberate act* — is exactly the seam a future `ship_at: close | merge` mode (Deferred) plugs into without reworking the build loop. Whether that ADR's decision belongs on the plan-time-orchestration ADR is addressed in this design's companion ADR update (see Related Documents / the ADR reconciliation).

### Re-derived proof of termination and no-leak (traced, not asserted)

The graph is a DAG (`bd dep add` runs cycle detection; `bd swarm validate` confirms). Termination must now hold over a **larger** bead set than v1: the original graph, the findings loop, the escape-hatch beads (`w₁`, `w₂`, `z′`, `u`), **and — new this round — the terminal beads (`P`) and a possible human gate on `w₂`** (R15/R16). Two properties give termination: (1) every edge added anywhere is a **forward blocks-edge** (later bead → earlier bead), so no cycle is introduced and a topological order always exists; (2) every bead that gates others is eventually **closed by a live agent the foreman can dispatch, or by a bounded external actor (a human at a gate)**, so no gate is permanent. Trace each region:

**Region 1 — the original graph (plan-phase output).** Implementation beads, test beads, and `R`. Edges: `z` blocks `impl` (Case-A default from the build planner), `R` depends on every child. Close order: each `z` (test-writer) → its `impl` (implementer) → … → `R` (reviewer). All forward; drains. Unchanged in shape from a normal epic; the test-writer/implementer split changes only *which agent* closes `z` vs `impl`, both dispatchable. ✓

**Region 2 — the findings loop.** Edges `y → x → R` always; `z → x` (Case A) or `x → z → R` (Case B). Every gating bead is closed by a dispatchable agent: `y` by the confidence planner (mandatory close), `z` by the test-writer, `x` by the implementer. Close orders — Case A: `y, z, x, R`; Case B: `y, x, z, R`; no-test: `y, x, R` — identical to the v1 proof because the re-homing added no edge. The single-author review bead does not change this: `R`'s body is now static (authored once) rather than rewritten, which *removes* the v1 idempotency hazard (no "stacking a second copy") rather than adding one. ✓

**The R8 full-suite run is a finding source into Region 2, not a new region.** When the review bead runs the full suite and a test is red, the reviewer files a finding — an in-scope fix (feeding Region 2's `x`/`y`/`z` loop) or an out-of-scope / cross-epic finding to the PM (feeding Region 3's Mode-2 path). Either way the red suite re-enters an **already-proven** region through the reviewer's ordinary file-and-reopen discipline; it adds no edge and no bead kind of its own. The full-suite run therefore introduces no new termination obligation — it only *supplies* the loops already traced. A run that is all-green files nothing and the review bead closes normally. ✓

**The R7 metadata chain adds no gate to any region.** As shown in the metadata-chain section, the chain is data on existing beads and relies only on the Case-A `test blocks impl` edge already counted in Regions 1 and 2. It introduces no `bd dep add`, no bead, and no gate; the close orders above are unchanged. ✓

**Region 3 — the escape hatch.** New in v2; must be shown not to wedge.

- **Mode 1.** Edge `w₁ blocks x` (forward: `x` is earlier work `w₁` gates). `w₁` is `agent=omg-test-planner` — dispatchable, and the planner's runbook mandates closing it in every branch (uphold or re-plan), the same consumed-bead discipline as `y`. On re-plan, `z′ blocks x` is a forward edge closed by the test-writer. Close order (uphold): `w₁, x, …`. Close order (re-plan): `w₁, z′, x, …`. Both forward; both drain. ✓
- **Mode 2.** Edge `w₂ blocks x` (forward). `w₂` is `agent=omg-product-manager` — dispatchable. The PM closes `w₂` in the two branches it can decide: kick-back (`w₂, x, …`), test-update (`w₂, u, x, …`, `u` forward, closed by test-writer). In the **cannot-decide** branch it places a **human gate** on `w₂` (`bd gate create --type=human --blocks <w₂>`) and does *not* close it. **The human gate is a bounded external gate, not a deadlock:** while open, the gate hides `w₂` from `bd ready` (so the foreman does not re-dispatch it) but `w₂` still blocks `x`, so the fix waits — this is the same class of intentional pause as any human decision point, an actor who *will* act, not a cycle with no resolver. When the human resolves the gate (`bd gate resolve`/`bd close <gate-id>`), `w₂` returns to `bd ready`, the PM records the human's decision and closes `w₂` into kick-back or test-update, and the graph drains. Note the mechanism correction R15 forces: the pause is the **gate**, not a `human` *label* — the label alone would leave `w₂` dispatchable and the foreman would re-dispatch it endlessly; only the gate removes it from the ready queue. ✓

**Region 4 — the terminal beads (`P`).** New this round. Edge `P blocks R` (forward: `R` is earlier work `P` gates). `P` is `agent=omg-reviewer` — dispatchable — and its body is a self-contained work order (write the report, close). `P` gates nothing else (it is the last child; `R` does not depend on `P` — the edge runs the other way, `P` depends on `R`), so it introduces no back-edge and cannot cycle. Close order: `…, R, P` — `R` closes last of the *work* beads, which unblocks `P`, which the foreman dispatches and which closes, after which the queue is empty and the epic is close-eligible. The former inline "queue-empty → author report → ship" branch is gone; the report is authored by closing `P` and nothing ships. ✓

**A human-gated epic is a correct idle state, not a leak.** When a human gate is open on `w₂`, the graph does **not** drain — and that is correct, not a deadlock or a leak. Trace: gated `w₂` hides from `bd ready` but still blocks `x`; `x` blocks `R`; `R` blocks `P`. So `R` cannot close, `P` cannot come ready, and the epic is **not** close-eligible. The foreman's `bd ready --parent <epic>` returns empty *of dispatchable work* while an open (blocked) `w₂` remains — the epic simply idles as in-progress, identical to any epic waiting on a slow worker. No report is written, nothing ships, no bead is lost or compacted (the gate and `w₂` are both real, open, and auditable). The idle state resolves the instant the human acts. This is a **bounded pause with a designated resolver**, which is a legitimate terminal-adjacent state of the graph, not a wedge. ✓

**No permanent gate.** Every gating bead (`R`, `P`, `x`, `y`, `z`, `z′`, `w₁`, `w₂`, `u`) is closed by an agent the foreman can dispatch (by label) or, for a gated `w₂`, by a human resolving the gate. No bead's closure depends on an actor no one can reach. The one deadlock class — a summons/escape bead left open blocking its fix forever — is guarded by the **mandatory-close** discipline stated in both the relevant agent persona and the `omg-epics` wiring section for `y`, and extended by this design to `w₁` (planner) and `w₂` (PM). The human-gated `w₂` is the one deliberate exception, and it is bounded by an external actor, not permanent. ✓

**No leak.** `y`, `w₁`, `w₂`, `z′`, `u`, and `P` are all **real** beads and are all **closed** (or, for a gated `w₂`, held open by a real, auditable gate awaiting a human — never silently dropped), leaving normal bead records (a desirable audit trail). No ephemeral beads exist anywhere, so nothing can be TTL-compacted out from under an open dependency. The report-writer bead `P` and the human gate add real, closeable/resolvable records, not ephemeral state. ✓

**The independence property is preserved by ordering, not by the loop's edges.** Independence comes from the test being authored *before* and *apart from* the implementation. In the original graph, `z blocks impl` (build-planner default) plus the test-writer running in its own dispatch delivers both. In the findings loop, Case A (`z blocks x`) delivers it for reviewer-surfaced fixes; Case B (fix-then-test) is the deliberate exception for post-fix assertions, and the fresh-context test-writing dispatch (below) preserves isolation even there. Termination and independence are therefore both structural, not asserted.

### Independence in all build-loop modes (the looping-mechanics extension)

`adr.platform.verification-independence.0001` requires context isolation for test-writing in **all** build modes; PRD R6 (structural independence) permits extending looping mechanics and PRD R9 forbids touching routing. The foreman skill's three modes and the required extension:

- **`one_agent`** — one builder reused across beads via `task_id`. The reviewer is *already* spawned fresh. **Extension:** the **test-writer must also be spawned in a fresh context**, never reusing the builder's `task_id` — otherwise a `z` and the code it verifies would be authored in one accumulating context, fusing them. The dispatch-by-label already routes `z` to `omg-tester`; the mechanics change is only "do not reuse the builder context for the test-writer."
- **`one_agent_fresh_contexts`** — every bead already gets a fresh context; test-writing is isolated by default. No change.
- **`multi_agents`** — every bead is a fresh context; isolated by default. The same-file concurrency guard (dependency wiring serializes `z` and its `x`) is the decomposer's existing discipline, inherited by the build planner for `z` beads (`omg-epics` same-file `z` sequencing rule). No routing change.

The extension lives in the `omg-foreman` **skill's build-modes section** (looping mechanics), not in the agent persona and not in routing. The foreman still reads a label and dispatches; it simply, in `one_agent` mode, spawns a fresh context for an `omg-tester` bead as it already does for an `omg-reviewer` bead. This is the sole foreman-side change and it is confined to mechanics, satisfying R6 and R9.

### Instruments to Create / Change (the build checklist)

Ownership follows the who/how/ask split. This is the architect's inventory; the spec (`.0002`) will make each an acceptance-tested requirement.

| Instrument | Action | Rationale |
|---|---|---|
| `omg-decomposer.md` (agent) | **Edit** | Becomes the plan-time orchestrator: drive test-planning → build-planning → author review bead **→ mint the terminal report-writer bead `P`** (`agent=omg-reviewer`, blocked behind `R`), as sequential subagent dispatch. **Add `task:` permission** (scoped to `omg-test-planner`, `omg-build-planner`) — without it the orchestrator cannot dispatch. Absorbs no planning judgment. Minting `P` at plan time is what moves the terminal work onto the graph (R16). |
| `omg-build-planner.md` (agent) | **Create** | New role: build judgment. Read-only on source (mirror decomposer frontmatter shape: `write/edit: false`, `bash: allow`). Mints one implementation bead per spec requirement/AC (completeness from the spec), reads test beads, wires `z blocks impl`, and **writes the `test-beads` id(s) onto each implementation bead** (R7 metadata chain, hop 1). Mints **no** test scope. |
| `omg-test-planner.md` (agent) | **Edit** | Retarget from v1's operator-invoked, `R`-rewriting planner to: (a) a plan-phase pass that mints test beads and records no-test decisions, and (b) the build-time summons authority (`y`) and the Mode-1 escape authority (`w₁`), mandatory-close on both. **Remove** the two-step "also rewrite `R`" contract (the orchestrator owns `R` now) and the convergence-survey machinery whose job was to detect the other author. |
| `omg-tester.md` (agent) + `test-writing/SKILL.md` | **Edit** | Already the sole test-writer, honors Case-A/B pre-planned beads. **Add: write the concrete `run-selector` (test file + name/filter) onto the test bead after authoring the test** (R7 metadata chain, hop 2) — the test-writer is the only agent that can, since it just wrote the test. Confirm it authors the Mode-1 `z′` and Mode-2 `u` test-update beads the same way (and stamps their `run-selectors` too). |
| `omg-builder.md` (agent) + `omg-builder/SKILL.md` | **Edit** | **Delete the "and write tests" sentence outright** from the persona (R5: it must be removed, not left unmentioned, or the residual authorship path stays open). Writes only code, authors/alters no test, mints no test scope. **Resolve the R7 metadata chain** to find its focused done-target: read its own bead's `test-beads` ref, query those beads' `run-selectors`, run exactly those — **via bead metadata only, never reading test source**. **Run only the focused target, not the full suite** (R8), iterating red → green (R13). Add the escape-hatch procedure: on a genuinely-stuck test, classify Mode 1 vs Mode 2 (by run output matched against this epic's `z`-bead `run-selectors`), file `w₁`/`w₂`, wire it to block its own bead, never edit the test. Designed for the deferred test-dir read-deny. |
| `omg-epics/SKILL.md` (**both** trees) | **Edit** | Add the **plan-phase sequence** (mint → dispatch test-planner → dispatch build-planner → author review bead **→ mint the terminal report-writer bead `P`, `agent=omg-reviewer`, `P blocks R`** → validate). Update the **Test-planning wiring** section: the review bead is authored **once by the orchestrator** from the static block (drop the planner-rewrites-`R` framing); add the build-planner's `z blocks impl` default wiring **and the hop-1 `test-beads` metadata write**; add the **static review-bead step to run the full suite once and file findings on red** (R8), with the **change-locality label rule (PM for prior-guarantee break, builder for in-epic fix) and the always-blocks framing** (R15); add the escape-hatch wiring for `w₁`/`w₂`/`z′`/`u` with mandatory-close for `w₁`, and for `w₂` the **`bd gate create --type=human --blocks <w₂>` pause on the PM's cannot-decide branch** (not a `human` label); **add the static `P` body block** (read comments → synthesize report → mint id → write to docs tree → optional `hindsight` block → **stop, do not ship**). Keep both trees byte-identical. |
| `omg-foreman/SKILL.md` (**both** trees) | **Edit** | Two changes. **(1) Mechanics (`one_agent`):** spawn the test-writer (`omg-tester`) in a **fresh context**, as the reviewer already is — **no routing change**. **(2) Remove the terminal branch (R16):** delete the **"Closing the epic," "The build report," and "Shipping"** sections and the description-line "then writing the build report and shipping…" — the foreman no longer authors the report or ships. Replace with: when the queue drains to the terminal beads, dispatch them by label like any bead; when the queue is genuinely empty, the epic is close-eligible and the foreman may `bd epic close-eligible` (bookkeeping only — no authoring, no shipping). The dispatch loop and label-dispatch are otherwise untouched. |
| `omg-review/SKILL.md` (**both** trees) | **Edit** | Two things. **(1) R15 red-suite finding:** confirm the fetch-and-execute contract carries the R8 full-suite run as a step in the static review-bead block; add that a red-suite finding **always blocks** the review bead and the reviewer's change-locality judgment sets only the finding's **`agent` label** (PM for a prior-guarantee break, builder for an in-epic fix) — a correction to the earlier "out-of-scope standalone" reading (OQ-E is now resolved: it always blocks). **(2) Report-writer bead `P`:** the reviewer now also handles the terminal `P` bead — a *different* bead from the review bead — executing its static body to write the build report and **stop** (no ship). This is the memory-lifecycle ADR §5 "review agent synthesizes the build-record" role, now realized as a dispatched bead. **Grant note:** `omg-reviewer.md` is `edit: deny` today; authoring the report needs a `write`/`edit` grant scoped to `**/*.md` only (does not weaken code-review blindness) — a required frontmatter change flagged in the buildability review. |
| `omg-product-manager.md` (agent) | **Edit** | Add the Mode-2 adjudication procedure: resolve a `w₂` (kick-back / mint `u`), record the decision as a comment on `w₂` and `x` for the report-writer bead to fold in, close `w₂`. On the **cannot-decide** branch, **place a human gate** (`bd gate create --type=human --blocks <w₂>`) and do **not** close `w₂` (correction: the pause is the gate, not a `human` label). Uses Hindsight. |
| `omg-foreman.md` (agent persona) | **Edit** | Persona description says the foreman writes the report and ships; **remove that** (R16). The foreman dispatches, full stop — it holds no terminal state and no authoring/shipping role. (This aligns with the `adr.platform.beads-sync-ownership.0001` orchestration-layer migration, which already puts the foreman persona in scope for shedding terminal `bd dolt`/ship narration.) |
| `omg-decompose.md` (command) | **Edit** | The *ask* now covers the full plan phase (verification planning is standard, and the terminal report-writer bead is minted). Point at the `omg-epics` plan-phase sequence. |
| `omg-test-plan.md` (command) | **Retire / remove** | v1's operator-invoked entry point, explicitly retired by R12. Verification planning is now a standard part of `/omg-decompose`; a standing invocation surface is exactly the optionality this removes, and keeping it would let an operator re-import the opt-in model out of band. Its removal is a deliberate scope decision (flagged in the buildability review; cleanup tracked as OQ-C). |
| docs→Hindsight **sync command** (new; name TBD, e.g. `omg-ship` / `omg-sync`) | **Create — behavior deferred (R16)** | The new home for shipping *both* the epic bead and the tree-sourced build report to Hindsight, invoked deliberately when the docs are canon. This design **names the boundary and the removal only**; the command's full behavior — including the ship ordering (epic before report) that was an inline foreman rule, and the deferred question of **deleting superseded docs** — is its own effort, reconciled against `adr.platform.memory-lifecycle.0001` (which already owns supersession/retraction and the epic-ships-at-close / report-ships-tree-sourced rules). Not built here. |

## Alternatives Considered

Held to the binding constraints, not strawmanned.

### For OQ1 — the plan-phase sequencing mechanism

**A. Sequential subagent dispatch by the orchestrator (chosen).** The decomposer Task-dispatches test-planner then build-planner, ordering guaranteed by each dispatch returning before the next.

- *Why it wins:* Ordering is free (no queue to race); it uses only the Task-dispatch capability primary agents already have; it keeps each planner's judgment in its own agent; it dissolves the v1 command-chaining blocker without new harness support. The only cost is granting the decomposer `task` permission — a small, honest change.

**B. Plan-time dependency beads drained by the orchestrator.** Mint `plan-tests` and `plan-build` beads wired in sequence and have the orchestrator drain them.

- *Why it loses:* There is no foreman at plan time, so the orchestrator would have to *build its own ready-queue drainer* to dispatch these beads — reinventing the foreman inside the decomposer, exactly the "second orchestrator" the PRD forbids, and far more machinery than sequential dispatch. The beads add durable clutter (plan-time coordination beads that are not work) for no ordering benefit sequential dispatch does not already give. Rejected.

**C. Bake the sequence into a single planner persona (or the decomposer's own judgment).** One agent does confidence, build, and orchestration.

- *Why it loses:* It re-collapses the three judgments the PRD split apart, fuses coordination to identity (so the order cannot change without editing the persona), and destroys the "orchestrator absorbs no judgment" property. It is the v1-and-earlier monolith the whole feature exists to break. Rejected.

### For the review bead — single vs. two authors

**A. Single author, static block (chosen).** The orchestrator writes `R` once from `omg-epics`' canonical block; because verification is *always* planned, the block is *always* present, so nothing needs to conditionally install it.

- *Why it wins:* It deletes v1's sentinel, "rewrite to same content" convergence rule, and detect-the-other-author survey — all of which existed *only* because two authors touched one bead. One author, one write, no reconciliation. This is the direct payoff of making verification a standard phase (`adr.platform.plan-time-orchestration.0001`).

**B. Keep the planner rewriting `R` (v1).** The confidence planner installs the test-aware block.

- *Why it loses:* It only makes sense when planning is *optional* (the block is installed iff the planner ran). Once planning is standard, conditional installation is pointless, and it re-imports the entire two-author machinery. Rejected as accidental complexity with no remaining buyer.

### For test authorship — sole test-writer vs. builder baseline

**A. Sole test-writer (chosen).** All tests authored by `omg-tester` from confidence-planner beads; the builder writes none.

- *Why it wins:* It is the only shape under which the per-agent test-directory read-deny is possible (`adr.platform.verification-independence.0001`), and the only one with no self-graded tests. Independence becomes enforceable.

**B. Keep builder-authored baseline tests, reserve "independent" for the planner (v1).** The builder writes baseline tests; the planner reserves independent ones.

- *Why it loses:* The builder's baseline tests are authored in the same context as the code — the grading-your-own-work failure. And a builder that writes tests needs test-directory *write* access, foreclosing the read-deny. It keeps the exact property the reframe rejects. Rejected.

### For escape-hatch Mode 2 — PM adjudication vs. mechanical rules

**A. Route Mode 2 to the PM with Hindsight (chosen).** A broken prior-epic test is a product-intent question, so the agent that owns product intent and holds the memory of *why* the guarantee exists resolves it.

- *Why it wins:* Whether a prior guarantee still holds is not mechanically decidable — it needs the intent behind the original test, which lives in memory the PM consults. Recording the decision back to that memory closes the loop for the next collision.

**B. Let the implementer or reviewer decide.** The agent at the failure decides whether the old test is stale.

- *Why it loses:* The implementer deciding a prior test is stale is a hair's breadth from the implementer editing a test to make its work pass — the exact silent-hack the PRD forbids. The reviewer is blind to test mode and lacks product-intent authority. Neither holds the memory. Rejected.

### For the terminal report-writer — which agent authors the build-report bead `P` (R16)

R16 turns the build report into a dispatched bead. Who does the foreman route it to? Three options, held to "the foreman gets simpler" (Goal 6) and to the standing memory-lifecycle ADR.

**A. The reviewer (`omg-reviewer`) as report-writer (chosen).** Label `P` `agent=omg-reviewer`, blocked behind the review bead `R`; its static body says "synthesize from bead comments, write to the docs tree, stop."

- *Why it wins:* It aligns with a **standing decision** — `adr.platform.memory-lifecycle.0001` §5 already assigns build-record synthesis to "the review agent … at the epic's review bead." The reviewer is already read-only on code, already synthesizes from bead evidence, and already executes a bead body as a work order, so `P` reuses its exact disposition with **no new instrument**. The one cost is a narrow frontmatter grant (`write` scoped to `**/*.md`, since the reviewer is `edit: deny` today) — doc-only, not touching its code blindness. `P` being a *distinct bead* from `R` keeps the two jobs unconflated while reusing the agent.

**B. Foreman-as-worker (keep the foreman authoring the report).** The foreman writes the report itself at queue-drain, as today.

- *Why it loses:* This is precisely the terminal state R16 removes. It re-creates a "queue-empty → the foreman now does authoring" branch — the human-gate trap's structural cause and a violation of "the foreman only dispatches, holds no state." It makes the foreman *more* clever, the opposite of Goal 6's direction. Rejected outright.

**C. A dedicated `omg-report-writer` agent.** Mint a new agent whose sole job is the report.

- *Why it loses:* Gold-plating. A new agent needs its own persona, permissions, and skill for a single job an existing agent already fits — and it would **contradict** `adr.platform.memory-lifecycle.0001` §5, which names the review agent. Complexity with no buyer and a standing-ADR conflict. Rejected.

### For shipping — automated vs. deliberate (R16, Goal 8)

**A. Shipping leaves the automated flow entirely; a separate deliberate sync command owns it (chosen).** The automated flow stops at the written report; a human invokes docs→Hindsight sync when the docs are canon.

- *Why it wins:* It makes "epic close ≠ shipped to memory" an intentional semantic and is the only shape safe under a future PR/merge flow — durable memory must not enter canon as a side effect of a build finishing on a branch that may never merge. It draws a clean seam a future `ship_at: close | merge` mode plugs into without reworking the build loop. The cost — an operator must remember to sync — is the honest price of not auto-committing memory, and is exactly what a later `ship_at` automation addresses.

**B. Keep shipping in the automated flow (a terminal ship bead, or the foreman ships).** The epic ships to Hindsight automatically when the graph drains.

- *Why it loses:* It auto-commits durable memory from an unmerged build — the precise hazard Goal 8 forbids. Under a PR/merge flow it would poison canon with memory from branches that never land. Even as a bead, an *automated* terminal ship re-imports "build finishing ⇒ memory true," conflating "the work is done" with "the memory is canon." Rejected as unsafe for the future flow the boundary is drawn to enable.

## Tradeoffs

**What the chosen approach gains:**

- **A terminating, leak-free loop over a larger bead set**, proven by trace, using only existing blocking semantics — no new beads primitive, no foreman routing change.
- **Enforceable independence:** ordering (plan graph), isolation (fresh-context dispatch), and the per-agent read-deny seam — three mechanisms the harness holds.
- **Deleted accidental complexity:** the single-author review bead retires v1's sentinel/convergence/survey machinery.
- **Verification cannot be forgotten:** it is a standard phase; the "off" state is gone.
- **A done-target that survives the read-deny:** the R7 metadata chain lets the implementer learn its focused test without ever reading test source, so the deferred read-deny breaks nothing when it lands.
- **Cheap per-bead validation with a systematic backstop:** focused runs per bead (fast, no full-suite cost each time) plus one full-suite run at the review bead — which also makes the R7 chain safe to leave unenforced, since a broken chain is caught by the sweep.
- **Clean who/how/ask separation:** four judgments, four owners; sequencing in the skill; asks in the commands.
- **A simpler foreman (R16):** dismantling the terminal branch *removes* the foreman's one piece of non-routing state — its "queue-empty → author → ship" special case — so the foreman gets simpler exactly as Goal 6 demands. Terminal work is beads dispatched by label like everything else.
- **The human-gate trap is removed structurally, not guarded (R15/R16):** because "empty queue" no longer triggers a terminal leap, a human-gated pause can no longer be mistaken for completion. The unsafe inference ("empty ⇒ done ⇒ ship") ceases to exist rather than being caught by a new check.
- **Memory never auto-enters canon from an unmerged build (Goal 8):** shipping leaves the automated flow, so "the work is done" and "the memory is true" stop being conflated — the seam a future PR/merge (`ship_at`) flow plugs into safely.

**What it gives up (honest costs):**

- **More plan-time moving parts:** an orchestrator plus two dispatched planners, versus one decomposer. More to reason about when plan time misbehaves.
- **A real summons/escape bead per finding and per stuck test** persists (closed) in the record — a deliberate audit-positive trade for foreman-compatibility, but not zero beads.
- **An unenforced two-hop metadata chain:** both R7 writes are runbook discipline, not harness-enforced. The safety net (R8 full-suite sweep) makes a broken chain a *degraded fast path*, not a *shipped defect* — but a chain that silently breaks costs the focused-run optimization and defers the catch to review, which is slower and noisier than catching it per-bead. Accepted because the alternative (enforcing metadata writes) has no harness hook and would reinvent validation the sweep already gives.
- **The read-deny is deferred:** until it lands, independence rests on ordering + isolation alone (strong, not yet complete), and Mode discrimination must be designed to survive the deny (OQ-A) — which R7 now delivers via the `run-selector`.
- **A required `omg-builder` persona change** (dropping test authorship) touches an agent many operators know; the behavior change (builder no longer writes tests) is real and must be communicated, not silent.
- **A human gate in Mode 2 introduces an intentional pause** — bounded and by design, but it does pause a fix (and, transitively, the whole epic) on a human, which some operators may hit. The pause is a `bd gate`, not a `human` label; getting that wrong (label-only) would loop the foreman, so the gate mechanic is load-bearing.
- **Shipping is now a separate deliberate act** (R16): an operator who finishes a build and forgets to run the sync command has produced artifacts that are *not* in Hindsight. This is the intended semantic (epic close ≠ shipped), but it shifts a step that used to be automatic onto the operator — until a future `ship_at` mode re-automates it. The build report is written to the docs tree regardless, so nothing is *lost*, only un-shipped.
- **A required `omg-reviewer` grant** (`write` scoped to `**/*.md`, to author the report bead `P`) touches an agent that is `edit: deny` today. Narrow and doc-only — it does not weaken code-review blindness — but it is a real permission change, not silent.

### Deferred (named, not designed here)

- **The docs→Hindsight sync command's full behavior** — R16 removes shipping from the automated flow and names this command as its new home, but the command's own design (its ship ordering — epic before report — and whether it **deletes superseded docs** from Hindsight, reconciled against `adr.platform.memory-lifecycle.0001`) is a separate effort. This design fixes only the boundary: the automated flow stops at the written report; the command ships.
- **A `ship_at: close | merge` workflow mode** — automating the sync trigger for PR/merge flows so memory enters canon at merge, not at build. The R16 boundary (stop at the report + deliberate sync) is what makes this a future *addition* rather than a *rework*.
- **The implementer's test-directory read-deny** — per-agent permission, framework-specific, configured at onboarding.
- **Systematic cross-epic verification** — proactively re-checking shipped epics under later change; Mode 2 seeds the memory trail, the systematic version is a future PRD.
- **A deliberate "skip verification" opt-out** for throwaway work — explicit opt-*out*, a separate future decision.
- **Formula/molecule extraction** of the recurring plan-phase and findings wiring, once proven.
- **Richer re-planning depth** (cascading re-plans across large subgraphs).

## Operational Considerations

**Termination is the operational invariant.** The loop must always drain (or idle correctly at a human gate). The proof above holds by construction, extended to the escape-hatch beads and the terminal beads. The residual obligations, and their guards:

- *A summons or escape bead left open* (`y`, `w₁`, `w₂`) → its fix blocks forever. **Guard:** the mandatory-close rule is stated in the relevant agent persona (confidence planner for `y`/`w₁`; PM for `w₂`) **and** the `omg-epics` wiring section. The observable symptom is a stuck `omg-test-planner` or `omg-product-manager` bead on `bd ready --parent <epic>` with no forward progress. **Note the one deliberate exception:** a `w₂` under an open human gate is *supposed* to be open-and-not-ready — it is the clean pause, not a stuck bead. Distinguish the two by whether an open gate exists on it (`bd gate` list), not by the bead being open.
- *A human-gated epic mistaken for a stuck or a finished epic.* An epic paused on a `w₂` human gate shows an empty `bd ready` (of dispatchable work) while `w₂`/`x`/`R`/`P` remain open-but-blocked, and the epic is **not** close-eligible. **Guard:** this is the *correct* idle state (see the termination proof's idle-state paragraph), not a leak — but it must be *visible*, or an operator could walk away thinking the epic finished. The operability need is that a pending human gate surfaces prominently (how prominently is OQ-D). The distinguishing signal from a genuinely-done epic: a done epic is close-eligible with all children closed; a gated epic is not close-eligible and has an open gate.
- *The terminal report-writer bead `P` never comes ready.* If `R` never closes (an open finding or gate upstream), `P` stays blocked and no report is written — correct, since the report describes a *finished* epic. **Guard:** `P blocks R` makes this automatic; the symptom of a genuinely-wedged upstream is the same stuck-bead symptom above, and `P` sitting blocked is a downstream *effect*, not an independent failure. There is no path where `P` runs before the epic's work is done.
- *The operator forgets to run the sync command.* After the automated flow stops at the written report, memory does not contain the epic/report until the operator invokes docs→Hindsight sync. **Guard:** this is intended (Goal 8), not a fault — nothing is lost (the report is in the docs tree, the epic is in beads); only the *ship* is pending. The observable state is a closed epic whose bead is still `hindsight:pending` and a report file present in the tree but not in Hindsight. A future `ship_at` mode automates the trigger; until then it is a deliberate operator act.
- *The build planner wires an implementation bead to a `z` that does not exist* → a dangling dependency. **Guard:** sequential dispatch guarantees test beads exist before the build planner runs; the build planner reads the real `z` beads rather than inventing ids. `bd swarm validate` after the plan phase catches any dangling edge.
- *`one_agent` mode reuses the builder context for the test-writer* → fused authorship, independence lost silently (no deadlock, but a broken guarantee). **Guard:** the `omg-foreman` skill's `one_agent` mechanics explicitly spawn the test-writer fresh, as it already does the reviewer; the symptom (a `z` and its `x` authored in one context) is hard to observe post-hoc, so this guard lives in the mechanics, not in a runtime check — flagged as the design's most subtle operability risk.
- *A broken R7 metadata chain* (build planner skips the `test-beads` stamp, or test-writer skips the `run-selector`) → the implementer has no focused done-target, or a stale one, and its focused run misses a planned test. **Guard:** this does **not** wedge and does **not** ship broken — the **R8 full-suite run at the review bead** exercises the planned test and files a finding if it is red. The failure degrades the fast path to "caught at review," never to "ships green." The observable symptom is a review-bead finding for a test no implementation bead ran, or an implementation bead whose `test-beads` / `run-selector` metadata is empty on `bd show`.

**Observability.** Plan-phase output is visible in `bd dep tree <epic>`: `z` beads wired `z blocks impl` = planned verification; recorded "no test needed" reasons on implementation beads = declined-with-cause; the terminal `P` bead blocked behind `R` = the report step is on the graph. The R7 chain is visible on the beads themselves: `test-beads` on each implementation bead, `run-selector` on each test bead (`bd show`). Findings-driven decisions are the closed `y` beads with reasons. Escape-hatch events are the closed `w₁`/`w₂` beads with the planner's/PM's reasoning comments — and the Mode-2 ones are folded into the build report by the report-writer bead `P` (they reach Hindsight only when the sync command is invoked). A pending human gate is visible via `bd gate` list on the epic's beads. The review-bead full-suite result (green, or the findings it filed) is the single systematic verification signal for the epic. `bd swarm validate <epic>` confirms acyclicity after any plan or findings change.

**In-flight and re-run behavior.** Because verification planning is now part of decomposition (not an operator step run later), an epic is planned at mint. There is no "run the planner later" convergence problem to survive — the v1 re-run/convergence machinery (surveying to avoid double-wiring on a second `/omg-test-plan`) is **removed**, because the standalone re-invokable command is retired. The confidence planner still surveys the spec's behaviors when it runs its plan-phase pass, but it runs once per decomposition, not repeatedly against a growing graph. (If a re-decompose is ever needed, it re-mints; that is a decompose concern, not a planner-idempotency concern.)

**Sync (beads state) vs. shipping (memory).** Two distinct things, not to be conflated. **Beads sync** — persisting/propagating beads state — is plugin-owned per `adr.platform.beads-sync-ownership.0001`: every instrument here carries task semantics only and is mode-agnostic; none names a `bd dolt` command or branches on `dolt_mode`. The orchestrator, both planners, the writing agents, the reviewer/report-writer, and the PM all rely on the plugin for sync. **Shipping to Hindsight** — committing docs to durable memory — is a *separate* concern that R16 moves out of the automated flow entirely into the deliberate docs→Hindsight sync command. The foreman no longer ships; nothing in the build loop ships. This keeps the beads-sync-ownership boundary intact (no instrument here narrates `bd dolt`) *and* draws the new memory-shipping boundary (no instrument here ships to Hindsight; the report-writer bead writes the report and stops).

## Open Questions

- **OQ-A — Mode discrimination under the deferred read-deny, now on the R7 chain.** The R7 metadata chain gives OQ-A its concrete carrier: the `run-selector` the test-writer stamps on each `z` bead is precisely the "recorded target" against which run output is matched. Recognition of Mode 1 vs. Mode 2 keys on **test-run output matched against this epic's `z`-bead `run-selectors`** (a failing selector inside this epic's `z` set → Mode 1; a failure outside it → Mode 2), never on reading the failing test's source — so the read-deny (R6) does not break classification. The *constraint* (never read the test file to classify) is fixed here; the exact string-matching of a runner's failure report to a stored selector (which can drift in format across stacks) remains a build-time detail for the spec, and it is **no longer load-bearing for termination** (a mis-match degrades to "caught at the review-bead full-suite run," per R8), only for how *promptly* the implementer self-classifies.
- **OQ-B — `omg-build-planner` requirement→impl-bead mapping, now load-bearing for the R7 hop-1 write.** The build planner's rule is "every spec requirement/AC gets an implementation bead"; R7 adds that it must also stamp each implementation bead with the `test-beads` id(s) it must satisfy. The mapping is therefore load-bearing twice over: for **coverage completeness** (every requirement spoken for) and for the **hop-1 metadata write** (each impl bead pointed at the right test bead(s)). Whether requirements enumerate cleanly one-to-one or several ACs fold into one bead — and, when they fold, how the planner attaches possibly-multiple `test-beads` ids to one impl bead — is a build-time judgment the planner persona must guide. It is not load-bearing for termination (a missing or wrong `test-beads` stamp degrades to "caught at the review-bead full-suite run," per R8), but it is load-bearing for the focused-path to work and for coverage.
- **OQ-E — RESOLVED by R15: a red prior-epic test blocks the epic via the ordinary finding mechanism.** The earlier open question was whether a Mode-2 red-suite finding blocks the review bead or files standalone (out-of-scope, not holding the epic hostage). R15 settles it: it **always blocks**, exactly like any finding, and the reviewer's change-locality judgment sets only the finding's **`agent` label** (PM for a prior-guarantee break, builder for an in-epic fix), never whether it blocks. This is **not** the "departure from the reviewer's default out-of-scope filing" the earlier design position worried about — the block is normal file-and-reopen; only the label varies. The design's earlier "should block, wired like an in-scope finding even though the broken test is out-of-scope" reasoning was correct in outcome but is now superseded by the cleaner framing: it blocks like *any* finding, and the out-of-scope/in-scope distinction has been recast as the label choice, not the block choice. Kept here, marked resolved, for the audit trail.
- **OQ-C — Retiring `/omg-test-plan` cleanly.** Removing the command is correct (verification is standard, not operator-invoked), but any operator muscle-memory or docs referencing it must be updated. A build-time cleanup, flagged so it is not lost.
- **OQ-D — Mode-2 human-gate ergonomics (mechanism corrected to `bd gate`).** The cannot-decide branch pauses the fix on a human decision via `bd gate create --type=human --blocks <w₂>` — the gate, not a `human` label, is what removes `w₂` from `bd ready` and pauses the epic. How prominently a pending human gate surfaces to the operator (so a paused epic is not mistaken for a finished one — now especially important since R16 removed the terminal ship that used to make "done" unambiguous) is an operability detail for the build; the *mechanism* (bounded gate, resolves into kick-back or test-update) is fixed here.
- **OQ-F — The report-writer bead's `**/*.md` write grant vs. the reviewer's read-only stance (new).** Homing the report-writer on `omg-reviewer` (aligned with `adr.platform.memory-lifecycle.0001` §5) requires granting the reviewer `write`/`edit` scoped to `**/*.md`, since it is `edit: deny` today. The design's position is that this is safe — the grant is doc-only and does not touch code-review blindness (the reviewer still cannot edit source), and the report is authored on a *distinct* terminal bead `P`, not while reviewing. But the spec must (a) confirm the scoped grant is expressible in the reviewer's frontmatter, and (b) confirm the memory-lifecycle §5 "review agent synthesizes the build-record at the review bead" is faithfully realized by "a report-writer bead labeled `omg-reviewer`, blocked behind the review bead" — i.e. that the ADR's "at the review bead" is satisfied by "a terminal bead the review agent handles after the review bead closes," rather than requiring the synthesis to happen *inside* the review bead itself. If the ADR intends the latter, either the ADR or this homing needs reconciling. Flagged for the spec and the memory-lifecycle reconciliation.
- **OQ-G — The docs→Hindsight sync command boundary is defined here but its behavior is deferred (new).** R16 names the sync command as shipping's new home and fixes the boundary (automated flow stops at the written report). Its own design — the epic-before-report ship ordering (formerly an inline foreman rule), the deferred superseded-doc-deletion question, and its reconciliation against `adr.platform.memory-lifecycle.0001` (supersession/retraction owner) — is a separate effort, not this design's. Flagged so the boundary is not mistaken for the full command design.

## Related Documents

- `prd.platform.test-planning.0002` — the PRD this design serves; its decision set (three plan-time roles, inverted plan order, exclusive test-planner franchise, two writing agents, structural independence, sacred foreman routing, single-author review bead, standard verification phase, surviving findings loop, two-mode escape hatch) is realized here.
- `adr.platform.plan-time-orchestration.0001` — the phase-model decision this design realizes (plan-time orchestrator distinct from build-time dispatch; verification a standard phase; **and, refined this round, the foreman holds no terminal state — the terminal report work is an on-graph bead**). This design provides the concrete sequencing mechanism (OQ1) and the terminal-bead wiring (R16) that ADR leaves beneath its boundary.
- `adr.platform.verification-independence.0001` — the boundary/independence decision this design realizes (ordering + isolation + per-agent permission). **Untouched by this round:** R15/R16/Goal 8 concern the terminal phase and the review-suite finding, not the writing-agent independence boundary. (The reviewer's new `**/*.md` grant for the report bead does not weaken any independence property — see OQ-F.) This design provides the wiring and the fresh-context dispatch that ADR left beneath its boundary.
- `adr.platform.memory-shipping-boundary.0001` — **new this round.** The standing decision that shipping to durable memory is a deliberate act, not an automated phase of the build (R16/Goal 8): the automated flow stops at the written report, and a separate human-invoked docs→Hindsight sync command owns shipping. This design realizes the boundary — the report-writer bead writes-and-stops, and the human-gate-trap removal is proven in the termination proof.
- `adr.platform.memory-lifecycle.0001` — owns the *mechanics* of shipping (freeze-at-ship, epic-ships-at-close, tree-sourced build records, supersession/retraction, deferred superseded-doc deletion). Adjacent to the new memory-shipping-boundary ADR (which owns the *trigger*): the deferred docs→Hindsight sync command is designed against this ADR. Its §5 "the review agent synthesizes the build-record at the review bead" is the standing decision that homes this design's report-writer bead on `omg-reviewer` (see OQ-F for the "at the review bead" vs. "a terminal bead the review agent handles" reconciliation).
- `design.platform.test-planning.0001` — **superseded by this design.** Its operator-invoked planner, two-author review bead, and builder-authored baseline tests are replaced. Its findings-loop mechanism and termination proof are re-homed and re-derived here.
- `spec.platform.test-planning.0001` — the v1 contract, to be superseded by `spec.platform.test-planning.0002` (the PM's next step, after this design and the ADRs land).
- `adr.platform.beads-sync-ownership.0001` — the task-semantics-only / mode-agnostic rule every instrument here obeys.
- `omg-decomposer` / `omg-build-planner` / `omg-test-planner` / `omg-tester` / `omg-builder` / `omg-reviewer` / `omg-foreman` / `omg-product-manager` agents and the `omg-epics`, `omg-foreman`, `omg-review`, `test-writing` skills — the instruments this design creates or changes; see the Instruments checklist.
- The docs→Hindsight **sync command** (new home for shipping under `adr.platform.memory-shipping-boundary.0001`; its full behavior — ship ordering, superseded-doc handling — is deferred and designed against `adr.platform.memory-lifecycle.0001`).
