---
schema_version: 1
id: adr.platform.verification-independence.0001
type: adr
title: "Verification Independence Comes from Ordering and Context Isolation Enforced by Per-Agent Permission, Not from Agent Identity"
status: accepted
domain: platform
produced_for: spec.platform.test-planning.0002
created_at: 2026-07-01T01:43:40Z
updated_at: 2026-07-03T05:10:00Z
hindsight:
  strategy: spec-or-adr
  tags:
    - source:authored
    - domain:platform
    - discipline:engineering
    - memory_type:adr
---

# ADR: Verification Independence Comes from Ordering and Context Isolation Enforced by Per-Agent Permission, Not from Agent Identity

> Architecture Decision Record. Captures one decision: its context, the options weighed, the choice made, and the consequences accepted. An ADR is frozen once it ships to memory — supersede a shipped ADR with a new one rather than editing it. Before it ships, it is a working file and is refined in place; marking it Accepted does not freeze it.

## Status

Accepted

## Context

The OMG workflow's value proposition for verification is a test that *independently challenges* the code it checks — one that can fail when the code is wrong, rather than one that merely confirms the author did what the author intended. The question this ADR settles is: **what actually makes a test independent of the implementation, and where is that property enforced?**

The dogfooding of the v1 test-planning feature (`prd.platform.test-planning.0002`, "Why this supersedes") surfaced facts the v1 framing missed:

- **The builder already writes tests, unprompted, from the spec.** The architect writes acceptance criteria as verification statements; the builder is told to satisfy the spec; so the builder writes tests as a side effect. This happens whether or not anyone plans. A test written by the same agent, in the same context, as the code it verifies cannot independently challenge that code — it grades the author's own work. This is the default today.

- **In this harness, an "agent" is a persona layered onto a running context.** Two agents dispatched into one context share everything that context holds. So "the tester is a different agent from the builder" does **not**, by itself, make the tester's work independent of the builder's — if both run in one accumulating context, the tester sees the implementation as it writes the test. What creates independence is that the test was authored in a **separate dispatch**, **before** the implementation existed. Identity does not provide that; ordering and context isolation do.

- **Permissions in opencode are per-agent.** The property that would *complete* independence — denying the implementer read access to the tests, so it cannot shape code to game a test it can read — is an agent-level permission (a `permission` block in the agent's frontmatter, as every OMG agent already carries). One agent cannot simultaneously hold "may write test files" (needs test-directory access) and "may not read test files" (needs test-directory access denied). That single fact means test-authoring and implementation **must** be different agents — independent of any argument about who writes a better test.

The v1 design leaned on agent identity: a distinct `omg-tester` writer versus the `omg-builder`. But it left the builder *also* writing tests (v1 accepted builder-authored "baseline" tests), so the identities existed while the independence did not. The reframed problem is that **verification independence is a structural property — of ordering and context isolation, made enforceable by per-agent permission — and the agent boundaries must be drawn so that property can be enforced where the harness can enforce it.**

The binding constraints are **correctness of the independence guarantee** (a test that cannot independently fail is worse than no test, because it manufactures false confidence) and **security/operability of the enforcement** (the boundary must sit where the harness can actually hold it — per-agent permission — not in prose an agent may drift from). Scale and cost are non-binding.

## Options Considered

### Option A — Independence from agent identity alone (v1's effective posture)

Declare a distinct tester agent and a distinct builder agent, and treat "different agents" as the independence guarantee, while still permitting the builder to author tests.

- **Gains.** No permission model needed; matches the existing agent roster; simple to state.
- **Costs.** It does not deliver independence. Because an agent is a persona on a context, two agents in one context share state, and because the builder still writes tests, the same context authors both the code and (some of) its tests. The label says "independent"; the mechanism does not enforce it. This is the v1 gap the reframe exposes. Rejected: it names a property it cannot back.

### Option B — One writing agent that both plans-blind-writes and implements, disciplined by prose

Keep a single writing agent and instruct it, in prose, to write tests first and then implement without gaming them.

- **Gains.** Fewest agents; no cross-agent coordination.
- **Costs.** It is unenforceable on the two axes that matter. A single agent cannot be simultaneously permitted and denied test-directory access, so the read-boundary is impossible. And "write the test first, then don't peek" is a discipline the harness cannot hold when both jobs live in one context. Rejected: the whole point is to move independence from prose to structure, and this keeps it in prose.

### Option C — Split writing by judgment-stance and per-agent permission, with independence from ordering plus context isolation (chosen)

Draw the writing boundary so that a **test-writer** owns test authorship (and the `test-writing` skill) and an **implementation agent** writes only code and authors no tests. Enforce independence structurally: tests are authored **before** the implementation (test-first ordering) and in a **dispatch isolated from** the one that writes the code (context isolation), and the split is drawn specifically so per-agent permission can eventually **deny the implementer read access to the test directory** — which is only possible with the two roles as separate agents.

- **Gains.** Independence is a property the harness can enforce: ordering is fixed by the plan graph (test beads precede implementation beads), isolation is fixed by dispatching test-writing in a fresh context, and the read-boundary is a per-agent permission. The `test-writing` skill gets one clear owner. The reason the agents are separate is now the *enforceable boundary*, not a claim about craft.
- **Costs.** Two writing agents instead of one; a fresh-context test-writing dispatch that some build-loop modes must add; and the read-deny permission is framework-specific (the test path varies by stack) so it is configured at onboarding and deferred, not shipped in the first cut. These are weighed in Consequences.

## Decision

**Verification independence is a structural property — from test-first ordering and context isolation, made enforceable by per-agent permission — not a property of agent identity. Agent boundaries are drawn by judgment-stance and permission enforcement so that independence can be enforced where the harness enforces it.** Concretely:

1. **Two writing agents, split by permission and franchise, not by craft.** A **test-writer** authors all tests, owns the `test-writing` skill, and is the role that carries the capability to write test files. An **implementation agent** writes only code, authors or alters no test, mints no test scope, and does not load the `test-writing` skill. The craft of a good test lives in the shared skill; the *reason* these are two agents is the permission boundary and the authorship franchise — a boundary the harness enforces **by per-agent `permission` frontmatter, which is designed-for here but whose exact grant matrix is named-deferred, not specified in the first cut.** The split ships now (separate agents, distinct franchises, delivered by instruction); the *permission enforcement* that will make it airtight arrives with the deferred permissions effort. Until then the boundary holds by role and instruction, the same trust-the-runbook posture the rest of this workflow uses.

2. **Independence is structural, not nominal.** It is guaranteed by two things together: **ordering** — tests are planned and authored before the implementation exists — and **context isolation** — test-writing is dispatched in a context separate from (and, by ordering, prior to) the one that writes the code. Agent identity alone is explicitly *not* the guarantee, because an agent is a persona on a context and two agents in one context share state.

3. **The read-boundary is per-agent, and it is why the split is mandatory.** The implementation agent is designed to be eventually **denied read access to the test directory**, so it satisfies tests it cannot see or game. Because opencode permissions are per-agent, this is only expressible with the writing roles as separate agents. The deny rule is framework-specific and configured at onboarding; it is **named-deferred but designed-for**. No design may assume the implementer can read tests.

4. **Verification scope has exactly one owner (the confidence planner), disjoint from all writing.** Deciding *what* to verify (or deliberately not to) is the confidence planner's exclusive franchise. The implementation agent mints no test scope; the build planner mints no test scope and derives its completeness from the spec, reading the test beads only to wire dependencies. No writing agent decides scope.

5. **The single-author review bead follows from this same logic.** Because independence and boundaries are structural rather than negotiated between agents, the review bead needs no cross-agent handshake: it has exactly one author (the plan-time orchestrator), written once from a static canonical block, retiring v1's two-author machinery (sentinel, "rewrite to the same content", convergence-detection). A boundary that is enforced structurally needs no protocol to reconcile two authors.

This decision **records the independence principle and the boundary rationale.** *How* ordering and isolation are wired into the plan and build graphs, and how the fresh-context test-writing dispatch is added to the build-loop modes, are the design doc's territory and beneath this boundary.

## Consequences

### Gained

- **Independence the harness can enforce.** Ordering is enforced by the plan graph, isolation by fresh-context dispatch, and the read-boundary by per-agent permission — three enforceable mechanisms replacing one unenforceable claim ("different agents means independent").
- **A single owner for test scope and for test craft.** The confidence planner owns *what to verify*; the test-writer owns *how to write it well* (via the `test-writing` skill). No agent does a judgment or a craft in passing that degrades it.
- **The two-author review bead is retired.** Structural boundaries remove the need for the sentinel/convergence machinery v1 built to reconcile two review-bead authors.
- **A clean deferral seam for the read-deny.** Because the split is drawn for the permission boundary now, adding the test-directory read-deny later is a per-agent permission edit at onboarding — additive, not a redesign.

### Costs, risks, and new constraints accepted

- **Two writing agents and a fresh-context dispatch.** Splitting writing adds an agent and requires that every build-loop mode dispatch test-writing in a fresh context (so a mode that would otherwise reuse one context does not fuse test and code authorship). This touches build-mode *looping mechanics* — permitted — but must not touch the foreman's routing invariant (`adr.platform.plan-time-orchestration.0001`, PRD R9). The design doc owns that mechanic.
- **The read-deny is deferred and framework-specific.** The completing property (implementer blind to the test directory) is not in the first cut; it is configured at onboarding per stack. Until it lands, independence rests on ordering and isolation alone — strong, but not yet the full guarantee. The design must never *assume* the implementer can read tests, so that enabling the deny later breaks nothing.
- **The implementer cannot fix a test it cannot pass — by design.** With the implementer barred from authoring or altering tests (and eventually from reading them), a stuck test needs an escalation path rather than a local edit. This is a deliberate constraint that makes the escape-hatch mechanism (routed to the confidence planner or the PM) load-bearing rather than optional; the design doc owns it.
- **Independence between two agents still depends on the harness honoring per-agent context and permission.** If a future harness change let two agents truly share a live context with shared permissions, the isolation guarantee would weaken. The dependency on opencode's per-agent permission and dispatch model is real and named here.

## Related Documents

- `prd.platform.test-planning.0002` — the PRD this ADR was produced for; its R5 (two writing agents split by permission + franchise), R6 (structural independence: ordering, fresh-context dispatch, eventual read-deny), R3 (test scope is the confidence planner's exclusive franchise), and R10 (single-author review bead) are the requirements this decision realizes.
- `adr.platform.plan-time-orchestration.0001` — the companion decision on the *phase model* (plan-time orchestration distinct from build-time dispatch; verification as a standard phase). This ADR governs the boundary/independence axis; that one governs the phase/orchestration axis. Produced together for the same PRD; relate-to, not supersede.
- `adr.platform.beads-sync-ownership.0001` — the worker/orchestration layer split this ADR's agents obey; every agent here carries task semantics only and is mode-agnostic for sync. Unchanged.
- `design.platform.test-planning.0002` — owns how ordering, isolation, and the fresh-context dispatch are wired, the escape-hatch mechanism the read-boundary makes load-bearing, and the re-derived termination proof.
- `design.platform.test-planning.0001` / `spec.platform.test-planning.0001` — the v1 design and contract this decision moves past: v1's builder-authored baseline tests and identity-based independence are replaced by structural independence and a sole test-writer.
- `omg-tester` agent + `test-writing` skill — the test-writer, sole owner of `test-writing` and sole test author. `omg-builder` agent + skill — the implementation agent, writing only code, designed for an eventual test-directory read-deny. `omg-decomposer`, `omg-reviewer`, `omg-foreman`, `omg-product-manager` — the roles the design wires around this boundary.
