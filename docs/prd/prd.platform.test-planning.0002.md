---
schema_version: 1
id: prd.platform.test-planning.0002
type: prd
title: "Verification Ownership Across the OMG Plan/Build Phases"
status: draft
domain: platform
supersedes: prd.platform.test-planning.0001
created_at: 2026-06-29T03:24:30Z
updated_at: 2026-07-03T04:38:43Z
hindsight:
  strategy: spec-or-adr
  tags:
    - source:authored
    - domain:platform
    - discipline:product
    - memory_type:prd
---

# Verification Ownership Across the OMG Plan/Build Phases — PRD

> Product Requirements Document. Defines the problem, who it is for, and what
> success looks like — not how it is built.
>
> **Status: draft.** Supersedes `prd.platform.test-planning.0001`. It is not yet
> approved for build; it awaits the architect's buildability pass and the
> superseding design doc.

## Why this supersedes `prd.platform.test-planning.0001`

The v1 test-planning feature shipped and was dogfed. It works — the
findings-driven loop terminates, the planner plans real verification — but
running it against real epics surfaced facts the v1 problem framing did not
account for. This PRD re-frames the problem around those facts and reverses
several v1 decisions. The v1 documents are preserved as the record of what was
tried; this document records what we learned and what changes.

What the dogfooding taught us:

1. **The builder already writes tests, unprompted, from the spec.** v1 called
   builder-authored tests an "unreliable side effect" to be replaced. In practice
   the builder writes tests because the spec's acceptance criteria are
   verification statements and the builder is told to satisfy them. This happens
   whether or not anyone plans. The problem was never that it happens — it is that
   it happens in the *wrong place*, by an agent that both writes the test and
   writes the code it checks.

2. **Independence comes from context isolation and ordering, not from agent
   identity.** In this harness an "agent" is a persona layered onto whatever
   context is running; two agents in one context share everything. What makes a
   test independent of the implementation is that it was authored in a **separate
   dispatch**, **before** the implementation existed. Agent identity does not
   provide that; ordering and isolation do.

3. **The review bead had two authors, and that split spawned v1's most intricate
   machinery** — a sentinel, a "rewrite to the same content, don't stack a copy"
   convergence rule, and a survey step whose whole job was to detect the other
   author's work. All of it exists only because one bead had two authors.

4. **The decisive constraint we missed: permissions are per-agent in opencode.**
   The property that would *complete* verification independence — denying the
   implementer read access to the tests so it cannot game them — is an
   agent-level permission. One agent cannot both write tests (needs test-dir
   access) and implement code blind to them (needs test-dir access denied). That
   single fact means test-writing and implementation **must** be different agents,
   independent of any argument about craft.

Together these reframe the problem from v1's *"test planning has no owner"* to:
**verification authorship and judgment are assigned to the wrong agents and the
wrong phases, and the boundaries that would make verification trustworthy are not
enforced where the harness can enforce them.**

The correction that resolves it: split the **planning** layer correctly (a
test-planner and a build-planner under a neutral plan-time orchestrator) and
**invert** it (plan tests first, then the build to satisfy them). Once the
planning split and ordering are right, the writing roles fall out cleanly — a
test-writer writes tests, an implementer writes code blind to them — with no
overlap and no agent holding two contradictory jobs.

## Problem

The OMG workflow turns a spec into an epic and builds it. Verification — deciding
what confidence the work needs, and writing the tests that establish it — is
assigned across agents and phases in ways that do not match the distinct kinds of
work involved, producing four concrete harms:

- **One agent both writes a test and writes the code it checks.** The builder
  authors tests as a side effect of implementation. A test written by the same
  agent, in the same context, as the code it verifies cannot independently
  challenge that code — it confirms the author did what the author intended. This
  is the "grading your own work" failure, and it is the default today.

- **Verification-shaped acceptance criteria leak into implementation work.** The
  architect deliberately writes acceptance criteria as verification statements.
  The decomposer folds them into build beads, and the builder reads them as test
  orders. So test scope is decided implicitly, by whoever happens to build,
  scattered across implementation beads, with no single owner and no way to record
  a deliberate "no test needed here."

- **Independence has no structural guarantee.** The value a test-planning step is
  meant to add — a test authored before and apart from the implementation, that
  the implementer must satisfy and cannot weaken — depends on ordering and
  permission boundaries that the workflow does not currently establish.

- **Verification is nominally optional but not actually optional.** Making
  planning an operator-invoked step means an epic the operator forgets to plan
  still ships with the builder's ad-hoc tests. The "off" state is not "no
  verification"; it is "undisciplined, unrecorded verification." The optionality
  protects a control group that does not exist.

Underneath all four is a single missing distinction. **Four different kinds of
work turn a spec into verified build work, and they are different in kind:**
planning the *confidence* (what verification the work needs), planning the
*build* (what implementation satisfies the spec), *writing tests* (the craft of a
good test for this stack), and *writing the implementation*. The workflow
collapsed the two planning judgments into one test-blind decomposer, and let one
agent do both kinds of writing. The phases and the agents do not line up with the
judgments.

### Why now

- The findings-driven mechanism from v1 already works in dogfooding; we are
  re-homing ownership, not inventing the loop.
- The `test-writing` skill already exists and carries ecosystem-specific craft;
  giving it a single clear owner is a wiring change, not new authorship.
- v1 deferred making testing non-optional because of a harness limit (an agent
  cannot invoke a slash command, so the decomposer could not call
  `/omg-test-plan`). This design removes that blocker: verification planning
  becomes a plan-time step the plan-time orchestrator drives directly as ordinary
  work — not a slash command an agent must somehow call. What v1 could only defer
  is now buildable.

## Target Users

The direct users are the **maintainers running the OMG delivery workflow** on
their own repos — the people who decompose specs into epics and build them, and
who want the work that ships to be verifiably correct, with every test traceable
to a deliberate decision. Same audience as v1 and the existing OMG commands.

The indirect beneficiaries are **the humans and future agents who must trust
generated code** — they inherit an epic whose tests were authored independently
of the code they verify, whose verification scope was a deliberate recorded
decision, and whose review bead has a single clear author.

This PRD does **not** target teams wanting a turnkey CI/coverage product. It
serves the existing OMG operator who thinks in specs, epics, and beads.

## Goals

1. **Tests are authored independently of the code they verify.** The agent that
   writes a test is never the agent that writes the implementation it checks, and
   the test is authored before the implementation exists. Independence is
   structural — from ordering and from agent-level permission boundaries — not an
   implied property of a label.

2. **Verification scope has exactly one owner.** Deciding what to verify (and what
   deliberately not to) is one agent's franchise. No other agent adds, removes, or
   implies test scope. In particular, the implementation agent mints no test scope
   and never authors or alters a test.

3. **Verification is a standard phase, not an option.** Every epic gets its
   verification planned as a normal part of the plan phase. No invocation flag, no
   config key; the question "are we testing this epic?" stops being askable.

4. **The four kinds of work have four clear owners.** Planning confidence,
   planning the build, writing tests, and writing implementation are distinct, each
   owned by exactly one role, so no agent does a judgment or a craft in passing
   that degrades it.

5. **Verification stays economical.** The point is *justified confidence per
   test*, never count or coverage. The confidence owner is as willing to record
   "no test needed here, because…" as to plan a test — and that decision is
   recorded, not silent.

6. **The build-time dispatcher keeps its elegance.** The foreman's routing
   invariant — grab a ready bead, read its `agent` label, dispatch to that agent,
   hold no orchestration state, special-case no bead — must not change. The
   build-mode looping mechanics may be extended where independence requires it,
   but routing stays label-only. Where the foreman changes, it should get *simpler*
   — losing special-case state — not more clever.

7. **A stuck test never becomes a silent hack.** When an implementer cannot pass a
   test — one planned for this epic, or a pre-existing test its change breaks — it
   has a recorded escalation path and never modifies the test, force-passes it, or
   closes the work silently.

8. **Finishing the build never auto-commits durable memory.** Completing an epic
   produces artifacts, but shipping decisions into Hindsight (canon) is a
   deliberate, separately-invoked act — never an automatic side effect of the
   queue draining. "The work is done" and "the memory is true" are different
   claims; the workflow must not conflate them.

9. **A dispatched bead never strands the epic, and a crash is recoverable.** Every
   dispatch ends with the bead in a state the foreman can act on, and an epic that
   was interrupted mid-build (a crashed or killed worker) can be resumed by
   re-running the same command — with a human involved only when automatic recovery
   has demonstrably failed. No worker can silently wedge the epic by leaving a bead
   in limbo.

## Non-Goals

- **Not keeping testing optional.** v1's opt-in-by-invocation model is removed. A
  deliberate "skip verification" mode for throwaway work would be an explicit
  opt-*out*, a separate future decision, not this PRD's.
- **Not changing the foreman's routing.** Routing stays label-only and stateless;
  the foreman special-cases no bead. (Build-mode looping mechanics are touchable —
  see Requirements — but routing is sacred.)
- **Not introducing a second build-time orchestrator.** The plan-time orchestrator
  operates in the plan phase only and hands a validated graph to the build phase.
- **Not sharing the `test-writing` skill with the implementer.** The implementer
  writes no tests and has no use for a test-writing skill; the skill has one owner.
- **Not building a test taxonomy, type enum, or risk/cost scoring rubric.**
  Inherited from v1 and still rejected; the confidence judgment reasons in prose.
- **Not a coverage or CI-integration feature.** No thresholds, no CI wiring, no
  merge gating.
- **Not building reusable formulas/molecules yet.**
- **Not re-deriving the findings-loop termination proof here.** That is the
  superseding design doc's job.
- **Not solving systematic cross-epic verification.** Reactively handling a
  broken prior-epic test is in scope (R13); proactively maintaining confidence in
  shipped epics under later change is named-deferred.

## Success Metrics

Signals observable in the beads graph, the build report, and the built
instruments — not a dashboard.

- **No self-graded tests.** Every test in a shipped epic was authored by an agent
  other than the one that wrote the code it verifies, in a separate dispatch.
  *Signal:* test authorship and implementation authorship are distinct beads,
  dispatched separately; no implementer bead produced a test.
- **Test scope traces to one owner.** For every verified behavior, the decision to
  test it (or not) was the confidence owner's. *Signal:* no implementation bead
  carries test scope; every test bead and every "no test needed" decision traces
  to the confidence owner.
- **No epic ships unplanned.** *Signal:* no path produces a build-ready epic
  without the verification-planning step having run.
- **The review bead has one author.** *Signal:* exactly one agent creates and
  writes the review bead; the v1 sentinel / "don't stack a copy" machinery is gone.
- **The foreman's routing is unchanged.** *Signal:* the shipped change alters no
  foreman routing logic; any foreman change is confined to build-mode looping
  mechanics.
- **Stuck tests surface, never hide.** *Signal:* every un-passable test produces a
  filed, routed bead; none is resolved by an implementer altering a test or
  closing work silently. A cross-epic broken-promise resolution is recorded in the build
  report the report-writer bead authors, and reaches Hindsight only when the
  deliberate docs→Hindsight sync command is later invoked — never automatically.
- **The foreman has no closing ceremony.** *Signal:* the foreman skill carries no
  inline "queue-empty → write report → ship" branch; the build report is a
  dispatched bead, and shipping is not in the automated flow at all.
- **Finishing a build ships nothing to memory.** *Signal:* completing an epic
  writes the build report to the docs tree and stops; no Hindsight write occurs
  without the separate sync command being invoked.
- **A human gate pauses cleanly.** *Signal:* an epic with an open human gate does
  not appear done and does not trigger any terminal work; it resumes when the gate
  is resolved.
- **No dispatch strands the epic.** *Signal:* every foreman-dispatched worker
  returns its bead closed or reopened-and-blocked; no bead is left `in_progress`
  after a dispatch returns.
- **A crashed epic resumes on re-run.** *Signal:* re-running `/omg-build` on an epic
  with an orphaned `in_progress` bead reclaims and completes it; recovery is bounded
  (one automatic retry, then a human gate) — it never re-dispatches indefinitely.
- **The loop still terminates.** An epic with planned verification, findings,
  re-planning, and crash-recovery drains to a clean close with no deadlock, no leaked
  beads, and no unbounded retry.

## Requirements

At the level of capability; the mechanism is the design doc's territory.
Throughout, **"plan" and "mint" mean creating beads; neither planner writes tests
or code.** Writing happens at build time, by the writing agents.

1. **Split the decomposer into three plan-time roles.** Today's decomposer becomes:
   a **decomposer** (plan-time orchestrator), a **test-planner** (confidence
   judgment), and a **build-planner** (build judgment). The orchestrator absorbs
   none of the planning judgment; it sequences the passes, authors the review bead,
   and validates the graph. The plan-phase sequence is skill-based instruction, not
   logic baked into any agent persona.

2. **Invert the planning order: test-planning first, then build-planning.** The
   test-planner runs first and mints the test beads for the behaviors it judges
   warrant verification (recording "no test needed, because…" for the rest). The
   build-planner runs second, sees those test beads, and mints the implementation
   beads. Test-first is what makes independence structural: the tests are planned
   before any implementation exists.

3. **Verification scope is the test-planner's exclusive franchise.** The
   test-planner is the only role that decides what is tested. Its vocabulary stays
   minimal: a test bead (for a behavior that warrants independent verification) or
   a recorded no-test decision. No taxonomy, no scoring.

4. **The build-planner mints no test scope, and derives completeness from the
   spec.** Every requirement and acceptance criterion in the spec must be spoken
   for by an implementation bead — whether or not the test-planner planned a test
   for it. The build-planner reads acceptance criteria as *what behavior must
   exist*, never as *what test to write*. It **reads the test beads** (to wire the
   implementation-satisfies-test dependencies) but does **not** derive its
   completeness from them: a behavior the test-planner declined to test still needs
   its implementation bead. Test scope is never filled in by the build-planner on
   its own initiative.

5. **Two writing agents, split by permission and franchise, not by craft.**
   - A **test-writer** agent writes all tests (from beads the test-planner minted),
     owns the `test-writing` skill, and has the permissions to author test files.
   - The **implementation agent** writes only implementation, satisfies tests, and
     **never authors or alters a test**. It has no test-writing skill and mints no
     test scope. The implementation agent's **existing test-writing charter is
     removed**: its persona today explicitly says it writes tests, and that
     sentence must be deleted, not merely left unmentioned — otherwise the residual
     authorship path this design closes stays open.
   The distinction is **designed to be enforced** where the harness enforces it —
   the two roles are meant to hold different permissions in the test directory —
   but that permission enforcement is **named-deferred** (see R6; the per-agent
   `permission` grant matrix is a separate effort, so the split ships enforced by
   *instruction and separate-agent structure* now and by permissions later). Craft
   lives in the test-writer's skill; the *reason* these are separate agents is the
   permission boundary and the authorship franchise, not who knows more.

6. **Independence is structural: separate dispatch, and an eventual read-boundary.**
   - Tests are authored in a dispatch separate from the one that writes the
     implementation, and (by R2) before it. This holds in **all** build-mode
     looping models: where a mode would otherwise reuse one context, the test-
     writing dispatch gets a fresh context. This may extend the build-mode looping
     mechanics but must not touch the foreman's routing invariant (R7).
   - **Named-deferred, but designed-for:** the implementation agent should
     eventually be **denied read access to the test directory**, so it satisfies
     tests it cannot see or game. Because opencode permissions are per-agent, this
     is only possible with the implementation and test-writing roles as separate
     agents (R5) — which this PRD establishes. The deny rule is framework-specific
     (the test path varies by stack) and is configured at **onboarding**. Nothing
     in this design may assume the implementer can read tests.

7. **The implementer knows its done-target through a two-hop metadata chain, never
   by reading test source.** An implementation bead must be able to answer "which
   focused test proves I am done?" without the implementer reading any test file
   (so the answer survives the R6 read-deny). The reference is written in two hops,
   each by the agent that authoritatively knows the value when it knows it:
   - **At build-plan time**, the build-planner writes onto the implementation bead
     the **bead id(s) of the test bead(s) it must satisfy** — a stable reference,
     knowable because the test beads already exist (R2).
   - **At test-write time**, the test-writer writes onto the *test* bead the
     **concrete run-selector** for the test it just authored (file + test
     name/filter) — the only agent that can, since it just wrote the test and knows
     its real, valid identifier. (The build-planner cannot pre-commit this: the
     test does not exist at plan time.)
   - **At build time**, the implementer reads its own bead's test-bead reference,
     queries those test beads' metadata for the run-selectors, and runs exactly
     those. It resolves the chain through **bead metadata only** — never by reading
     the test's source. The default test-blocks-implementation edge the build-planner
     wires (R2 — the test bead blocks the implementation bead) guarantees the test
     bead is written and closed before the implementer runs, so the selector is
     present when needed.

   These two writes are **skill-instructed, not enforced**, and that is acceptable
   because R8 is their safety net: if either write is skipped or malformed, the
   fast focused path degrades to "caught at review," never to "ships broken."

8. **Per-bead done-check is focused; the full suite runs at the review bead, never
   per-bead.** The implementer validates its own bead by running only its
   **focused** test target (R7) and iterating to green — it does **not** run the
   whole suite, which would cost full-suite time and tokens once per bead. The
   **full test suite runs at the review bead** (each time the review fires, per
   R15 — the point is that it runs *there*, not per implementation bead), and is the
   systematic catch for two things: any prior-epic test this epic broke (a broken promise,
   R13), and any hole left by a broken R7 metadata chain (a planned test that never
   got wired to a focused run). When the review-bead suite goes red, the reviewer
   files a bead in real time — a broken-promise finding to the PM, or a fix finding for a
   missed test — consistent with its existing "file findings, don't fix" discipline. The run command itself is
   **not** onboarding-configured: the agent infers the runner from the repo's
   tooling (and may consult the web), so no brittle per-repo run-command config is
   introduced. (Only the R6 read-deny needs onboarding, because a permission
   boundary cannot be self-configured.)

9. **The foreman's routing invariant is untouched; its looping mechanics may
   extend.** The foreman dispatches purely by `agent` label, holds no orchestration
   state, and special-cases no bead. This is sacred and unchanged. The build-mode
   looping mechanics (`one_agent`, `one_agent_fresh_contexts`, `multi_agents`) may
   be extended where independence requires a fresh test-writing context (R6). Any
   foreman change is confined to looping mechanics; routing is off-limits.

10. **The review bead has exactly one author.** The decomposer creates and fully
    authors the review bead — including the findings-loop instructions — **once,
    after both planning passes**, from a static canonical block owned by the
    `omg-decompose` skill. No other agent rewrites it. The findings-loop instruction
    content is static skill text the decomposer composes; no second author, no
    sentinel, no convergence-detection.

11. **Findings-driven verification survives the re-homing.** When the reviewer
    files an epic-scoped build finding, that fix's verification is still planned
    before the fix is built, on the same footing as originally planned work, and
    the loop still terminates with no deadlock. The mechanism may be re-homed to fit
    single-author review beads and separate writing agents; the guarantee is
    unchanged. The reviewer stays blind to test mode (it executes the review bead
    as a work order).

12. **Verification planning is a standard plan-phase step.** Every decomposition
    runs test-planning then build-planning; no invocation flag, no config key, no
    agent branching on whether testing is "on." The v1 operator-invoked
    `/omg-test-plan` command is **retired**: a standing invocation surface is
    exactly the optionality this removes, and keeping it would let an operator
    re-import the opt-in model out of band.

13. **A failing-test escape hatch, in two modes.** A focused test going red is the
    **normal** build step, not an alarm: the implementer iterates red → green,
    using the suite's failure output to judge progress. It escalates **only when
    genuinely stuck** — when the failure output shows the test is wrong or
    impossible to satisfy, not merely unmet. When it does escalate, it never
    modifies the test, never forces it green, and never closes the work silently;
    it files a bead and the blocked work waits on resolution:
    - **A wrong planned test — a test planned for this epic is wrong or impossible to satisfy.**
      The bead is routed to the **test-planner** (the confidence authority), which
      upholds the test (kick back to the implementer with reasoning) or re-plans it
      (mint a corrected test bead for the test-writer). The implementer never edits
      the test.
    - **A broken promise — a pre-existing test from a prior epic breaks** because this change
      altered behavior it pinned. Recognition keys on **test-run output and this
      epic's test-bead metadata**, never on reading the test source (so it survives
      the R6 read-deny): a failure outside this epic's planned test beads is a
      broken-promise signal. Systematically, a broken promise is caught by the review-bead full-suite
      run (R8); an implementer may also surface it opportunistically. The bead is
      routed to the **PM agent**, which has the product-intent authority and the
      full Hindsight memory of why prior guarantees exist. The PM resolves it: the
      old behavior was intended (the change is wrong — kick back), the change is
      intended (the old test is stale — mint a test-update bead for the
      test-writer), or it is a genuine product decision (pause for a human — see
      R15). **The PM's broken-promise decision is captured as bead comments that the
      report-writer bead (R16) folds into the build report, and surfaces to the
      human** (who is informed, not gated). It enters Hindsight only when the
      deliberate docs→Hindsight sync command is later invoked (Goal 8, R16) — never
      as an automatic side effect. Once shipped, this gives cross-epic decisions a
      durable trail in the same memory the PM consults for the next such collision.

14. **Verification work is labeled and dispatchable like all other work.** Test
    beads and test-update beads carry the appropriate `agent` label so the foreman
    routes them with no special-casing.

15. **A red review-suite blocks the epic through the ordinary finding mechanism.**
    When the review-bead full-suite run (R8) is red, the reviewer files a finding
    bead that blocks the review bead — the existing file-and-reopen discipline —
    and its change-locality judgment sets the finding's **`agent` label**: a failure
    that should be fixed **in this epic** is labeled for the **builder**; a failure
    caused by this epic reddening a **prior** guarantee is labeled for the **PM**
    (a broken promise). Either way the finding blocks the review bead and the foreman
    dispatches it by label; when it closes, the review re-fires from a fresh context.
    **The label does more than route — it selects the resolution wiring, which
    differs by handler** (the two are not interchangeable):
    - A **builder-bound** finding follows the standard fix path, including the R13
      guarantee that its fix's verification is planned before the fix is built.
    - A **PM-bound** finding is adjudicated by the PM (R13, the broken-promise case). Its
      resolutions have their own wiring, distinct from the builder path — a
      kick-back that mints a fix bead, a test-update, or a human pause — because the
      review-time finding blocks the review bead with **no open implementation bead
      to attach to** (the epic's work has all closed). **A fix the PM mints is still
      a fix: its verification is planned before it is built, on the same footing as
      any other fix (R13's wrong-planned-test case / R11)** — a PM-minted fix must not be the one path
      that escapes verification planning, since findings-driven work escaping
      verification is the exact gap this whole effort closes.
    When the PM cannot decide, it does **not** close the finding — it places a
    **human gate** on it: a gate that hides the bead from the ready queue until a
    human resolves it, so the epic pauses cleanly instead of appearing done. (The
    gate mechanism, and the exact resolution wiring for each handler, are the design
    doc's to specify.)

16. **The epic's terminal work is beads on the graph; the foreman loses its
    closing ceremony; shipping to memory leaves the automated flow entirely.**
    - Today the foreman has a special terminal branch: when the ready queue drains,
      it inline-writes the build report and ships to Hindsight. That branch is
      **removed.** The epic's terminal work becomes **labeled beads** (minted at
      plan time, blocked behind the review bead), dispatched by label like all
      other work. With no inline "queue-empty → start shipping" leap, an empty queue
      means one thing again — everything, including any terminal bead, is done — so
      a human-gated pause (R15) can no longer be mistaken for completion. The
      human-gate trap is removed structurally, not guarded against.
    - **The automated terminal work stops at writing the build report.** A
      report-writer bead writes the build report to the docs tree and stops. It
      does **not** ship the report to Hindsight, and nothing in the automated flow
      ships the epic to Hindsight.
    - **Shipping to Hindsight (both the epic and the report) is rehomed to a
      separate, deliberately-invoked command** (a docs→Hindsight sync), run when the
      docs are actually canon. This is what makes the workflow safe under a future
      PR/merge flow: durable memory enters only on a human's deliberate act, never
      as a side effect of a build finishing on a branch that may never merge.
      Ordering guarantees that were inline foreman rules become explicit: the
      report-after-work order is a dependency edge on the terminal beads (the report
      bead is blocked behind the review bead), and the epic-before-report *ship*
      order moves to the sync command's own logic.

17. **The dispatch lifecycle contract (foreman-dispatched build-phase workers).**
    Every agent the foreman dispatches to work a bead must, before returning control,
    leave that bead in exactly one of two states: **closed** (the work succeeded), or
    **reopened *and* blocked by a new bead** (it could not finish, and the new bead —
    labeled for whoever can resolve the blocker — carries what must happen first). It
    must **never** return with the bead left `in_progress`, and **never** reopen a
    bead without a blocking bead (a reopened-but-unblocked bead re-dispatches to the
    same agent that just failed, in a loop). A dispatch is a single turn, not a
    back-and-forth with the foreman. This contract is what lets the foreman stay
    stateless — it can route purely by label and trust the bead state — so a
    violation is a defect, not a style issue. **Scope:** this governs foreman-
    dispatched build-phase workers that *operate on their own bead* (builder,
    test-writer, reviewer, PM adjudicator). It does **not** apply to the plan-time
    planners **in their plan-time pass** (build-planner, test-planner), which *mint*
    beads rather than claim and close one. (Note the test-planner is only exempt in
    that plan-time pass: when it later works a foreman-dispatched summons bead at
    build time — e.g. a wrong-planned-test escalation — it *is* a build-phase worker on its own bead
    and the contract applies, which is exactly its mandatory-close discipline.)

18. **A partially-built epic is recoverable by re-running the same command; a human
    is involved only after automatic recovery fails.** A worker can be interrupted
    mid-bead (crash, kill, power loss), leaving its bead claimed and `in_progress`.
    Because `bd ready` excludes `in_progress` beads, such a bead is invisible to the
    queue and would silently wedge the epic. Recovery has **two detection points
    feeding one recovery path:**
    - **Run-start orphan scan.** On a fresh `/omg-build`, before dispatching
      anything, the foreman scans for `in_progress` children. Since it has dispatched
      nothing yet this run, any it finds are **orphaned by definition** (leftovers
      from a prior interrupted run) — no run-state tracking needed.
    - **Drain-time stranded-bead check.** If the queue drains and the epic is not
      close-eligible, an `in_progress` child remains that this run's foreman *did*
      dispatch —
      i.e. a worker returned in violation of R17. It is treated as stranded, through
      the same recovery path (not silently reclaimed as "orphaned," and not a halt).
    - **The one recovery path (both points):** the foreman **comments the reclamation
      on the bead** (an audit trail, and a signal to the replacement) and
      re-dispatches it to a **fresh** agent by its label, instructing that agent to:
      **(1)** check whether the work is already complete — the prior agent may have
      finished but died before closing — and if so, close the bead; **(2)** otherwise
      pick up the partial work and continue to a clean terminal state (R17); **(3)**
      if it still cannot reach a clean terminal state, fail cleanly. **Bounded
      escalation:** exactly **one** automatic second chance. If the fresh agent also
      fails to reach a clean terminal state, the foreman **human-gates** the bead —
      it does not re-dispatch again. This bounds recovery (no infinite retry) and
      reserves the human for the genuinely-stuck case. The retry count is **carried on
      the bead** (via the reclamation record), not held by the foreman, so the bound
      requires no per-run foreman state — preserving the statelessness R17 rests on.
      (Where exactly the count lives on the bead is a build-time detail for the design
      and spec.)
    - **Accepted residual risk (named, not solved):** re-dispatch relies on the
      replacement agent rediscovering the prior agent's partial work. The reclamation
      comment mitigates this (it tells the replacement to look), and the risk requires
      *chained* failure (the prior agent left partial work *and* the replacement fails
      to notice). It remains possible but low-risk, and is now auditable via the
      comment. It is stated as a known cost, not claimed away.

## Scope

### In

- Splitting today's decomposer into **decomposer (plan-time orchestrator)**,
  **test-planner**, and **build-planner**, sequenced by skill-based instruction.
- Inverting the plan order to test-planning → build-planning.
- Establishing the **test-writer** as the sole test-authoring agent, owner of the
  `test-writing` skill.
- The **implementation agent** writing only code, authoring no tests, minting no
  test scope, designed for an eventual test-dir read-deny — including **removing
  its existing test-writing charter** from its persona.
- The two-hop **done-target metadata chain** (build-planner writes test-bead ids
  onto the implementation bead; test-writer writes the run-selector onto the test
  bead; implementer resolves it via metadata, never test source).
- Focused per-bead done-checks plus a **single full-suite run at the review bead**
  as the systematic catch for a broken promise and for any broken metadata chain.
- **Retiring the `/omg-test-plan` command** (the operator-invoked surface that
  carried v1's optionality).
- Sole authorship of the review bead by the decomposer, written once after both
  passes, from a static `omg-decompose` canonical block.
- Making verification planning a standard, non-optional plan-phase step.
- Structural independence via test-first ordering plus fresh-context test-writing
  dispatch in all build modes (extending looping mechanics only; routing invariant
  untouched).
- The failing-test escape hatch, both branches, including the broken-promise → PM →
  build-report → Hindsight loop.
- A red review-suite blocking the epic via the ordinary finding-and-reopen
  mechanism (change-locality sets the label; human gate for undecided PM cases).
- Re-homing the findings mechanism to fit single-author review beads and separate
  writing agents, preserving termination.
- **Dismantling the foreman's terminal branch**: the build report and any closing
  work become labeled beads on the graph, blocked behind the review bead; the
  automated flow stops at writing the build report.
- **The dispatch lifecycle contract** for foreman-dispatched build-phase workers
  (return closed, or reopened-and-blocked; never `in_progress`, never
  open-unblocked).
- **Crash/interruption recovery**: run-start orphan scan + drain-time stranded-bead
  check, one recovery path (comment → re-dispatch fresh with verify-done-then-continue
  → one bounded retry → human-gate). This adds recovery logic to the foreman's
  looping mechanics; it does not touch the label-only routing invariant.
- **Removing shipping-to-Hindsight from the automated flow** and defining its new
  home as a separate, deliberately-invoked docs→Hindsight sync command (this PRD
  defines the boundary and the removal; the command's full behavior is its own
  effort — see Deferred).

### Out

- Optionality / opt-in invocation of verification planning (and the standalone
  `/omg-test-plan` command that embodied it).
- Any change to the foreman's routing logic.
- A second build-time orchestrator.
- Sharing the `test-writing` skill with the implementer.
- A per-repo onboarding-configured "test run command" — the agent infers the
  runner from tooling; only the read-deny needs onboarding.
- Per-bead full-suite runs — the implementer runs only its focused target; the
  full suite runs once, at the review bead.
- Test taxonomy, scoring rubrics, coverage thresholds, CI/merge gating.
- Re-deriving the termination proof in this PRD.

### Deferred (named, not built)

- **The docs→Hindsight sync command's full behavior** — this PRD removes shipping
  from the automated flow and names the command as its new home, but the command's
  own design (including whether it **deletes superseded docs** from Hindsight, to
  be reconciled against `adr.platform.memory-lifecycle.0001`) is a separate effort.
- **A `ship_at: close | merge` workflow mode** — automating the sync trigger for
  PR/merge-based flows so memory enters canon at merge, not at build. The "stop at
  the build report + deliberate sync command" boundary in R16 is what makes this a
  future *addition* rather than a *rework*. Most operators are expected to want
  ship-at-merge.
- **Precise orphan detection via a session-id claimant** — if a dispatched subagent
  can read a stable session id and use it as the bead's claimant, the foreman could
  distinguish "orphaned by a dead session" from "live in a running session" at any
  moment, enabling *mid-run* recovery (not just fresh-run). Deferred pending
  verification that the harness exposes a usable, stable session id to the subagent;
  R18's run-boundary detection is sufficient for the fresh-run recovery in scope and
  requires no such harness assumption.
- **The implementation agent's test-directory read-deny** — the permission rule
  and its onboarding configuration (framework-specific). Designed-for now (R6),
  built later.
- **Systematic cross-epic verification confidence** — proactively re-checking
  shipped epics' tests under later change. R13's broken-promise path (and the review-bead
  full-suite run) handles the reactive case and seeds the memory trail; the
  systematic version is likely its own future PRD.
- **A deliberate "skip verification" opt-out mode** for throwaway/spike work.
- **Formula/molecule extraction** of the recurring plan-phase wiring, once proven.
- **Richer re-planning depth** (cascading re-plans across large subgraphs).

## Open Questions

The architect's first design pass (`design.platform.test-planning.0002`) resolved
the original four questions below — the resolutions are recorded there. They are
kept here, marked resolved, for the audit trail, plus the residual build-time
details the design left open.

1. **Plan-phase sequencing mechanism.** *Resolved:* the decomposer dispatches the
   two planners as subagents via the Task tool in fixed order (test-planner, then
   build-planner), each dispatch returning before the next — so ordering is
   guaranteed with no plan-time queue and no second orchestrator. This is why the
   v1 command-chaining blocker dissolves: dispatching a subagent is a primary
   agent's native capability.

2. **How the test-planner's intent reaches the wiring without a second review-bead
   author.** *Resolved:* two disjoint channels — the build-planner reads the test
   beads and wires the satisfies-test edges (original graph), and the static
   review-bead block summons the planner (findings). Because verification is always
   planned, the block is always present, so nothing conditionally installs it and
   the second author disappears.

3. **Baseline vs. independent, under a single test-writer.** *Resolved:* one
   authorship path (test-writer, from planned beads); confirmed no residual place
   the implementer produces a test — which is why R5 requires removing the builder's
   existing test-writing charter outright.

4. **Broken-promise recognition and re-entry.** *Resolved in principle* (see R7/R8/R13): the
   implementer classifies by this epic's test-bead metadata and run output, never by
   reading test source; the PM's decision re-enters as a kick-back, a test-update
   bead, or a human pause (R15), and is captured as bead comments the report-writer
   bead folds into the build report (reaching Hindsight only via the later sync
   command). The exact matching mechanics (run-output → test-bead selector) and the
   build-planner's requirement-to-implementation-bead mapping remain **build-time
   details for the spec**, not design gaps.

5. **Does a red prior-epic test block the epic? (was OQ-E)** *Resolved:* yes — it
   blocks via the ordinary finding-and-reopen mechanism (R15), because the breakage
   is *caused by this epic* and must not ship before the PM adjudicates. It is not a
   departure from the reviewer's disposition after all: the reviewer files a
   blocking finding as it does today, and change-locality sets only the `agent`
   label (PM vs. builder). Undecided PM cases pause the epic with a human gate.

6. **Terminal-work bead shape.** *Resolved by the design pass:* the build-report
   bead is labeled `agent=omg-reviewer` (the review agent is already the build-record
   synthesizer per `adr.platform.memory-lifecycle.0001` §5, so this adds no new
   agent), minted by the decomposer at plan time from a static `omg-decompose` block,
   and is **blocked behind** the review bead (the report bead depends on the review bead, so it
   comes ready only after the review bead is green and all findings have drained) — making the
   work-before-report ordering a dependency edge. The foreman's "Closing / build
   report / Shipping"
   sections are removed; it dispatches the terminal bead like any other. The
   "shipping is a deliberate act, not an automated phase" principle became its own
   ADR (`adr.platform.memory-shipping-boundary.0001`), and the foreman's loss of
   terminal state was folded into `adr.platform.plan-time-orchestration.0001`.

7. **Report-writer write grant (OQ-F).** The report-writer bead needs the reviewer
   to be able to write into the docs tree, but the reviewer agent is `edit: deny`
   today. **The grant's *scoping* is deferred with the rest of the `permission`
   frontmatter matrix** (see the Non-Goal in the spec): this build grants a working
   write capability, and tightening it to the docs tree (a scoped frontmatter glob,
   a satellite `external_directory` reach, or both) is part of the separate
   permissions effort. What remains a live design point is unchanged by the
   deferral: reconcile whether memory-lifecycle §5's "review agent synthesizes the
   record" is faithfully met by a terminal bead the review agent handles *after*
   the review bead closes (vs. synthesis inside the review bead).

8. **Sync-command boundary (OQ-G, deferred).** This PRD defines only the boundary
   (shipping leaves the automated flow; the report is written but not shipped). The
   docs→Hindsight sync command's own behavior — ship ordering, superseded-doc
   deletion, ergonomics — is a separate deferred effort against
   `adr.platform.memory-lifecycle.0001`.

## Related Documents

- `prd.platform.test-planning.0001` — **superseded by this PRD.** The v1 problem
  framing and decisions; preserved as the record of what was tried and dogfed.
- `design.platform.test-planning.0001` / `spec.platform.test-planning.0001` — the
  v1 design and build contract; to be superseded by `.0002` counterparts.
- `omg-decomposer` agent + `omg-decompose` skill — the decomposer split into
  orchestrator + build-planner; `omg-decompose` gains the plan-phase sequence and the
  static review-bead canonical block.
- `omg-tester` agent + `test-writing` skill — the test-writer, sole owner of the
  `test-writing` skill and sole test author.
- `omg-builder` agent + skill — the implementation agent: writes only code,
  authors no tests, designed for an eventual test-dir read-deny.
- `omg-reviewer` agent + `omg-review` skill — drives the findings loop; stays blind
  to test mode; executes the single-author review bead as a work order.
- `omg-foreman` agent + skill — routing invariant untouched; looping mechanics may
  extend for fresh-context test-writing (R6), crash/interruption recovery (R18), and
  the dispatch lifecycle contract it relies on (R17); its inline terminal branch
  (closing / build report / shipping) is dismantled into dispatched beads, and
  shipping leaves the automated flow (R16).
- `omg-builder` / `omg-tester` / `omg-reviewer` (and the PM as adjudicator) — the
  foreman-dispatched build-phase workers bound by the dispatch lifecycle contract
  (R17): return closed, or reopened-and-blocked; never `in_progress`.
- The docs→Hindsight **sync command** (new home for shipping; its full behavior,
  including superseded-doc handling, is deferred) — reconcile against
  `adr.platform.memory-lifecycle.0001`.
- `omg-product-manager` agent — broken-promise adjudicator, using Hindsight memory; its
  decision is captured as bead comments the report-writer bead folds into the build
  report (and reaches Hindsight only via the deliberate sync command).
