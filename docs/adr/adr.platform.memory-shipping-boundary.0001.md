---
schema_version: 1
id: adr.platform.memory-shipping-boundary.0001
type: adr
title: "Shipping to Durable Memory Is a Deliberate Act, Not an Automated Phase of the Build"
status: accepted
domain: platform
produced_for: spec.platform.test-planning.0002
created_at: 2026-07-01T04:25:58Z
updated_at: 2026-07-03T00:39:17Z
hindsight:
  strategy: spec-or-adr
  tags:
    - source:authored
    - domain:platform
    - discipline:engineering
    - memory_type:adr
---

# ADR: Shipping to Durable Memory Is a Deliberate Act, Not an Automated Phase of the Build

> Architecture Decision Record. Captures one decision: its context, the options weighed, the choice made, and the consequences accepted. An ADR is frozen once it ships to memory — supersede a shipped ADR with a new one rather than editing it. Before it ships, it is a working file and is refined in place; marking it Accepted does not freeze it.

## Status

Accepted

## Context

The OMG build phase drains an epic's ready queue to completion. Two questions arrive at the terminus, and they are different in kind:

- **When is the epic's work done, and what artifact records it?** — the build report, synthesized from the workers' bead comments.
- **When does that work enter durable memory (Hindsight), so it becomes canon a future agent will trust?**

Today these two are fused. The foreman, when its ready queue drains, inline-runs a terminal branch: it authors the build report *and* ships both the epic bead and the report to Hindsight (`omg-foreman` skill, "Closing the epic → The build report → Shipping"). "The queue is empty" is treated as "the work is done," which is treated as "commit it to memory." `prd.platform.test-planning.0002` R16 and Goal 8 break this fusion. The forces that make the split necessary:

- **"The work is done" and "the memory is true" are different claims, and conflating them auto-commits memory that may be wrong-to-canon.** An epic can finish on a branch that is never merged. Under a git PR/merge workflow — which the PRD (Deferred: `ship_at: close | merge`) names as the expected future for most operators — auto-shipping at build-completion would push into canon the memory of work that may be reverted, abandoned, or superseded before it ever lands. Durable memory must not enter canon as a *side effect* of a build finishing; it must enter on a deliberate act taken when the docs are actually canon.

- **The automated "queue-empty → ship" leap is also the structural cause of the human-gate trap.** `prd.platform.test-planning.0002` R15 introduces a human gate (`bd gate create --type=human`) that hides a bead from `bd ready` while a human adjudicates a cross-epic (Mode-2) collision. Under the fused terminal branch, a gated epic can read as an *empty* ready queue while a fix is still pending a human — so the foreman would mistake a paused epic for a finished one and ship it. As long as "queue empty" triggers an automated terminal ship, an empty queue is ambiguous. Removing the automated ship removes the ambiguity at its root.

- **`adr.platform.memory-lifecycle.0001` already fixes *how* content freezes on ship, but not *what triggers* the ship in the build flow.** That ADR decides shipping is the freeze point, that an epic ships at close, and that a build-record document ships tree-sourced — the *mechanics and immutability* of shipping. It does **not** decide whether the ship is an automated step of the build or a separate deliberate act. That trigger question is this ADR's, and the two are adjacent, not overlapping: memory-lifecycle owns freeze/supersession/sourcing; this ADR owns "the build flow does not ship; a human-invoked command does."

- **`adr.platform.plan-time-orchestration.0001` already decides the terminal *work* is on-graph and the foreman holds no terminal state.** That ADR moves the build-report authoring off the foreman's inline branch onto a labeled bead. But moving the *report authoring* onto the graph does not, by itself, decide where *shipping* goes — one could imagine a terminal *ship* bead that auto-ships when the graph drains. This ADR decides that shipping does not belong on the automated graph at all; it leaves the automated flow entirely.

The binding constraints are **correctness of canon** (memory must not contain the record of work that never became real — the "phantom canon from an unmerged branch" hazard, a build-flow analogue of the phantom-finished-work hazard `memory-lifecycle` guards against at the freeze point) and **operability under a future PR/merge flow** (the boundary drawn now must let `ship_at: close | merge` be a later *addition*, not a *rework* of the build loop). Scale, cost, and multi-tenant security are non-binding: single-operator workflow tooling on a beads graph and a docs tree.

## Options Considered

### Option A — Keep shipping in the automated flow (status quo / a terminal ship bead)

Leave the ship as an automated terminal step — whether inline on the foreman (today) or as a terminal "ship bead" the foreman dispatches when the graph drains. The epic and report enter Hindsight automatically at build-completion.

- **Gains.** One motion: finishing a build leaves memory current with no separate operator step. Nothing new for the operator to remember.
- **Costs.** It auto-commits durable memory from a build that may never merge — poisoning canon with the record of reverted or abandoned work under the expected future PR/merge flow. It keeps "queue empty ⇒ done ⇒ ship" alive, which is the structural cause of the human-gate trap (a paused epic ships as finished). And it forecloses a clean `ship_at: close | merge` mode: to add merge-triggered shipping later, the automated close-triggered ship would have to be *unwound* first — a rework, not an addition. Rejected: it optimizes "one motion" against the constraint that dominates here (canon correctness under an unmerged build).

### Option B — Ship on a workflow-config flag the build flow reads (`ship_at` now)

Build `ship_at: close | merge` immediately: the build flow reads the mode and ships (or defers to merge) accordingly, inside the automated flow.

- **Gains.** Solves the merge-safety case directly and keeps shipping "automatic" for those who want ship-at-close.
- **Costs.** It builds the deferred feature now, ahead of need, and — more importantly — it keeps the *trigger* inside the build flow, so the flow still owns a shipping responsibility and still must branch on mode at the terminus. That reintroduces exactly the deployment-knowledge-in-the-task-layer smell `adr.platform.beads-sync-ownership.0001` rejects for beads sync, one layer up. The PRD explicitly defers `ship_at` and asks this round to *define the boundary and the removal only*. Rejected as premature and as leaving the trigger in the wrong layer.

### Option C — Shipping leaves the automated flow entirely; a separate deliberate command owns it (chosen)

The automated build flow stops at **writing the build report to the docs tree**. Shipping *both* the epic bead and the report to Hindsight is rehomed to a **separate, deliberately-invoked docs→Hindsight sync command**, run by a human when the docs are actually canon. Nothing in the build loop ships. "Epic close" produces artifacts (a closed graph, a report in the tree) and commits nothing to memory.

- **Gains.** Durable memory enters canon only on a deliberate human act, so a build that finishes on an unmerged branch never poisons canon. "Queue empty" no longer triggers any terminal action, so a human-gated pause can never be mistaken for a completed-and-shipped epic — the trap is removed structurally. And the boundary is exactly the seam a future `ship_at: close | merge` mode plugs into: it automates the *trigger* of the already-separate sync command without touching the build loop. The build flow sheds a responsibility that was never intrinsic to it.
- **Costs.** Shipping becomes a step the operator must remember to take; a finished build is *not* in memory until sync is run (mitigated: nothing is lost — the report is in the tree, the epic in beads — only the ship is pending, and a later `ship_at` mode re-automates the trigger). The sync command is new surface area whose own behavior (ship ordering, superseded-doc handling) must be designed — deferred here, reconciled against `memory-lifecycle`. Weighed and accepted in Consequences.

## Decision

**Shipping to durable memory is a deliberate act, not an automated phase of the build.** Concretely:

1. **The automated build flow stops at the written build report.** The epic's terminal work, as an on-graph bead (`adr.platform.plan-time-orchestration.0001`), writes the build report to the docs tree and **stops**. It performs no Hindsight write. Nothing in the build loop — not the foreman, not the terminal report bead, not any worker — ships to memory.

2. **Shipping (both the epic and the report) is rehomed to a separate, deliberately-invoked docs→Hindsight sync command.** It is run by a human when the docs are canon, not triggered by the build finishing. Its full behavior — including ship ordering (the epic before the report it describes) and whether it deletes superseded docs — is deferred and is designed against `adr.platform.memory-lifecycle.0001`, which owns supersession, retraction, and sourcing.

3. **"Epic close ≠ shipped to memory" is an intentional semantic.** Closing an epic produces artifacts (the closed graph, the tree-sourced report) and commits nothing to Hindsight. The two claims "the work is done" and "the memory is canon" are deliberately kept distinct; the workflow must not conflate them, and no instrument may treat epic-completion as authorization to ship.

4. **This boundary is what makes a future `ship_at: close | merge` mode an addition, not a rework.** Because shipping is already a separate, deliberately-triggered act, a later mode that *automates the trigger* (ship at close, or ship at merge for PR-based flows) plugs into the existing sync command without reworking the build loop. The build loop never regains a shipping responsibility.

This decision **records the boundary and the removal** — that the build flow does not ship and a deliberate command does. The sync command's own design, and the `ship_at` automation, are beneath this boundary and specified elsewhere (deferred); they may be built without revisiting this decision, provided they honor the boundary it draws.

## Consequences

### Gained

- **Canon is never auto-committed from an unmerged build.** Durable memory enters only on a deliberate human act taken when the docs are canon, so work that is reverted, abandoned, or superseded before it lands never poisons memory. This is the build-flow analogue of the freeze-at-ship discipline `memory-lifecycle` establishes: memory holds only content someone deliberately committed.
- **The human-gate trap is removed structurally.** With no automated "queue-empty → ship" leap, an empty ready queue triggers no terminal action, so a human-gated pause (a blocked-but-not-ready bead) can never be mistaken for a finished-and-shipped epic. The ambiguity is removed at its root, not guarded against with a new check.
- **A clean seam for `ship_at`.** The deferred PR/merge-safe shipping mode becomes an automation of an already-separate trigger, not a rework of the build loop. Most operators are expected to want ship-at-merge; this boundary is what lets that arrive additively.
- **The build loop sheds a non-intrinsic responsibility.** Shipping to memory was never part of "turn a spec into built work"; removing it from the build flow narrows the flow to what it is actually for and removes state from the foreman (see `adr.platform.plan-time-orchestration.0001`).

### Costs, risks, and new constraints accepted

- **Shipping is now a step the operator must remember.** A finished build is not in memory until the sync command is invoked; an operator who forgets has produced artifacts that are not yet canon. This is the intended semantic, not a defect — nothing is *lost* (the report is in the docs tree, the epic in beads; only the ship is pending) — and a future `ship_at` mode re-automates the trigger. Until then, the deliberate act is the operator's.
- **New surface area whose behavior is deferred.** The docs→Hindsight sync command must be designed: its ship ordering (epic before report), its reconciliation with `memory-lifecycle`'s supersession/retraction (including the deferred "delete superseded docs" question), and its invocation ergonomics. This ADR names the command and fixes the boundary; it does not design the command. The deferral is deliberate and tracked in `prd.platform.test-planning.0002` (Deferred) and `design.platform.test-planning.0002` (OQ-G).
- **"Done" is now less visually obvious than "done and shipped" was.** Previously a shipped epic was unambiguous evidence of completion. Now a closed-but-unshipped epic is the steady state between build-completion and a deliberate sync. Operability must make the pending-ship state (and a pending human gate) visible so a paused or unshipped epic is not mistaken for a finished-and-canonical one. This is an operability obligation on the workflow, named here and detailed in the design doc.
- **The boundary depends on no instrument shipping out of band.** The decision holds only if *no* build-flow instrument ships to Hindsight. A future instrument that quietly re-adds an automated ship at the terminus would silently re-import the exact hazard this ADR removes. The rule — build-flow instruments write artifacts, they do not ship memory — is a standing constraint every terminal-phase instrument must obey, the same way beads-sync-ownership binds every instrument to carry no `bd dolt` sync.

## Related Documents

- `prd.platform.test-planning.0002` — the PRD this ADR was produced for; its R16 (terminal work is beads; foreman loses its closing ceremony; shipping leaves the automated flow) and Goal 8 (finishing the build never auto-commits durable memory) are the requirements this decision realizes at the architectural level.
- `adr.platform.plan-time-orchestration.0001` — the companion decision on the *phase/orchestration* axis: it decides the terminal *work* (the report) is an on-graph bead and the foreman holds no terminal state. This ADR decides the terminal *shipping* is not automated at all. Produced together for the same PRD; relate-to, not supersede. Between them: the foreman drains the queue (that ADR), the terminal report is a bead (that ADR), and shipping is a separate deliberate act (this ADR).
- `adr.platform.memory-lifecycle.0001` — owns the *mechanics* of shipping: freeze-at-ship, epic-ships-at-close, tree-sourced build records, supersession, retraction, and the deferred superseded-doc deletion. This ADR is adjacent, not overlapping: it decides the *trigger* (deliberate, not automated) and the *boundary* (the build flow stops at the report); memory-lifecycle decides what happens *once* a ship is triggered. The deferred sync command is designed against memory-lifecycle.
- `adr.platform.beads-sync-ownership.0001` — the parallel "keep the deployment/persistence concern out of the task layer" decision, one layer down (beads-state sync vs. memory shipping). This ADR applies the same shape to shipping: build-flow instruments carry task semantics and write artifacts; they do not ship to memory, just as they do not narrate `bd dolt` sync.
- `design.platform.test-planning.0002` — realizes this boundary: the terminal report-writer bead writes the report and stops (no ship), the human-gate-trap removal is proven in the termination proof, and the deferred sync command is named (OQ-G). Owns the concrete wiring beneath this decision.
- `omg-foreman` agent + skill — loses its "Closing the epic / build report / Shipping" terminal branch; it drains the queue and ships nothing. The docs→Hindsight **sync command** (new, deferred) is shipping's new home.
