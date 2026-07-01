---
schema_version: 1
id: adr.platform.plan-time-orchestration.0001
type: adr
title: "Plan-Time Orchestration Is a Distinct Role from Build-Time Dispatch, and Verification Is a Standard Plan Phase"
status: accepted
domain: platform
produced_for: prd.platform.test-planning.0002
created_at: 2026-07-01T01:43:40Z
updated_at: 2026-07-01T04:25:58Z
hindsight:
  strategy: spec-or-adr
  tags:
    - source:authored
    - domain:platform
    - discipline:engineering
    - memory_type:adr
---

# ADR: Plan-Time Orchestration Is a Distinct Role from Build-Time Dispatch, and Verification Is a Standard Plan Phase

> Architecture Decision Record. Captures one decision: its context, the options weighed, the choice made, and the consequences accepted. An ADR is frozen once it ships to memory — supersede a shipped ADR with a new one rather than editing it. Before it ships, it is a working file and is refined in place; marking it Accepted does not freeze it.

## Status

Accepted

## Context

The OMG delivery workflow turns a spec into an epic of beads and builds it. Two moments in that lifecycle need coordination, and they are different in kind:

- **Plan time** — a spec exists and an epic must be produced: the epic bead is minted, verification is planned, the build is planned, and the review bead is authored. Nothing is running yet; there is no ready queue to drain. This work is *sequential by nature* (the build plan can only wire itself to test beads that already exist) and *single-context* (one planner reasons over the whole spec).
- **Build time** — the epic exists and its ready queue must be drained: each ready bead is dispatched to a worker, the build/review/fix loop turns, and — as the last work on the graph — a terminal report-writer bead writes the build report. This work is *queue-driven* and *fan-out capable*; the coordinator holds no state and reads each bead's `agent` label to route it. **The terminal work is beads, not a foreman branch:** the foreman drains the queue and does nothing special when it empties. (Shipping the epic and report to durable memory is deliberately *not* part of this automated flow — it is a separate human-invoked act; that boundary is decided in `adr.platform.memory-shipping-boundary.0001`, not here.)

The build-time coordinator — the **foreman** (`omg-foreman`) — is deliberately minimal: it grabs a ready bead, reads its `agent` label, dispatches, and holds no orchestration state (`adr.platform.beads-sync-ownership.0001` names this the orchestration layer; the foreman skill and agent state it as the routing invariant). That statelessness is the property that lets a new kind of worker appear in an epic and be routed with zero foreman change. It is load-bearing and the PRD (`prd.platform.test-planning.0002`, R6/Goal 6) declares it sacred.

The forces that make *this* decision necessary:

- **Plan-time sequencing has no home today.** The v1 design (`design.platform.test-planning.0001`) made test planning an operator-invoked step (`/omg-test-plan`) that ran *after* decomposition, over an already-built epic, and re-authored the review bead. v1 itself recorded (Deferred → "Automatic test planning") that it *could not* make planning a non-optional part of decomposition, because **an agent cannot invoke a slash command**, so the decomposer could not call `/omg-test-plan`. Plan-time ordering was therefore left to the operator's memory.

- **The blurring of plan-time orchestration into build-time dispatch is the trap.** The tempting fix — teach the foreman to run the planners before the build, or give it a "plan phase" — would grow orchestration state and phase-awareness into the one agent whose entire value is having none. The PRD forbids a *second build-time orchestrator* (Non-Goals) and forbids touching the foreman's routing. So plan-time coordination cannot live in the foreman, and it cannot be a new build-time coordinator either.

- **The v1 blocker dissolves once the coordinator is a plan-time agent, not a command.** An agent *cannot* invoke a slash command, but a **primary agent driving skill instruction can dispatch subagents via the Task tool and can issue `bd` writes directly** — exactly how the `omg-decomposer` already carries out decomposition "end to end" (`omg-decompose.md`). If the plan-time coordinator drives the passes as ordinary plan-time work rather than as a chained command, verification planning becomes a *standard*, non-optional plan-phase step with no flag and no config key. What v1 could only defer is buildable the moment we stop trying to chain a command and instead let a plan-time orchestrator drive the passes.

The binding constraints are **correctness of the plan/build graph** (the build plan must be wired to test beads that already exist, which fixes an ordering the coordinator must guarantee) and **maintainability of the foreman's minimalism** (any plan-time coordination that leaks into the foreman destroys the property the whole workflow depends on). Scale, security, and cost are non-binding: this is single-operator workflow tooling acting on a beads graph.

## Options Considered

### Option A — Extend the foreman with a plan phase

Give the foreman a plan phase before its dispatch loop: it mints the epic, runs the planners, authors the review bead, then drains the queue.

- **Gains.** One coordinator for the whole lifecycle; no new plan-time role.
- **Costs.** It destroys the foreman's defining property. The foreman would now hold phase state ("am I planning or building?"), sequence sub-steps, and special-case the plan work — the exact orchestration state the routing invariant forbids. It also couples two coordinators with opposite shapes (stateless queue-drainer vs. sequential single-context planner) into one agent, widening its blast radius. Rejected: it optimizes "one coordinator" at the cost of the constraint that dominates here.

### Option B — Keep planning an operator-invoked command (v1 status quo)

Leave test planning as `/omg-test-plan <epic-id>`, run by the operator after decomposition, re-authoring the review bead.

- **Gains.** No new coordination; already built and dogfed; the operator controls when it runs.
- **Costs.** Verification is optional *by omission* — an epic the operator forgets to plan ships with undisciplined, unrecorded verification (PRD Problem). It forces two authors onto the review bead (decomposer writes it plain, planner rewrites it), which spawned v1's most intricate machinery — a sentinel, a "rewrite to the same content" convergence rule, a survey step whose whole job is to detect the other author's work. And it runs planning over an *already-built* epic, defeating test-first ordering (the tests cannot precede code that already exists). Rejected: the optionality protects a control group that does not exist, and the two-author review bead is pure accidental complexity.

### Option C — A plan-time orchestrator distinct from the foreman, driving verification then build as a standard phase (chosen)

Split the decomposer's role: the **decomposer becomes the plan-time orchestrator**. It mints the epic, then drives the plan passes in a fixed order as ordinary plan-time work — dispatching the confidence planner (test-planner) and then the build planner (build-planner) — and authors the review bead once. Verification planning is a standard, non-optional step of every decomposition: no flag, no config key. The foreman is untouched; it still only drains a validated graph at build time.

- **Gains.** The two coordinators keep their distinct, correct shapes — a sequential single-context plan-time orchestrator and a stateless queue-driven build-time dispatcher — and neither leaks into the other. Verification cannot be forgotten because it is not optional. The v1 command-chaining blocker dissolves because a plan-time agent drives the passes directly instead of chaining a slash command. The review bead gets a single author (the orchestrator), retiring v1's sentinel/convergence machinery (see `adr.platform.verification-independence.0001`, which governs the boundary side of this split).
- **Costs.** Plan time gains an explicit sequencing obligation the orchestrator must honor (test beads before the build plan reads them). The sequencing lives in a skill runbook, not in enforced code, so it is a discipline the orchestrator follows — the same trust model as the rest of the workflow. And decomposition is no longer a single agent's monolithic act; it is an orchestrator plus two dispatched planners, which is more moving parts at plan time (weighed and accepted in Consequences).

## Decision

**Plan-time orchestration is a distinct role from build-time dispatch, and verification planning is a standard, non-optional plan-phase step.** Concretely:

1. **The plan-time orchestrator is the decomposer, and it is not the foreman.** The decomposer mints the epic and drives the plan phase; the foreman drains the queue at build time. The two are separate roles with separate shapes, and neither absorbs the other's coordination. There is exactly one build-time orchestrator (the foreman) and exactly one plan-time orchestrator (the decomposer).

2. **The foreman's routing invariant is untouched, and it holds no *terminal* state either.** The foreman grabs a ready bead, reads its `agent` label, dispatches, holds no orchestration state, and special-cases no bead — unchanged. Plan-time coordination adds nothing to it. **This statelessness extends to the epic's terminus: the foreman's job is to drain the ready queue, and nothing more — it holds no closing ceremony.** The epic's terminal work (writing the build report) is itself a **labeled bead on the graph**, minted at plan time by the orchestrator and blocked behind the review bead, dispatched by label like any other work. The foreman does *not* leave its dispatch loop to author a report or perform any terminal act; "the queue is empty" triggers no special branch, because the terminal work was already dispatched as ordinary beads. This removes the one non-routing special case the foreman previously held (the inline "queue-empty → write report → ship" branch), making the foreman strictly simpler. *Which* agent handles the terminal report bead, and how the terminal beads are wired, is the design doc's territory (`design.platform.test-planning.0002`); this ADR fixes only that the foreman holds no terminal state and the terminal work is on the graph. (Build-mode *looping mechanics* may still evolve for other reasons — see `adr.platform.verification-independence.0001` — but routing is off-limits, per PRD R6/Non-Goals.)

3. **The plan-time orchestrator absorbs no planning judgment.** It sequences the passes, authors the review bead, and validates the graph. The *confidence* judgment (what to verify) and the *build* judgment (what to implement) belong to the two planners it dispatches, not to the orchestrator itself. The orchestrator is coordination, not judgment.

4. **Verification planning is a standard plan-phase step.** Every decomposition runs verification planning — there is no invocation flag, no `test.auto` config key, no agent branching on whether testing is "on." The question "are we testing this epic?" is not askable; it is always planned (planning a test *or* recording a deliberate "no test needed" is the planner's franchise, not the orchestrator's, and either outcome satisfies "the phase ran").

5. **The plan phase is sequenced by skill-based instruction, not by command chaining and not by logic baked into an agent persona.** The order — mint the epic, then plan verification, then plan the build, then author the review bead — is expressed as a runbook the orchestrator follows, because an agent cannot invoke a slash command (the v1 blocker) and because baking the order into a persona would fuse coordination to identity. The mechanism (how the orchestrator drives each pass) is the design doc's territory; this ADR fixes only that a plan-time orchestrator drives it as standard work.

This decision **records the phase model and the separation of the two orchestration roles.** *How* the orchestrator drives each pass — subagent dispatch versus plan-time dependency beads versus another shape — is specified in `design.platform.test-planning.0002` and is beneath this boundary; it may change without revisiting this decision.

## Consequences

### Gained

- **The foreman keeps its minimalism intact — and gets *simpler*.** Plan-time coordination has a home that is not the foreman, so the routing invariant — the property the whole workflow rests on — is preserved without exception. And by moving the epic's terminal work onto the graph as a labeled bead, the foreman *sheds* its one prior non-routing special case (the inline "queue-empty → author report → ship" branch): it now only ever drains the queue. Where the foreman changes, it loses state rather than gaining it (PRD Goal 6).
- **An empty ready queue means one thing again.** Because the terminal work is beads that must come ready and be dispatched — not a branch the foreman runs when the queue empties — an empty queue unambiguously means "all work, including terminal work, is done." A build paused on a human gate (a blocked-but-not-ready bead) can no longer be mistaken for a finished epic, because the foreman no longer infers completion-and-terminal-action from queue emptiness. This trap is removed *structurally*, by the phase model, not by a guard added to catch it. (The gate mechanism and its termination are the design doc's; this ADR's contribution is that the foreman holds no terminal branch to be fooled.)
- **Verification is always planned.** Because the step is standard, no epic reaches build with unplanned, unrecorded verification. The "off" state (undisciplined builder-authored tests) is eliminated by construction, not by operator vigilance.
- **The v1 command-chaining blocker is retired.** Making the orchestrator a plan-time agent that drives the passes directly removes the dependency on conditional command chaining that v1 deferred on. This is additive capability the harness already supports.
- **A single-author review bead becomes possible.** With one plan-time orchestrator authoring the review bead after both passes, the two-author machinery v1 needed disappears. (The single-author rule itself and its termination consequences are owned by `adr.platform.verification-independence.0001` and `design.platform.test-planning.0002`; this ADR enables it by giving the review bead one owner at plan time.)

### Costs, risks, and new constraints accepted

- **Plan time gains a sequencing obligation.** The orchestrator must run verification planning before the build plan consumes the test beads, and both after the epic is minted. This ordering is a correctness constraint the orchestrator carries; if it runs the build plan first, the build plan cannot wire itself to test beads that do not yet exist. The obligation is discharged by skill instruction, not enforced by the harness — an accepted trust-the-runbook posture consistent with the rest of the workflow.
- **Decomposition is no longer monolithic.** The old single decomposer act becomes an orchestrator plus two dispatched planners. This is more moving parts at plan time and one more layer for an operator to reason about when a plan phase misbehaves. It is accepted because the alternative — one agent holding decomposition, confidence, and build judgment — is exactly the collapse of distinct judgments the PRD exists to correct.
- **This is a re-homing of a working mechanism, not a greenfield build.** The v1 findings-driven loop already terminates in dogfooding. Moving planning into the plan phase must not break that; the design doc re-derives termination under the new topology. Until that proof holds, this decision is not safe to build against — the dependency is named here.

## Related Documents

- `prd.platform.test-planning.0002` — the PRD this ADR was produced for; its R1 (split the decomposer into three plan-time roles), R6/R7 (foreman routing sacred, looping mechanics touchable), and R10 (verification is standard) are the requirements this decision realizes at the architectural level.
- `adr.platform.verification-independence.0001` — the companion decision on *why the agents are split* (judgment stance plus per-agent permission) and *what makes verification independent* (ordering and context isolation, not identity). This ADR governs the phase/orchestration axis; that one governs the boundary/independence axis. They are produced together for the same PRD and are relate-to, not supersede.
- `adr.platform.memory-shipping-boundary.0001` — the companion decision this ADR now points to for the *terminal/shipping* axis: shipping to durable memory is a deliberate, separately-invoked act, not an automated phase of the build. This ADR decides that the terminal *work* (the report) is on-graph and the foreman holds no terminal state; that ADR decides that the terminal *shipping* is not automated at all. Relate-to; produced together for the same PRD (R16/Goal 8).
- `adr.platform.beads-sync-ownership.0001` — names the worker/orchestration layer distinction this ADR builds on; the plan-time orchestrator, like every instrument, carries task semantics only and is mode-agnostic for sync. Unchanged by this ADR. (Distinct from `memory-shipping-boundary`: that ADR governs shipping *to Hindsight*; this one governs *beads-state* sync.)
- `design.platform.test-planning.0002` — owns the concrete sequencing mechanism (OQ1), the single-author review-bead wiring (OQ2), and the re-derived termination proof this decision's safety depends on.
- `design.platform.test-planning.0001` / `spec.platform.test-planning.0001` — the v1 design and contract this decision moves past: v1's operator-invoked, post-build, review-bead-rewriting planner is replaced by a standard plan-phase step under the plan-time orchestrator.
- `omg-decomposer` agent + `omg-epics` skill — the decomposer becomes the plan-time orchestrator; `omg-epics` gains the plan-phase sequence. `omg-foreman` agent + skill — untouched by this decision.
