---
schema_version: 1
id: adr.platform.definition-of-done.0001
type: adr
title: "OMG's Definition of Done Is a Deployable Repository, Not a Verified Running System"
status: accepted
domain: platform
produced_for: spec.platform.verification-economy.0001
created_at: 2026-08-04T06:20:28Z
updated_at: 2026-08-05T03:33:25Z
hindsight:
  strategy: spec-or-adr
  tags:
    - source:authored
    - domain:platform
    - discipline:product
    - memory_type:adr
---

# ADR: OMG's Definition of Done Is a Deployable Repository, Not a Verified Running System

> Architecture Decision Record. Captures one decision: its context, the options
> weighed, the choice made, and the consequences accepted.

## Status

accepted

## Context

The OMG workflow had no stated definition of done. Each agent therefore inferred
one from its own instincts, and every instinct points outward. The confidence
planner's instinct is more confidence. The reviewer's is more findings. The
tester's is more coverage. None of those is wrong locally; there was simply no
bound, so the finish line moved in whichever direction the agent nearest it was
facing.

Three dogfooding failures share that root, and they are not separate bugs:

- A Terraform epic decomposed to roughly fifteen beads and grew to 117, producing
  7,843 lines of Python and an 897-line runbook around ~220 lines of Terraform.
- An epic minted a bead instructing a **builder** to *"run the induced-failure
  alarm exercise and record the evidence"* — that is, to break deployed
  infrastructure — because the criterion it served required a running system and
  the workflow had no vocabulary for saying so.
- The same epic minted a bead instructing a builder to *"look up the deployed
  key's current documented entitlement"* — a fact about the world, held by a
  human, that no agent could obtain and that the spec itself had labelled
  unrecoverable.

The second and third are the informative ones. Neither was an agent behaving
badly. In both cases the spec stated a real requirement, the planner faithfully
planned for it, and the work landed on the only agent available. The workflow
absorbed a requirement it had no business accepting, because nothing told it
where its responsibility ended.

A prior framing of this problem — *"the workflow cannot verify this"* — was
wrong, and its wrongness matters. It describes a capability limit, which invites
the fix of making agents more capable. The correct framing is an **ownership
boundary**: the repository is not responsible for these outcomes, so no amount of
agent capability makes them its work.

## Options Considered

**1. Absorb it at plan time.** Give the confidence planner a fifth outcome
alongside test, gate, review obligation, and no-verification: *"out of scope,
recorded and passed downstream."* The planner meets an unverifiable obligation,
records it, mints no bead, and the build report carries it onward.

Rejected. It accommodates a badly scoped input rather than rejecting it, and
graceful accommodation is the mechanism by which every failure above happened —
nothing complained, everything adapted. It also puts the workflow's boundary
inside the workflow, where a spec author never sees it. (The handoff document
named in rule 2 below is not this option revived: it removes the requirement from
the spec at authoring time, where this one keeps it inside the epic and records it
at plan time.)

**2. Instruct agents to ignore out-of-scope items, and have the build report
document them as follow-ups.** Cheap, and it keeps the spec whole.

Rejected as the primary mechanism. The scope call would be made independently by
every agent at every bead, with no record — the uninstrumented judgment this
workflow already fails on. It also makes the report writer a single point of
failure for catching everything every other agent skipped.

**3. Split the spec at the boundary of what the repository is responsible for.**
Requirements outside that boundary are relocated to a document owned by whoever
does own them.

Chosen, with the correction below. A requirement outside the repository's
responsibility is not the repository's spec's content. Every such requirement has
a real owner whether or not that owner has been identified, and *"not yet
identified"* is a gap in the system decomposition to surface — not a condition for
the workflow to route around.

**4. Add a DevOps agent** to apply infrastructure, run exercises, and capture
operational evidence.

Rejected. The work needs production credentials, which belong to CI/CD. If the
pipeline is the executor, the agent for this is the pipeline, not a model. It
would create a dispatch path whose whole purpose is doing the thing this decision
says the workflow should not do.

## Decision

**OMG carries work from product intent to a built feature, and stops there.**

An epic is **done** when the repository contains everything the feature needs and
the repository's own verification surface is green.

The test that decides the hard cases:

> **If verifying it requires the system to be running, it is out of scope.**

That line admits what a software developer normally does in the course of their
job: unit tests, integration tests against dev fixtures, linting, type checking,
building, and making the thing deployable. It excludes load tests, chaos
exercises, alarm drills, capacity planning, replica counts, and every other
verification that requires a deployed, operating instance of the system.

The distinction is **the system running**, not **dependencies available**. An
integration test against a development account is in scope: it needs the things
the code talks to, not a deployment of the code. A test that induces a failure in
a deployed service is out.

Three rules follow.

1. **A spec is scoped to what its repository is responsible for.** Requirements
   outside that boundary do not belong in it.

2. **Out-of-scope requirements are relocated, never deleted.** They move to a
   named destination — another system's spec, a **handoff** document, or a backlog
   item. The value is not a tidy spec; it is that relocation **forces the owner to
   be named**. A requirement with no home is a hole in the system decomposition,
   and that is worth surfacing rather than absorbing — never a cue to invent a
   stub to relocate into.

3. **A misfit found downstream is a complaint, not an outcome.** If a planner
   meets an obligation it cannot verify within this bound, that is a **spec
   defect**. It is surfaced at the plan phase's existing human gate, not recorded
   and routed around. Fail loudly upstream rather than accommodate quietly
   downstream.

Non-functional requirements are the largest class this excludes, and they are
excluded even when the repository plainly owns the behavior. Nobody expects the
developer who wrote a function to prove it stays under its memory allocation
under production load; that is instrumented, measured, and often owned
elsewhere. Ownership of the code is not ownership of its operational proof.

## Consequences

**What this buys.**

- A bound every agent can share. "Done" stops being inferred from local instinct,
  which is what let it drift outward in three separate directions at once.
- Work an agent cannot do is never minted. The alarm-exercise bead and the
  look-up-the-entitlement bead do not get created, rather than getting created and
  stalling.
- The scope decision is made once, by a human, at authoring time, where it is
  cheap — rather than repeatedly, by agents, at build time, where it is not.

**What this costs, accepted knowingly.**

- **Real requirements leave the epic.** A criterion like *"an alarm must have
  actually fired"* is a genuine property of the system, and after this decision
  nothing in the epic proves it. That is the point — but it means the relocation
  rule is load-bearing. Skipped, a real requirement silently disappears, which is
  worse than today's visible misfit.
- **Spec scoping becomes load-bearing and is not yet enforced.** Specs describe
  systems; requirements of this shape will keep arriving. Instrumenting the
  scoping judgment is the immediate follow-up to this decision, and until it
  exists the boundary depends on care.
- **The downstream half is undesigned, deliberately.** OMG records a relocated
  requirement and names the party that owns it; how that obligation is executed,
  tracked, or reported back is out of scope for OMG today. Designing that stage
  now would mean designing against something nobody has run. Build the first
  segment, gain experience, then extend.

**What this constrains.**

- The confidence planner's four outcomes apply only within this bound. They
  answer *how* something is verified, never *whether it is ours to verify*.
- Verification requiring a running system may not be planned as a test, a gate, a
  review obligation, or a build activity. Those are the four ways it has
  previously entered.
- Any future proposal to let the workflow deploy, operate, or exercise a live
  system supersedes this ADR rather than extending it.

## Related Documents

- `prd.platform.verification-economy.0001` — the economy requirements this
  decision bounds. R2's four outcomes now operate strictly inside it, and the
  residual-risk register (R9) records what was declined within scope, not what
  left scope.
- `omg_flowchart.md` (repo root) — the workflow map whose plan-phase and review
  paths this decision constrains.
- `/omg-spec-harden` — the one place this bound is enforced. The scoping pass
  lives there because a command is human-invoked only: its instructions never sit
  in an agent's context and nothing points at them, so hardening cannot happen
  autonomously. That is a deliberate property, and it means the boundary has
  exactly one gate and that gate is optional. A spec that skips hardening, or one
  hardened before this decision, reaches decomposition unbounded.
- `architect-docs` spec reference — corrected so it stops manufacturing the
  material this decision excludes. Its example of a well-formed requirement was
  a latency figure under load, which is verifiable only against a running system.
- `doc-templates` handoff template and `pm-docs` handoff reference — the canonical
  form of a relocation destination, added after this decision's first live run left
  seven relocated requirements pointing at a document type OMG had no form for. The
  omg-product-manager authors it; the omg-implementation-writer dispatches rather
  than writing it, because its bias toward exhaustive pinning for a coding agent
  produces exactly the procedure the type forbids. A handoff records obligations
  and their owners and never how to discharge them — that line is what lets OMG
  name an owner without designing the operations it declined to own.
