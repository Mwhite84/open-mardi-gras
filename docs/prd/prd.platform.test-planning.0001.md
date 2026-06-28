---
schema_version: 1
id: prd.platform.test-planning.0001
type: prd
title: "Test Planning as First-Class Work in the OMG Delivery Workflow"
status: draft
domain: platform
created_at: 2026-06-25T04:30:57Z
updated_at: 2026-06-26T13:18:42Z
hindsight:
  strategy: spec-or-adr
  tags:
    - source:authored
    - domain:platform
    - discipline:product
    - memory_type:prd
---

# Test Planning as First-Class Work in the OMG Delivery Workflow — PRD

> Product Requirements Document. Defines the problem, who it is for, and what
> success looks like — not how it is built.
>
> **Status: draft.** This document captures a settled design conversation for
> later refinement and architectural review. It is not yet approved for build.

## Problem

The OMG delivery workflow turns a spec into an epic of beads, builds them, and
reviews them. Today, **tests are not first-class planned work in that pipeline.**
They appear, if at all, in two unreliable ways:

1. A builder may write tests for the bead it is building, at its own discretion,
   as a side effect of implementation.
2. The reviewer may *notice* missing tests and file a finding.

Both are after-the-fact and optional. Neither makes "what confidence does this
work need, and how do we establish it" a deliberate, tracked decision the way
the workflow makes *building* and *reviewing* deliberate, tracked decisions.

Two concrete failures follow from this gap:

- **Untested work ships looking finished.** A green build and a closed epic say
  nothing about whether the behavior was verified. The workflow's whole premise
  is that beads make work legible and trackable; testing is currently illegible.
- **Findings-driven work is the worst case.** When the reviewer files a finding,
  a builder fixes it, and the fix is built and closed — but no test is planned
  for that fix. The very changes most likely to be risky (the ones a reviewer
  flagged) are the ones least likely to get deliberate test coverage, because
  they enter the graph *after* any test thinking happened.

The deeper issue is a missing **discipline boundary**. Deciding *what confidence
a change needs and how the graph should establish it* is a different kind of
judgment from *writing a good test*, and different again from *decomposing a spec
into build work*. The workflow has an agent for decomposition (the decomposer)
and an agent that can write tests (the existing `omg-tester`), but no agent and
no step that **plans** the verification of an epic. Test planning has no owner.

### Why now

The supporting pieces already exist and make this the right moment to close the
gap rather than work around it:

- The `omg-tester` agent already exists and is already philosophically correct —
  it refuses to write a test that does not increase justified confidence, and it
  refuses to let a green suite stand in for verified behavior. It is a competent
  **test writer** with no planning role. The planning capability is the missing
  complement, not a rewrite.
- The beads model already supports the structures a planner needs: dependency
  wiring, `agent`-label dispatch, and the reviewer's finding-and-reopen loop — the
  same primitives that route and block all other work in the foreman loop.
- Because test planning is its own explicit step, "are we testing?" needs no
  branch logic in any agent: running the step makes an epic test-aware, and not
  running it leaves the epic exactly as it is today. The decision is the
  operator's invocation, not a flag any agent reads.

## Target Users

The direct users are the **maintainers running the OMG delivery workflow** on
their own repos — the people who invoke `/omg-decompose` and `/omg-build` and
want the work that ships to be verifiably correct, not merely complete. This is
the same audience the existing OMG commands serve.

The indirect beneficiaries are **future agents and humans who recall the build
from memory** — they inherit an epic whose verification was a deliberate plan,
not an accident of whoever happened to build it.

This PRD does **not** target teams who want a turnkey CI/coverage product. It
serves the existing OMG operator who already thinks in specs, epics, and beads
and wants verification to be a first-class citizen of that model.

## Goals

1. **Make test planning a deliberate, owned step** in the delivery workflow —
   distinct from decomposition (planning the build) and from test writing
   (producing the test).
2. **Close the findings-driven gap**: a fix the reviewer surfaces gets its
   verification planned before it is built, on the same footing as originally
   decomposed work.
3. **Keep verification economical, not voluminous.** The point is *justified
   confidence per test*, never test count or coverage percentage. The planner
   must be as willing to plan *no* test (with a stated reason) as to plan one.
4. **Add the capability without disturbing the agents that are deliberately
   blind to it.** The foreman dispatches by label and must stay ignorant of test
   mode; the reviewer follows the instructions in the bead it is handed and must
   stay ignorant of test mode; the existing `omg-tester` keeps writing tests.
5. **Keep testing opt-in by invocation, not by mode.** The operator turns testing
   on for an epic by running the step; not running it leaves the epic exactly as
   the workflow produces one today. No pipeline-wide test mode, and no config flag
   any agent must read.

## Non-Goals

- **Not building a test taxonomy or classification rubric.** An earlier design
  exploration proposed ~10 enumerated bead "types" and a multi-axis risk/cost
  scoring formula. This PRD explicitly rejects that as ceremony the planner would
  game. The planner reasons in prose about confidence, exactly as the existing
  `omg-tester` already does; it does not fill out a matrix.
- **Not reinventing the reviewer.** Mid-graph "quality review gates" proposed in
  the same exploration are the existing reviewer's job. No new judgment-review
  agent is introduced.
- **Not changing the foreman.** The foreman's value is that it holds no
  orchestration state and dispatches purely by label. This work must require zero
  foreman changes; if it appears to need one, the design is wrong.
- **Not a coverage or CI-integration feature.** This plans verification *as
  beads*; it does not set coverage thresholds, wire CI, or gate merges on
  coverage numbers.
- **Not building reusable formulas/molecules yet.** The recurring wiring shapes
  (the summons→fix→test patterns) are strong candidates for beads formulas, but
  extracting a formula before the hand-wired pattern is proven end-to-end is
  premature. Deferred (see Scope).

## Success Metrics

Because this is workflow tooling rather than an end-user product, the signals are
observable in the beads graph and the build outcomes, not in a usage dashboard.
Success means:

- **Test work is visible in the graph.** For an epic the test-planning step was
  run on, verification exists as labeled beads with correct dependency wiring —
  not as incidental builder side effects. *Signal:* test-labeled beads present
  and wired to the build beads they verify.
- **Findings get planned verification.** When the reviewer files an epic-scoped
  build finding in a tested epic, that fix's verification is planned before the
  fix is built. *Signal:* no findings-driven fix bead reaches "built and closed"
  without its verification having been planned (or explicitly declined with a
  recorded reason).
- **No verification noise.** The planner declines to plan tests where they would
  not increase confidence, and records why. *Signal:* the plan includes explicit
  "no test needed, because…" decisions, not a test bead per build bead.
- **The blind agents stayed blind.** The foreman and reviewer required no
  test-mode awareness. *Signal:* the shipped change touches neither agent's
  decision logic (the reviewer's *instructions* may change as bead-body data, but
  its code/persona does not branch on test mode).
- **The loop terminates.** An epic with test planning, findings, and re-planning
  drains its ready queue to a clean close with no deadlock and no leaked beads.

## Requirements

At the level of capability (the *how* is the architect's and implementation
writer's territory):

1. **A test-planning capability distinct from test writing.** The workflow must
   be able to take a built epic, read its build beads, and decide — per bead —
   what verification (if any) materially increases justified confidence, then
   express that decision as test-labeled work wired into the epic. The agent that
   *writes* tests (`omg-tester`) is the worker those planned beads dispatch to; it
   is not the planner.

2. **The planner's posture is "prevent unjustified confidence."** It must justify
   not only the verification it plans but the verification it *declines* to plan.
   "No test needed, because covered elsewhere / mechanical / low-risk" is a
   first-class, recorded outcome.

3. **No test-mode branch in any agent.** Whether an epic is tested is decided by
   one thing only: whether the operator runs the test-planning step. No agent reads
   a mode flag. The **planner is the sole owner of test-awareness** — when it runs,
   it both plans the verification work and rewrites the review bead to the
   test-aware form. The decomposer stays test-blind (it produces the same epic
   either way); the foreman stays label-only; the reviewer follows whatever
   instructions its review bead carries.

4. **An explicit, on-demand command** (working name `/omg-test-plan <epic-id>`)
   that runs the planner over an existing epic: it plans the verification work and
   brings the review bead to the test-aware state. This is the only path to test
   planning in v1.

5. **Findings-driven verification, with no foreman or reviewer logic change.** In
   a tested epic, when the reviewer files an epic-scoped build finding, it must
   also cause that fix's verification to be planned *before* the fix is built —
   achieved through instructions the planner wrote into the review bead and a
   **summons bead** that summons the planner. The mechanism:
   - The reviewer (following instructions the planner wrote into the review bead)
     files the finding's fix bead **and** a summons bead labeled for the planner;
     the summons bead **blocks** the fix bead so the fix cannot be built before its
     verification is planned.
   - The foreman dispatches the summons bead by its label like any other ready
     bead.
   - The planner decides what verification the fix needs, wires the corresponding
     test bead, and **closes the summons bead** (its job ends the moment the plan
     exists).
   - If the planned test must run *after* the fix, it is wired to also block the
     review bead, so the review cannot close with an unverified fix.
   - *The summons bead is a normal (non-ephemeral) bead: the foreman dispatches only
     real beads off the ready queue. See the design doc for the mechanism detail.*

6. **Verification work is labeled and dispatchable like all other work.** Planned
   test beads carry the appropriate `agent` label so the foreman routes them with
   no special-casing, consistent with the existing dispatch-by-label model.

## Scope

### In (v1)

- A test-*planning* agent (the planner) and its planning runbook, distinct from
  the existing `omg-tester` writer.
- An explicit, on-demand command (working name `/omg-test-plan <epic-id>`) that
  runs the planner over an existing epic.
- The planner as the sole owner of test-awareness: when it runs it plans the
  verification work *and* rewrites the review bead body to the test-aware form.
- The reviewer's bead-body instructions (authored by the planner, not by changing
  the reviewer agent) that drive the findings mechanism.
- The summons-bead lifecycle: summon the planner, plan, close the summons bead.
- The planner's minimal vocabulary: **two wiring shapes of one test bead**
  (design-before-fix and run-after-fix) **plus a no-bead "no test needed"
  decision** (which absorbs the deterministic-gate case). No taxonomy, no scoring.

### Out

- Test taxonomy/enumeration and risk/cost scoring rubrics (see Non-Goals).
- A new judgment-review agent or mid-graph review gates (the reviewer covers
  this).
- Any change to the foreman.
- Coverage thresholds, CI wiring, or merge gating.

### Deferred (named, not built)

- **Automatic test planning.** A path that runs the planner as part of
  decomposition (so testing is on by default for an epic, gated by a
  `.workflow.yaml` key such as `test.auto`) was considered and cut from v1. It is
  blocked on harness support: an agent cannot invoke a slash command, so the
  decomposer cannot natively call `/omg-test-plan`, and the only native chaining
  (`then` in command frontmatter) fires *unconditionally* and could not be gated on
  a config key without further plugin work. Rather than approximate it (e.g., the
  decomposer reading and imitating the command file, which loses the harness-pinned
  agent and settings), v1 ships the explicit step only. When the plugin gains
  conditional command chaining, auto becomes a thin wrapper over the *same* planner
  — additive, not a redesign. The intended config key name is `test.auto`.
- **Formula/molecule extraction.** Once the hand-wired summons/design/run patterns
  are proven end-to-end in `one_agent` build mode, the recurring shapes are strong
  candidates to become beads formulas the planner pours. Build the formula only
  after the pattern is proven; capture it as future work, not v1.
- **Re-planning depth.** v1 plans the original decomposition and handles
  findings-driven fixes via the summons-bead mechanism. Any richer re-planning
  (e.g., cascading re-plans across large affected subgraphs) is deferred until the
  simple case is proven.
- **Ephemeral/one-time checkpoint tests.** Considered and cut: a failing checkpoint
  has no fixer (the tester does not fix code) without reinventing the review loop,
  and build agents already run throwaway validations natively. Revisit if a real
  gap appears.

## Open Questions

Most of this PRD's original open questions have been settled in the design doc
(`design.platform.test-planning.0001`); they are recorded here as resolved for the
audit trail. One genuinely-open item carries into the spec.

**Resolved (see the design doc for detail):**

- **Command name** — `/omg-test-plan <epic-id>`. Auto is deferred (see Deferred),
  so v1 is a single command with no config key.
- **Planner vocabulary** — two wiring shapes of one test bead plus a no-bead "no
  test needed" decision. Ephemeral checkpoints cut (see Deferred).
- **Summons-bead wiring** — the blocking edges and the mandatory close are stated
  as hard rules in the design doc; the summons bead is a real (non-ephemeral) bead.
- **Reviewer instruction authoring** — the planner rewrites the review bead body;
  the reviewer executes that body as it executes any bead. A one-section alignment
  of the `omg-review` skill (fetch-and-execute the review bead) is in scope.
- **`omg-tester` touch** — a one-line acknowledgment that the writer may receive a
  pre-planned test bead and should honor its wiring intent.

**Open (carries into the spec):**

1. **The planner's convergence survey.** The planner converges an epic onto the
   correct test state on every run (re-running re-plans for new work; a redundant
   run is a no-op). The spec must make the *survey* concrete — what implementation
   and existing tests the planner inspects before wiring — so "sharpen from current
   reality" is a definite procedure, not a vague instruction.

## Related Documents

- `omg-tester` agent and `test-writing` skill — the existing test *writer* this
  PRD complements with a *planner*. Their confidence-first philosophy is the model
  the planner inherits.
- `omg-decomposer` agent and `omg-epics` skill — the decomposer stays test-blind
  (it produces the same epic whether or not the epic is later tested); the wiring
  mechanics for planned test beads and the summons bead belong in `omg-epics`, not
  duplicated into a new agent.
- `omg-reviewer` agent and `omg-review` skill — the reviewer drives the
  findings-and-reopen loop this PRD extends with the summons-bead mechanism, via
  bead-body instructions rather than agent changes.
- `omg-foreman` agent and `omg-foreman` skill — the dispatcher that must remain
  unchanged; its label-only dispatch is what makes the design safe.
- `design.platform.test-planning.0001` — the design doc that resolves this PRD's
  open questions and defines the summons-bead wiring, the planner's vocabulary, the
  `/omg-test-plan` command, and the instruments to create.
