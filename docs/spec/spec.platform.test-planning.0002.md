---
schema_version: 1
id: spec.platform.test-planning.0002
type: spec
title: "Verification Ownership Across the OMG Plan/Build Phases — Instruments"
status: draft
domain: platform
supersedes: spec.platform.test-planning.0001
created_at: 2026-07-02T04:56:45Z
updated_at: 2026-07-04T12:00:00Z
hindsight:
  strategy: spec-or-adr
  tags:
    - source:authored
    - domain:platform
    - discipline:engineering
    - memory_type:spec
---

# Verification Ownership Across the OMG Plan/Build Phases — Spec

> Specification. Defines what the system or component must do, precisely enough
> to be built and verified against.
>
> **Status: draft.** Buildable contract for the verification-ownership
> re-architecture, derived from the PRD `prd.platform.test-planning.0002` and the
> design doc `design.platform.test-planning.0002`. Supersedes
> `spec.platform.test-planning.0001`. It is **not yet approved for build** until
> the architect's buildability pass clears.

## Why this supersedes `spec.platform.test-planning.0001`

The v1 spec built a single operator-invoked `omg-test-planner` that both planned
verification and rewrote the review bead, leaving the builder as a residual
test author. Dogfooding the v1 feature surfaced facts the v1 framing missed (the
builder already writes tests unprompted; independence comes from ordering and
per-agent permission, not identity; one review-bead author is enough; testing
must not be optional). The PRD `.0002` re-frames the problem around those facts
and reverses several v1 decisions. This spec is the build contract for that
re-framed feature. The v1 spec is preserved as the record of what was built and
dogfed.

## Overview

This spec defines the concrete build contract for **verification ownership** in
the OMG delivery workflow: the set of opencode instruments to create, edit, and
retire so that — per the PRD — tests are authored independently of the code they
verify, verification scope has exactly one owner, verification is a standard
non-optional phase, a stuck test never becomes a silent hack, finishing a build
never auto-commits durable memory, and no dispatch or crash can strand an epic.

The "build" here is **opencode instruments, not application code**: Markdown
agent personas, skill runbooks, and slash commands under the repo's `opencode/`
tree (and, for skills that are dogfooded, their `.opencode/` mirror). The builder
of this spec is **oc-smith** (the instrument author), not a coding agent —
oc-smith is a harness-only, deliberately-unshipped agent, so building it *with*
the OMG workflow it is changing is avoided. This instrument build is therefore
driven by **direct oc-smith invocation, not by `/omg-build` label-dispatch.** That
is not a contradiction with the label-dispatch machinery the instruments
themselves describe: those instruments define how *future* epics are built; this
spec's own build is a one-off authoring pass. (Consequently the runtime "first
dogfood" acceptance below runs against a *later* live epic, not against this
authoring build.)

The **mechanism** — the four-role plan split, the test-first inversion, the
two-hop metadata chain, the findings loop, the escape hatch, the terminal-bead
graph, the crash-recovery path, and the **termination proof** that ties them
together — is **fully specified in the design doc and is not relitigated here.**
This spec's job is narrower: state, per instrument, the behavior that must be
true, its inputs and outputs, and the acceptance criteria that confirm the PRD's
need is met — traced to a PRD goal/requirement or a design decision.

### Naming, inherited from the design doc

Used throughout, so a requirement can name a bead precisely:

- **`R`** — the epic's review bead (`agent=omg-reviewer`), authored once by the
  orchestrator.
- **`P`** — the terminal report-writer bead (`agent=omg-reviewer`), blocked
  behind `R`.
- **`impl` / `x`** — an implementation bead (`agent=omg-builder`); `x` also
  denotes a finding's fix bead.
- **`z` / `z′`** — a planned test bead (`agent=omg-tester`); `z′` a re-planned one.
- **`y`** — a planner-summons bead (`agent=omg-test-planner`), real and durable.
- **`w₁` / `w₂`** — a build-time escape-hatch bead: `w₁` to the test-planner
  (Mode 1), `w₂` to the PM (Mode 2).
- **`m`** — a review-time Mode-2 adjudication bead (`agent=omg-product-manager`),
  blocking `R`, with no open `x`.
- **`x_m` / `y_m`** — a PM-minted fix and its verification summons (review-time
  Mode 2).
- **`u`** — a test-update bead (`agent=omg-tester`) for a stale prior-epic test.
- **`s`** — a stranded/orphaned `in_progress` bead recovered by the foreman.

### The instruments (build inventory)

Every instrument traces to the design doc's "Instruments to Create / Change"
table. Skills marked **(both trees)** exist in `opencode/skills/` (the shipped
**source**) and `.opencode/skills/` (the dogfooding **mirror**); the build edits
the source and mirrors into the harness per the repo's sync discipline.

| # | Instrument | Action |
|---|---|---|
| I1 | `opencode/agents/omg-decomposer.md` | **Edit** — becomes the plan-time orchestrator |
| I2 | `opencode/agents/omg-build-planner.md` | **Create** — the build-judgment planner |
| I3 | `opencode/agents/omg-test-planner.md` | **Edit** — retarget from v1 to plan-pass + summons authority |
| I4 | `opencode/agents/omg-tester.md` + `test-writing/SKILL.md` | **Edit** — persona: sole-test-writer identity + R17 *kernel*; **skill**: hop-2 selector write, Case-A/B write behavior, R17 steps, R18 recovery (mechanics out of the persona) |
| I5 | `opencode/agents/omg-builder.md` + `omg-builder/SKILL.md` | **Edit** — code-only, hop-3 resolve, escape hatch, R17/R18 clauses |
| I6 | `omg-epics/SKILL.md` **(both trees)** | **Edit** — plan-phase sequence + test-planning wiring + static `R`/`P` blocks |
| I7 | `omg-foreman/SKILL.md` **(both trees)** | **Edit** — fresh-context test-writer, terminal-branch removal, crash recovery |
| I8 | `opencode/agents/omg-foreman.md` | **Edit** — persona sheds report/ship narration |
| I9 | `omg-review/SKILL.md` **(both trees)** | **Edit** — R15 finding wiring + `P` handling + R17 clause |
| I10 | `opencode/agents/omg-product-manager.md` (persona) + `omg-epics/SKILL.md` (wiring) | **Edit** — persona already carries only the product-intent kernel + R17 kernel + pointer to `omg-epics` (Mode-2 wiring/gate mechanics live solely in `omg-epics`, done). **Live work:** author the PM **R18 recovery clause** into `omg-epics` §Mode-2 (R10.7 — it is missing there), and collapse the triplicate `omg-epics` pointer in the persona |
| I11 | `opencode/agents/omg-reviewer.md` | **Edit** — able to write the report for `P` (grant shape deferred) |
| I12 | `opencode/commands/omg-decompose.md` | **Edit** — the ask now covers the full plan phase |
| I13 | `opencode/commands/omg-test-plan.md` | **Retire / remove** — the v1 opt-in surface |
| I14 | docs→Hindsight **sync command** (name TBD) | **Create — boundary only; behavior deferred** |
| I15 | `opencode/commands/omg-build.md` | **Edit** — shed the report-synthesis + ship steps; drive drain-and-close only (the terminal report is the dispatched `P` bead; nothing ships). Preserve the build-mode resolution and the `then:` chain |
| I16 | `opencode/commands/omg-ensure-work-finished.md` | **Edit** — the `then:` follow-up verifies drain / terminal-`P` dispatch / close only; remove every write-the-report-yourself and ship clause, and the dangling `omg-foreman`-skill closeout/shipping reference |

Instruments and properties deliberately **out of scope to change** (a change is a
build defect): the foreman's **label-only routing invariant** (I7/I8 touch only
looping mechanics), the `test-writing` skill's grant to anyone but the tester,
and any reintroduction of a test taxonomy, scoring rubric, or ephemeral bead
class.

**The who/how/ask split is a build invariant, not a stylistic preference.** Every
instrument row above that pairs an agent with a skill (I4, I5, I9, I10) means the
**persona** carries unconditional identity/values and the **skill** carries the
situational procedure — the `bd` flag sequences, bead-wiring topologies, and
escalation/recovery step-lists. Baking that conditional procedure into a persona
loaded on every turn is a **build defect** (see the per-row instrument-shape rules
and the *Non-Goals* entry). This spec's own I4/I10 requirements were originally
worded loosely enough to be read as "inline the mechanics in the agent"; the
corrected wording is authoritative. The tester (`omg-tester.md`) and the PM
(`omg-product-manager.md`) have since been brought into conformance — their
mechanics live in the `test-writing` skill and `omg-epics` respectively — so their
shape rules now stand as regression guards, not pending corrections. Where a built
instrument still takes the loose reading, the correction moves the mechanics to the
skill.

**Prose economy is a second, orthogonal build axis — the who/how split is
necessary but not sufficient.** Content correctly placed in a persona can still
restate one invariant many times, import a concept only to forbid it, or defend
against a failure never observed. Every instrument this build creates or edits and
that carries persona/skill prose (the I1–I10 and I12 rows; the retirement I13, the
grant-only I11, and the boundary-only I14 have no prose to economize) MUST also
pass the **"Write for the model"** pass defined in the `authoring-opencode` skill —
the per-line cut test ("would removing this line cause the agent to make a
mistake?"), state-each-rule-once, crisp singular negatives with a one-clause
rationale on non-obvious rules, guardrails earned by observed failures rather than
anticipated ones, and no concept-leak. This spec does **not** restate those rules;
the `authoring-opencode` skill is their sole owner, and restating them here would
duplicate authority that drifts — the very fault the standard names. The two axes
are independent: passing the who/how placement rule does **not** discharge this
one, and an over-stated but correctly-placed persona (the `omg-foreman.md` pilot,
which restates "authors/ships nothing" eight-plus times) is still a build defect.
**Order of operations:** placement first, economy second — the economy pass runs on
already-correctly-placed content; it never relocates a rule (that is the who/how
axis's job) and never strips a kernel a placement rule requires present, and it
honors the standard's own keep-rules (rationale earns its tokens on non-obvious
rules; a crisp negative is not a defect; minimal is not the same as short). This
axis is **scoped to the instruments this build already edits** — an economy sweep
of untouched OMG instruments is a separate effort (see the review's follow-up-sweep
note) and widening the diff to reach them is a build defect, not diligence.

## Requirements

Each requirement is stated so it can be verified, and traces to a PRD
goal/requirement (`PRD Gn` / `PRD Rn`) or a design decision. Every requirement is
**[MUST]** unless marked otherwise; a **[MUST — do not build here]** requirement
marks a boundary the build must respect by *not* building the named thing (it is
in scope to honor, out of scope to implement). Requirements state **what must be
true of the instrument**; the *why* and the correctness argument live in the
design doc and are not repeated.

### I1 — `omg-decomposer` becomes the plan-time orchestrator

> **Instrument-shape rule for I1 (who/how/ask; do not violate).** The decomposer
> **persona** carries only the **unconditional kernel** — *I sequence, I do not
> judge (I decide neither what to verify nor what to implement); verification is
> always planned before the build, never toggled* — plus a **pointer** to the
> `omg-epics` plan-phase sequence. The **ordered step-list** (mint → test-planner →
> build-planner → author `R` → mint `P` → validate), the **`bd` wiring** (`bd dep
> add <P> <R>`, the `agent`-label stamp, the `spec_id`/ADR-scan mechanics), and the
> static-block authoring procedure are **how-to** and live in the **`omg-epics`
> skill** (with the `bd` forms in `omg-commands`), which the persona points at. **The
> build MUST NOT restate the ordered step-list or carry `bd` flags in the persona.**
> The "always-planned, never-toggled" fact is a persona kernel value stated once;
> the operator-facing "no test-planning flag, no config key" negation is the
> **command's**, per R12.1, not the persona's. (The built `omg-decomposer.md` had a
> "What You Know" section duplicating the skill's mechanics and carrying literal `bd`
> commands; **since corrected** — the section is deleted and the mechanics are homed
> in the skill, leaving a disposition-only persona. This rule now stands as a
> regression guard.)

- **R1.1 [MUST] — Orchestrates, judges nothing.** The decomposer's persona drives
  the plan phase in the fixed order the `omg-epics` plan-phase sequence defines
  (R6.1 owns the canonical ordered list; the persona does not restate it) and
  **absorbs none of the planning judgment** (no test-scope decisions, no
  build-completeness decisions of its own). It sequences and wires; the planners
  judge. (PRD R1; design I1.)
- **R1.2 [MUST] — Sequential subagent dispatch, ordering guaranteed.** It
  dispatches the two planners as subagents via the Task tool, each dispatch
  returning before the next, so test-planning strictly precedes build-planning
  with no plan-time queue and no second orchestrator. (PRD R1/R2; design OQ1-A.)
- **R1.3 [MUST] — Able to dispatch the two planners.** The orchestrator must be
  able to dispatch `omg-test-planner` and `omg-build-planner` as subagents (the
  capability R1.2 relies on). **This build does not specify the `permission`
  frontmatter that would scope that dispatch** — see the Non-Goal on permission
  frontmatter; the exact `task:`/`skill:` grant matrix is a separate deferred
  effort. (Design I1.)
- **R1.4 [MUST] — Mints the terminal report-writer bead `P` at plan time.** After
  authoring `R`, it mints `P` (`agent=omg-reviewer`) and wires it **blocked
  behind `R`** — `R` blocks `P`, i.e. `P` depends on `R` (`bd dep add <P> <R>`).
  This is what moves the epic's terminal work onto the graph. (PRD R16, G8;
  design I1, Region 4.)

### I2 — `omg-build-planner` (new agent)

> **Economy rule for I2 (do not violate).** I2 pairs no dedicated skill (its wiring
> lives in `omg-epics`, which the persona points at), so the *placement* risk the
> I1/I4/I5/I9/I10 shape rules guard against is not live here — the persona correctly
> carries no `bd` flags or step-lists. The live risk is the **economy axis**: the
> persona states each value (completeness-from-spec, no test scope, test-before-code,
> the hop-1 stamp) **once each** and does **not** append a "what I do not touch"
> section that re-enumerates read-only or no-test-scope already stated as values
> (state-once). It carries **no dolt-sync or dolt-mode prose** — see the central
> dolt-disclaimer Non-Goal below; mode-agnosticism is true by the agent never
> touching sync, not by a persona guardrail.

- **R2.1 [MUST] — Read-only on source; mutates only beads.** The build-planner
  writes no source files; it mints and wires beads through `bd`. (The permission
  frontmatter that would *enforce* read-only is not specified by this build — see
  the Non-Goal on permission frontmatter.) (PRD R1; design I2.)
- **R2.2 [MUST] — Completeness derives from the spec, not from the test beads.**
  Every requirement and acceptance criterion in the epic's source spec is spoken
  for by at least one implementation bead — **whether or not** the test-planner
  planned a test for it. A behavior the test-planner declined to test still gets
  its implementation bead. It reads acceptance criteria as *what behavior must
  exist*, never as *what test to write*. (PRD R4; design I2, OQ-B.)
- **R2.3 [MUST] — Mints no test scope.** It creates no test beads and records no
  test/no-test decisions; that franchise is the test-planner's alone. (PRD R2/R4.)
- **R2.4 [MUST] — Wires the default test-blocks-implementation edge.** For each
  behavior the test-planner planned a test (`z`) for, the build-planner wires
  `z` blocks `impl` (`bd dep add <impl> <z>`) — the default Case-A ordering that
  makes the test precede the code. (PRD R2; design I2, Region 1.)
- **R2.5 [MUST] — Writes hop-1 of the metadata chain.** It stamps onto each
  implementation bead the **bead id(s) of the test bead(s) it must satisfy** — a
  stable reference knowable because the test beads already exist. This is what
  lets the implementer later find its done-target without reading test source.
  (PRD R7 hop 1; design metadata-chain section, OQ-B.)

### I3 — `omg-test-planner` (retargeted from v1)

> **Instrument-shape rule for I3 (who/how/ask; do not violate).** The test-planner
> **persona** carries the **unconditional kernel** — the confidence-first posture,
> and the value *a summons bead (`y`/`w₁`) exists only to summon me and I close it in
> every branch before my run ends, because a summons left open deadlocks its fix
> forever, so it is never something I infer*. The **conditional mechanics** — the `bd
> close <y> --reason …` form, the Case-A/Case-B edge wiring, the two-branch
> uphold-vs-re-plan step-list, and the R18 reclamation-check — are **how-to** and
> live in the **`omg-epics` §Test-planning wiring** section (verified present: the
> `bd close <y>` form, the Case A/B edges, and the Mode-1 `w₁` uphold/re-plan
> resolution are already there), with the `bd` forms in `omg-commands`. The persona
> already points at that section; it MUST NOT *also* restate the uphold/re-plan
> step-list or carry `bd` flags. (The built `omg-test-planner.md` had all of it
> inlined in "Your build-time summons authority" and "The dispatch-lifecycle
> contract"; **since corrected** — those step-lists are deleted and only the kernel
> remains. This rule now stands as a regression guard.)

- **R3.1 [MUST] — Read-only on source; confidence-first posture.** The
  test-planner writes no source files (it mints beads and records decisions).
  Plans verification only where it materially increases justified confidence, and
  is as willing to record a **no-test decision, with a reason**, as to plan a
  test. (The enforcing permission frontmatter is not specified by this build —
  see the Non-Goal on permission frontmatter.) (PRD R2/R3, G5; design I3.)
- **R3.2 [MUST] — Minimal vocabulary, and nothing more.** Its entire expressive
  vocabulary is: a test bead (`z`, `agent=omg-tester`) or a recorded no-test
  decision. No taxonomy, no scoring rubric, no test-type enum, no
  ephemeral/checkpoint bead. Reintroducing any is a build defect. (PRD R3,
  Non-Goals; design I3.)
- **R3.3 [MUST] — Plan-pass: mint test beads, first, before any implementation
  exists.** In the plan phase it mints the `z` beads for behaviors it judges
  warrant verification and records no-test decisions for the rest — running
  before the build-planner, so tests are planned before implementation. (PRD
  R2/R3; design I3.)
- **R3.4 [MUST] — Build-time summons authority (`y`) with mandatory close.** When
  dispatched on a summons bead `y`, it upholds or re-plans the finding's
  verification and closes `y` in every branch before its run ends. The
  **mandatory-close is a persona kernel value** (stated unconditionally, in the
  planner's own voice, with its deadlock rationale — it must never be left to
  inference); the **branch-by-branch procedure and the `bd close <y> --reason …`
  form are `omg-epics`'s**, per the I3 shape rule — the persona does not carry them.
  (PRD R11; design I3, Region 2.)
- **R3.5 [MUST] — Mode-1 escape authority (`w₁`) with mandatory close.** When
  dispatched on a `w₁` bead (a planned test the implementer found wrong or
  impossible), it either upholds the test or re-plans it (a corrected `z′` for the
  test-writer), and closes `w₁` in every branch. The uphold-or-re-plan **step-list
  and its wiring live in `omg-epics`** (per the I3 shape rule); the persona carries
  only the kernel that it answers and closes the summons. (PRD R13 Mode 1; design
  I3, Region 3.)
- **R3.6 [MUST] — The v1 review-bead-rewrite contract is removed.** The
  "also rewrite `R`" two-step run and the convergence-survey machinery whose job
  was to detect the other review-bead author are **deleted** — the orchestrator
  owns `R` now, and there is only one author, so there is no other author to
  survey for. (PRD R10; design I3, OQ2/OQ3.)

### I4 — `omg-tester` + `test-writing` skill (the sole test-writer)

> **Instrument-shape rule for I4 (who/how/ask; do not violate).** The tester
> **persona** carries the **unconditional kernel** — the sole-test-author identity
> and the standing dispositions true in every tester conversation. The
> **conditional procedure** (the exact `bd` run-selector write, the R17
> reopened-and-blocked steps for `z`/`z′`/`u`, the R18 recovery check) is
> **how-to**, and it lives in the **`test-writing` skill** (with the `bd` write
> itself in `omg-commands` §Bead metadata, which the tester already loads). **The
> build MUST NOT bake those `bd` flags or step-lists into the persona.** (The built
> `omg-tester.md` already models this correctly — kernel + skill pointer, with the
> run-selector write, the Case-A/Case-B write behavior, the R17 file-and-block
> steps, and the R18 recovery all homed in the `test-writing` skill and no `bd`
> flags inline; R4.1–R4.4 are the rule that keeps a future build from regressing
> it, not a correction of a still-present defect.)

- **R4.1 [MUST] — Persona kernel: sole test author, honoring pre-planned beads.**
  The persona states, as identity, that the tester is the **only** agent that
  authors tests, works from beads the confidence planner minted, and re-decides no
  scope the planner justified. The Case-A/Case-B *write-behavior* semantics ("write
  the failing test for a Case-A bead; author/run the post-fix test for a Case-B
  bead") are procedure and live in the **`test-writing` skill**. (PRD R2/R5;
  design I4.)
- **R4.2 [MUST] — Hop-2 run-selector: the ownership is kernel, the write is skill.**
  The persona may state the **fact** that the tester is the only agent that can
  stamp a test's concrete run-selector (it just wrote the test and knows the real
  identifier). The **write mechanic** — the exact `bd` set-metadata command, and
  that it is done for `z`/`z′`/`u` alike — lives in the **`test-writing` skill**
  (pointing at `omg-commands` §Bead metadata for the `bd` form). The persona must
  **not** carry the `bd update … run_selector=…` command. (PRD R7 hop 2; design I4,
  metadata-chain section; `omg-commands` §Bead metadata.)
- **R4.3 [MUST] — Dispatch-lifecycle contract (R17): kernel in persona, steps in
  skill.** The persona carries the R17 **kernel** as a value in the tester's own
  voice: *a dispatch is a single turn; you return the bead closed, or reopened and
  blocked by a new bead — never `in_progress`, never reopened-unblocked.* The
  `z`/`z′`/`u` **bead-binding** and the reopened-and-blocked **procedure** (file
  bead → wire block → reset → stop) live in the **`test-writing` skill**. (PRD
  R17; design I4, R17 section.)
- **R4.4 [MUST — skill, not persona] — Recovery-aware clause (R18).** The R18
  behavior (on a bead carrying a reclamation comment, first check whether the test
  was already authored — close if so — else continue the partial work to a clean
  terminal state) is **wholly conditional**, so it has **no persona kernel** and is
  authored in the **`test-writing` skill**, not the persona. (PRD R18; design I4.)

### I5 — `omg-builder` + `omg-builder` skill (the implementation agent)

> **Instrument-shape rule for I5 (who/how/ask; do not violate).** The builder
> **persona** carries the **unconditional kernel** — the code-only identity, the
> "red is normal, never edit a test to pass" honesty value, and the R17 kernel —
> and it **points to** the `omg-builder` skill for the escape-hatch and recovery
> **procedure**. The **mechanics** (classify Mode 1/2 by run-selector match, `bd`
> create `w₁`/`w₂`, `bd dep add`, the mandatory `bd update <x> --status open
> --assignee ""` reset, the R18 recovery check) live in the **`omg-builder`
> skill** (and the reset is also owned verbatim by `omg-epics` §escape-hatch).
> **The `bd` flags MUST NOT appear in the persona.** (The built `omg-builder.md`
> models the `bd`-flags-and-pointer split correctly — the escape-hatch/Mode-1-2/
> recovery mechanics are in the skill, the persona points at it, no `bd` flags
> inline. **One gap the build must close:** the R17 single-turn kernel currently
> lives *only* in the skill's escape-hatch section (§"dispatch-lifecycle contract")
> and is **absent from the persona** — unlike the tester/PM/foreman personas, which
> carry it. R5.8 requires promoting that kernel sentence into the persona in the
> builder's own voice, leaving the escape-hatch *application* in the skill per R5.6.
> Read R5.5–R5.8 as *persona states the value, skill states the procedure*, not as
> *inline the mechanics in the persona*.)

- **R5.1 [MUST] — The existing test-writing charter is deleted outright.** The
  persona's sentence stating the builder writes tests is **removed**, not merely
  left unmentioned — leaving it in keeps the residual authorship path this design
  closes. The builder writes only implementation, authors or alters no test, and
  mints no test scope. (PRD R2/R5, G2; design I5.)
- **R5.2 [MUST] — Resolves hop-3 of the metadata chain via bead metadata only.**
  To find its focused done-target it reads its own bead's `test-beads` reference,
  queries those test beads' `run-selectors`, and runs exactly those — **through
  bead metadata only, never by reading test source** (so it works under the
  deferred read-deny). (PRD R7 hop 3; design I5.)
- **R5.3 [MUST] — Runs only its focused target, not the full suite.** Per-bead
  done-check runs only the focused test target and iterates red → green; it does
  not run the whole suite. (PRD R8; design I5, R8 section.)
- **R5.4 [MUST] — Red is normal; escalate only when genuinely stuck.** A focused
  test going red is the normal build step; the builder iterates. It escalates
  **only** when the failure output shows the test is wrong or impossible to
  satisfy — never merely unmet — and when it does, it **never** modifies the
  test, forces it green, or closes the work silently. (PRD R13, G7; design I5,
  Region 3.)
- **R5.5 [MUST] — The escape hatch, both modes, with the mandatory `x`-reset.** On
  a genuinely-stuck test it classifies Mode 1 vs Mode 2 (by run output matched
  against this epic's `z`-bead run-selectors, never by reading test source), files
  `w₁` (Mode 1 → test-planner) or `w₂` (Mode 2 → PM), wires it to block its own
  bead `x`, **and — mandatory, as part of filing the escalation — resets its own
  bead to the ready queue (`bd update <x> --status open --assignee ""`).** Without
  the reset, the pre-claimed `x` stays `in_progress`, never re-enters `bd ready`
  after the summons closes, and the epic wedges. The reset **matches the recovery
  reset (R7.6)** — `--status open` is what `bd ready` keys on; clearing the stale
  assignee (`--assignee ""`) keeps a reset-but-still-assigned bead from
  re-importing a milder cousin of the wedge, and is a precondition the build
  re-confirms (that an `open`, unassigned bead re-enters `bd ready` and is
  claimable). (PRD R13/R17; design I5, Region 3.)
- **R5.6 [MUST] — The escape hatch is stated as the R17 contract, not a one-off.**
  The file-`w`-and-reset-`x` procedure is presented as the "reopened-and-blocked"
  branch of the dispatch-lifecycle contract (R4.3's rule) for a pre-claimed bead
  — return the bead closed or reopened-and-blocked, never `in_progress`, never
  reopened-unblocked, in a single turn — so the reset reads as one instance of a
  universal rule. (PRD R17; design I5.)
- **R5.7 [MUST] — Recovery-aware clause (R18).** If dispatched onto a bead
  carrying a reclamation comment, it first checks whether the implementation is
  already complete and closes if so; otherwise it picks up the partial work and
  continues to a clean terminal state. (PRD R18; design I5.)
- **R5.8 [MUST] — Dispatch-lifecycle contract (R17): kernel in persona.** The
  builder persona carries the R17 **kernel** as a value in the builder's own voice:
  *a dispatch is a single turn; you return the bead closed, or reopened and blocked
  by a new bead — never `in_progress`, never reopened-unblocked.* This is
  unconditional builder identity (true of every dispatched bead, not only the
  escape-hatch case), and the builder is the agent most likely to strand a bead
  `in_progress` because it claims-then-implements — so the kernel belongs in the
  persona, mirroring R4.3 (tester) and R10.6 (PM). R5.6 governs how the escape-hatch
  *procedure* (skill) frames itself as the reopened-and-blocked branch of this same
  contract; R5.8 is the persona-resident kernel that procedure is one instance of.
  (The built `omg-builder.md` had carried the kernel **only** in the `omg-builder`
  skill's escape-hatch section; **since corrected** — it is promoted into the
  persona, and the skill's escape-hatch framing remains as the situational
  application.) (PRD R17; design I5, R17 section.)

### I6 — `omg-epics` skill wiring (both trees)

> **Economy note for I6 (state-once within the skill).** R6.2, R6.4, R6.7, and
> R6.8 each mandate a rule (author-`R`-once, label-selects-wiring, the static `P`
> block, the terminal carve-out) that the skill must carry — but each is stated
> **once**, at its most prominent home; the two static blocks (`R` and `P`) carry
> their load-bearing qualifiers **verbatim** (R6.5), and surrounding prose **points
> at** the blocks rather than re-narrating their contents. The per-rule AC-I6
> checklist verifies each rule is *present*, not that it is *repeated*; a skill that
> restates the carve-out or the `R`-once rule in three places fails AC-economy.

- **R6.1 [MUST] — The plan-phase sequence is stated as skill instruction.** The
  skill states the canonical order: mint the epic → dispatch test-planner →
  dispatch build-planner → author `R` once → **mint `P`** (`agent=omg-reviewer`,
  wired `bd dep add <P> <R>`) → validate the graph. (PRD R1/R16; design I6, I1.)
- **R6.2 [MUST] — `R` is authored once, from a static canonical block.** The
  wiring states that the orchestrator authors `R` **once, after both planning
  passes**, from a static canonical block the skill owns — no second author, no
  sentinel, no convergence-detection. The v1 "planner rewrites `R`" framing is
  removed. (PRD R10; design I6, Region 2.)
- **R6.3 [MUST] — The full-suite run is a step in the static `R` block, firing at
  the review bead each time the review fires.** The `R` block instructs the
  reviewer to run the **full test suite** at review time (there, each time the
  review fires — never per implementation bead) and file findings on red. (PRD
  R8; design I6, R8 section.)
- **R6.4 [MUST] — The red-suite finding always blocks, and the label selects the
  wiring.** The wiring states that a red-suite finding **always** blocks `R`
  through the ordinary file-and-reopen discipline, and the reviewer's
  change-locality judgment sets the finding's `agent` label — which selects one
  of **two distinct resolution wirings**:
  - **Builder-bound** (fix belongs in this epic): file fix `x` + summons `y`,
    wire `y → x → R` — the full findings loop.
  - **PM-bound** (this epic reddened a prior-epic guarantee — Mode 2): file an
    adjudication bead `m` (`agent=omg-product-manager`) wired **`m` blocks `R`**,
    with **no `y` summons and no fix `x`** (the builder hard rules must not be
    applied to it — there is no fix until the PM decides one is warranted).
  (PRD R15; design I6, I9, Region 3b.)
- **R6.5 [MUST] — The build-time escape-hatch and Mode-2 wiring is stated
  verbatim as mechanics**, carrying the load-bearing qualifiers (paraphrasing
  them away is a build defect):
  - `w₁`/`w₂`/`z′`/`u` are **real** beads (`--parent <epic>`, **no**
    `--ephemeral`), with `discovered-from` links.
  - Every verification and escape-hatch bead (`z`/`z′`/`u`/`y`/`w₁`/`w₂`/`m`)
    carries its `agent` label, so the foreman routes it with **no** special-casing
    — verification work is dispatchable like all other work. (PRD R14.)
  - **Mandatory close** of `w₁` (planner) and `w₂` (PM) in every branch.
  - **Mandatory reset** `bd update <x> --status open` when filing `w₁`/`w₂` over
    a pre-claimed `x`.
  - On the PM's **cannot-decide** branch, a **human gate**
    (`bd gate create --type=human --blocks <w₂>` / `--blocks <m>`) — **not** a
    `human` label (a label alone leaves the bead dispatchable and the foreman
    re-dispatches it endlessly). (PRD R13/R15/R17; design I6, Regions 3/3b.)
- **R6.6 [MUST] — Hop-1 metadata write is stated in the wiring.** The build-planner
  step includes stamping the `test-beads` id(s) onto each implementation bead.
  (PRD R7; design I6.)
- **R6.7 [MUST] — The static `P` body block is authored here as literal, stable
  text.** The skill contains the exact block `P` executes: read the epic's bead
  comments → synthesize the build report → mint the report's `id` → **write the
  report to the docs tree** → **stop** (no ship). (PRD R16, G8; design I6,
  Region 4.)
- **R6.8 [MUST] — The `R`-depends-on-every-child rule carries the terminal
  carve-out.** The wiring states `R` is blocked by every **work** child, and the
  terminal `P` is the exception (`P` depends on `R`) — so the rule is not applied
  to `P`, which would create a cycle. (Design Region 1 carve-out.)
- **R6.9 [MUST] — Same-file `z` beads are serialized, never mutually blocked.**
  Two distinct rules, both stated as **serialization** (one bead blocks the
  other, in a chosen order — **never** a mutual block, which is a cycle
  `bd dep add` would refuse and which would contradict this spec's forward-edge
  invariant):
  - **Findings-loop rule (carried forward from v1):** when two findings' beads
    touch the same files, they are wired in sequence — one blocks the other — so
    they do not surface in one parallel ready wave.
  - **Plan-time inheritance:** the build-planner inherits the decomposer's
    existing same-file discipline for the `z` beads it wires, serializing any two
    `z` beads that touch the same files rather than minting them into one parallel
    ready wave.
  (Design I6, multi_agents guard — "dependency wiring serializes `z` and its `x`".)
- **R6.10 [MUST] — Edit the source tree; mirror to the harness.** `opencode/` is
  the shipped **source of truth**; `.opencode/` is a dogfooding **mirror**. The
  build edits `opencode/` and mirrors the result into `.opencode/` per the repo's
  sync discipline. (The two trees are not co-equal, and this is a tooling
  convention, not a correctness invariant — so "byte-identical" is the *mirror
  target*, not a first-class requirement; the build should not assume a clean
  identical base, since the trees may start divergent.) (Design I6, two-tree rule.)

### I7 — `omg-foreman` skill (both trees)

> **Progressive-disclosure decision for I7 (do not "helpfully" split).** The three
> build modes stay **inline** in the skill body; they are **not** moved to per-mode
> reference files. They total ~23 lines that share one spine (dispatch via the Task
> tool; the mode changes only context-reuse), cross-reference each other, and carry
> a body-resident gotcha (the `multi_agents` file-clobber guard, which the standard
> says keep in the body). Splitting them buys negligible context back while adding a
> fragile load-trigger at the most timing-sensitive moment (first dispatch). A future
> build must not split them under a generic "one reference per variant" reading;
> revisit only if a mode grows past ~40 lines. This overrules the original pilot
> review's progressive-disclosure flag, deliberately.
>
> The skill's non-obvious rationales **survive** the economy pass: retry-count-on-the-
> bead-for-statelessness (R7.7), observe-*that*-not-*why* (R7.8, stated once — the
> failure-mode bullet compresses to a bare reminder), the run-start-vs-drain-time
> distinction (R7.5, stated distinctly but compressed to "the action is identical"),
> and the accepted-residual-risk note. What is cut is the ~4 restatements of "authors
> nothing / ships nothing" (one survives, at the Closing section) and the heavy
> emphasis-bolding.

- **R7.1 [MUST] — Routing invariant untouched; changes confined to looping
  mechanics.** All three changes below live in the skill's build-modes / looping
  mechanics; the label-only, stateless, no-special-case **routing invariant does
  not change**. (PRD G6/R9; design I7.)
- **R7.2 [MUST] — Fresh-context test-writer in `one_agent` mode.** In `one_agent`
  mode the test-writer (`omg-tester`) is spawned in a **fresh context**, as the
  reviewer already is — never reusing the builder's context — so a test and the
  code it verifies are never authored in one accumulating context. The other two
  modes already isolate by default and need no change. (PRD R6; design
  looping-mechanics section.)
- **R7.3 [MUST] — The terminal branch is removed.** The skill's **"Closing the
  epic," "The build report," and "Shipping"** sections are deleted. The foreman
  no longer authors a report or ships anything inline. Replacement: when the
  queue drains to the terminal beads it dispatches them by label like any bead;
  when the queue is genuinely empty the epic is close-eligible and the foreman
  performs only bookkeeping (no authoring, no shipping). (PRD R16, G8; design I7,
  Region 4.)
- **R7.4 [MUST] — Run-start orphan scan.** On a fresh `/omg-build`, **before
  dispatching anything this run**, the foreman lists the epic's `in_progress`
  children (`bd list --parent <epic> --status in_progress --json`). Because it
  has dispatched nothing yet, any hit is **orphaned by definition** — no
  run-state tracking. (PRD R18; design I7, Region 5, detection point 1.)
- **R7.5 [MUST] — Drain-time stranded-bead check, stated distinctly.** When the
  ready queue is empty **but the epic is not close-eligible**, the foreman runs
  the same scan; a hit is a bead this run dispatched, **stranded** by an
  R17-violating return. The skill spells out the run-start-vs-drain-time
  distinction explicitly (it is easy to conflate): the *finding* differs
  (orphan vs. R17-defect worth noting), but the *action is identical* — it is
  **not** a halt and **not** silently reclassified as an orphan. (PRD R18;
  design I7, Region 5, detection point 2.)
- **R7.6 [MUST] — The one recovery path.** For either detection point the foreman:
  (a) **comments the reclamation** on the bead (audit trail + signal to the
  replacement); (b) **resets** it (`bd update <id> --status open --assignee ""`);
  (c) **re-dispatches fresh by its existing label** (no new routing logic —
  reuses label-dispatch), instructing the fresh agent to verify-done-then-
  continue-or-fail-cleanly (R4.4/R5.7). (PRD R18; design I7, recovery path.)
- **R7.7 [MUST] — Bounded escalation: one automatic retry, counted via a
  parseable reclamation-comment marker.** Recovery gives a reclaimed bead
  **exactly one** automatic re-dispatch. The count is **carried on the bead, not
  in the foreman**, so a stateless foreman enforces the bound. **The carrier is a
  parseable reclamation comment bearing a recognizable marker** (e.g. a fixed
  `RECLAIMED:` prefix the recovery step writes and the scan reads) — chosen over a
  metadata field or a dedicated label because a visible comment doubles as the
  audit trail and the replacement-agent signal R7.6 already requires, so one
  artifact serves both the bound and the audit. The foreman's recovery step reads
  the bead's comments: encountering an `in_progress` bead that **already carries**
  the reclamation marker, it does **not** re-dispatch — it **human-gates** the
  bead (`bd gate create --type=human --blocks <id>`), the same gate primitive R15
  uses. No third iteration. **The build MUST empirically confirm** (per the `bd`
  caveat) that a comment written at reclamation is readable back on the next run's
  scan of that bead. (PRD R18; design I7/OQ-H, Region 5(c).)
- **R7.8 [MUST] — Recovery reasons only about *that* a bead is `in_progress`,
  never *why*.** The skill states the foreman must not reason about which worker,
  which run, or which cause left a bead `in_progress` — only observe the status
  at a detection point and recover. Reasoning about *why* is the routing-
  intelligence smell and is a build defect. (PRD G6/R9; design I7,
  looping-mechanics-not-routing.)
- **R7.9 [MUST] — Edit the source tree; mirror to the harness.** As R6.10. (Design
  I7, two-tree rule.)

### I8 — `omg-foreman` agent persona

> **Economy rule for I8 (the pilot; do not violate).** `omg-foreman.md` is the
> AC-economy exemplar: the "authors nothing / ships nothing / the report is a
> dispatched bead" invariant currently appears **eight-plus times** across the
> description, opening, "How you think," "What you refuse" (twice), "How you work,"
> and "Boundaries." It is stated **once**, at its most prominent home (the opening),
> and every other copy is cut. Two concept-leaks are struck: the *"if you catch
> yourself writing code / reviewing a diff"* litany (the foreman's normal path never
> reaches a code editor — compress to the positive "you dispatch, you don't build")
> and the *"shipping to durable memory / left the automated flow"* explanations
> (the foreman has no ship path; that boundary's home is the skill's Closing section
> and the Preconditions, not the persona). The "How you think" section's re-narration
> of the skill's dispatch loop and recovery procedure is cut to its unconditional
> kernels (route-by-label; trust-the-graph; durable-truth-is-the-bead-comment;
> observe-*that*-not-*why*). **Keep-rules hold:** the do-not-shortcut-dispatch-because-
> it-looked-small refusal is a real observed temptation and **survives** (once); the
> observe-that-not-why rationale **survives**. Requirement text below is
> value-shaped and traced in several ACs — the persona still carries a **single**
> copy of each rule, not one per trace.

- **R8.1 [MUST] — The persona sheds all report/ship narration, stated once.** Any
  persona text saying the foreman writes the build report or ships to memory is
  **removed**; the invariant it protects (the foreman dispatches, full stop — it
  holds no terminal state and no authoring/shipping role) is stated **once**, at its
  most prominent home, not restated across sections. The requirement is traced in
  several ACs (AC-I14, AC-no-auto-ship), but that is spec bookkeeping — the persona
  carries a single copy. (PRD R16, G8; design I8.)
- **R8.2 [MUST] — Routing description unchanged.** The persona's description of
  label-only, stateless dispatch is not altered except to remove the terminal
  narration. (PRD G6/R9.)

### I9 — `omg-review` skill (both trees)

> **Instrument-shape rule for I9 (who/how/ask; do not violate).** The reviewer
> **persona** (`omg-reviewer.md`) carries the **unconditional kernel** — the
> find-and-file identity, the *blind-to-test-mode* anti-value, the *writes the
> report and ships nothing* boundary, and the **R17 kernel in the persona** (in the
> reviewer's own voice, mirroring the tester/builder/PM — R9.3). The reviewer's own
> **decision** — change-locality → `agent` label → which of two wirings, and
> label-and-block — lives in the **`omg-review` skill**; but the **`bd` finding
> wiring itself** (builder-bound `x`+`y` vs PM-bound `m`, the `--parent`/
> `--no-inherit-labels`/`no --ephemeral`/`bd dep add` flags) has **one owner —
> `omg-epics` §Verification wiring** (the same single-owner ruling the Non-Goals make
> for the PM's Mode-2 wiring, shared across reviewer/PM/foreman) — so the skill
> **points at** `omg-epics` for the flags rather than restating them, and the static
> `P` body likewise lives once. **The `bd` wiring MUST NOT be authored into the
> reviewer persona, nor restated in the `omg-review` skill.** (The built
> `omg-reviewer.md` modeled the *no-`bd`-in-persona* split correctly, and **two gaps
> have since been closed:** the R17 kernel is now promoted into the persona (it had
> been present only in the skill — R9.3), and the `omg-review` skill's inlined
> finding-wiring `bd` flags are demoted to a pointer at `omg-epics`, which owns them
> verbatim (R9.1). The reviewer *labels-and-blocks*; it carries neither subgraph's
> `bd` mechanics. These rules now stand as regression guards.)

- **R9.1 [MUST] — The R15 red-suite finding wiring: the reviewer's decision in the
  skill, the `bd` flags in `omg-epics`, reviewer stays blind.** The skill states the
  reviewer's **decision and boundary**: executing `R`, it runs the full suite (R6.3)
  and on red files a finding that **always blocks** `R`; its change-locality judgment
  sets the `agent` label, which selects the wiring (R6.4) — builder-bound → fix `x` +
  summons `y` (`y → x → R`); PM-bound → adjudication `m` (`m` blocks `R`), no `y`, no
  `x` — and it also carries the out-of-scope carve-out (a genuinely-unrelated finding
  is filed standalone with a `discovered-from` link and no `R` dependency). The
  **exact `bd` flags** (`--parent`, `--no-inherit-labels`, `no --ephemeral`, the
  `bd dep add` edges) are **not restated in the `omg-review` skill** — they have one
  owner, `omg-epics` §Verification wiring (verified present verbatim), which the skill
  **points at**; restating them is the single-owner-drift defect the Non-Goals forbid.
  The reviewer labels-and-blocks; it builds neither subgraph beyond filing-and-wiring
  the finding, and it learns **no** test-awareness — its judgment stays blind to test
  mode. (PRD R11/R15, G4; design I9.)
- **R9.2 [MUST] — The reviewer handles the terminal `P` bead.** The skill states
  the reviewer also executes the `P` bead — a **different** bead from `R` —
  running its static body to write the build report and **stop** (no ship). This
  realizes the memory-lifecycle-ADR §5 "review agent synthesizes the
  build-record" role as a dispatched bead. (PRD R16, G8; design I9, Region 4.)
- **R9.3 [MUST] — Dispatch-lifecycle contract (R17): kernel in persona, binding in
  skill.** The reviewer **persona** carries the R17 **kernel** as a value in the
  reviewer's own voice: *a dispatch is a single turn; you return the bead closed, or
  reopened and blocked by a new bead — never `in_progress`, never reopened-unblocked.*
  This mirrors the tester (R4.3), builder (R5.8), and PM (R10.6) — the reviewer
  strands `R`/`P` by the same claim-then-work mechanism, so the kernel belongs in the
  persona. The `R`/`P`-specific **binding** (which state applies when findings are
  filed) lives in the **`omg-review` skill**. (The built `omg-reviewer.md` had carried
  the R17 contract **only** in the skill; **since corrected** — the kernel is
  promoted into the persona.) (PRD R17; design I9.)
- **R9.4 [MUST] — Edit the source tree; mirror to the harness.** As R6.10. (Design
  I9, two-tree rule.)

### I10 — `omg-product-manager` agent (Mode-2 adjudicator)

> **Instrument-shape rule for I10 (who/how/ask; do not violate).** The PM
> **persona** carries only the **unconditional kernel** — the standing product
> disposition true in *every* PM conversation. The **conditional Mode-2 wiring**
> (topology-specific `bd` create/dep/gate/close flags for `w₂`/`m`/`x_m`/`y_m`/`u`)
> is **procedure**, and it already lives — verbatim — in the `omg-epics`
> **Verification wiring** section, which the PM loads. **The build MUST NOT restate
> those mechanics in the persona; it leaves a pointer instead.** Duplicating
> conditional procedure into an agent loaded on every turn is the misfile this
> requirement exists to prevent (a `permission.skill` deny or a Test-1a check would
> flag it): the mechanics have exactly one owner (`omg-epics`), so a load-bearing
> qualifier is corrected in one place, not two. **No new `pm-adjudication` skill is
> created** — `omg-epics` is the single wiring-owner (see the decision recorded in
> *Non-Goals*). (The built `omg-product-manager.md` already models this correctly —
> kernel + pointer, with no `w₂`/`m`/`x_m`/`y_m` wiring inline; this rule now stands
> as a regression guard, not a pending deletion. The PM's R18 recovery clause
> (R10.7) — which belongs in `omg-epics`, not the persona — had been missing from
> `omg-epics` §Mode-2; it **has since been authored there**, so R10.7 is now met.)

- **R10.1 [MUST] — Persona kernel: product intent is the PM's to defend, even
  after the fact.** The persona states, as an unconditional value: the PM is the
  authority on *why* something was built and that authority does not expire when
  the code ships; when a change collides with an earlier decision's guarantee
  ("was that behavior still supposed to hold?"), that is a product judgment and is
  the PM's to make — not a build defect for someone else to patch around. **No
  topology, no bead names, no `bd` flags in the persona.** (PRD R13/R15; design
  I10.)
- **R10.2 [MUST] — Mechanics stay in `omg-epics`; the persona points, it does not
  restate.** The build-time (`w₂` blocking an open `x`) and review-time (`m`
  blocking `R`, no open `x`) resolution wirings — kick-back, test-update, the
  PM-minted `x_m`+`y_m` summons, the mandatory closes — are **not** authored into
  the persona. They are the `omg-epics` Verification wiring section's content
  (already present verbatim). The persona carries a single **pointer**: when a
  ruling must reshape the graph, the PM shapes it through `bd` and reaches for the
  `omg-epics` verification-wiring section for the exact topology rather than
  improvising. **Verified by the persona's *absence* of the `w₂`/`m`/`x_m`/`y_m`
  wiring, not its presence.** (PRD R13/R15; design I10, Regions 3/3b; `omg-epics`
  §Verification wiring — owner.)
- **R10.3 [MUST] — Human gate, not a label: kernel is the pause-cleanly value; the
  command lives in `omg-epics`.** The persona may carry the **value** that a
  genuine product decision the PM cannot make is a clean pause for a human, not a
  guess it forces. The **mechanic** — `bd gate create --type=human --blocks
  <w₂>`/`--blocks <m>`, and *why a `human` label alone re-dispatches forever* —
  is `omg-epics` §"Human gate, not human label" and is **not** restated in the
  persona. (PRD R15; design I10; `omg-epics`.)
- **R10.4 [MUST] — Persona kernel: rulings are recorded durably and never
  auto-shipped to memory.** The persona states, as an unconditional value: the PM
  records every ruling where the work can see it (on the bead), never only inside
  its own context; and a ruling reaches durable memory **only** when a human
  deliberately invokes the docs→Hindsight sync command — never as a side effect of
  deciding. The specific "the `P` bead folds the comments into the report"
  *mechanic* is `omg-epics`/the static `P` block, not persona text. (PRD R13/R16,
  G8; design I10.)
- **R10.5 [MUST] — Persona kernel: never rule on intent from memory alone.** The
  persona states, as an unconditional value, that the PM consults Hindsight for
  *why* a prior guarantee exists before ruling on whether it still should —
  because the record of past intent is what distinguishes load-bearing from stale.
  (PRD R13; design I10.)
- **R10.6 [MUST] — Dispatch-lifecycle contract (R17): the unconditional kernel is
  persona, the `w₂`/`m` binding is skill.** The persona carries the R17 **kernel**
  as a value in the PM's own voice: *a dispatch is a single turn; you return the
  bead closed, or held by a human gate (the PM's one bounded exception) — never
  `in_progress`, never reopened-unblocked.* The `w₂`/`m`-specific application and
  the reopened-and-blocked mechanics live with the wiring in `omg-epics`. (PRD
  R17; design I10, R17 section.)
- **R10.7 [MUST — skill, not persona] — Recovery-aware clause (R18).** The R18
  behavior ("if dispatched onto a `w₂`/`m` bead carrying a reclamation comment,
  check whether the adjudication was already recorded before re-adjudicating") is
  **wholly conditional** — gated on a rare recovery situation — so it has **no
  persona kernel** and is authored in the PM's Mode-2 procedure in `omg-epics`,
  **not** in the persona. Placing it in the persona is a build defect of the same
  kind I10 corrects. **Status: this clause had been missing from `omg-epics` §Mode-2
  (and correctly absent from the persona); it has since been authored there**,
  modeled on the `omg-builder` skill's "Recovery: picking up a reclaimed bead"
  section: check whether the ruling was already recorded (the comment on `x`/`m`, or
  the `x_m`/`u` beads already minted) and close without re-adjudicating or
  double-minting; otherwise resume to a clean terminal state (closed, or held by a
  human gate). (PRD R18; design I10.)

### I11 — `omg-reviewer` agent (able to write the report)

- **R11.1 [MUST] — Able to write the build report into the docs tree.** The
  reviewer, executing the terminal `P` bead (R9.2), must be able to write the
  build report to the docs tree. The reviewer is `edit: deny` today, so this
  build must grant it a write capability sufficient to author the report.
  **This build does not specify the exact grant shape** — whether a docs-tree-
  scoped frontmatter glob, a satellite `external_directory` reach, or both by
  mode. Scoping that grant (so the reviewer cannot overwrite the Markdown product
  it must stay blind to) is **deferred** to the permissions effort — see the
  Non-Goal on permission frontmatter and the Deferred item. For this build a
  broad-but-working grant is acceptable; the *tightening* is the deferred work.
  (PRD R16, OQ-F; design I11.)

### I12 — `/omg-decompose` command

- **R12.1 [MUST] — The ask covers the full plan phase.** The command routes the
  decomposer over the epic and points at the `omg-epics` plan-phase sequence, so
  verification planning and the terminal-bead mint happen as a standard part of
  decomposition — no test-planning flag, no config key. (PRD R12, G3; design I12.)

### I13 — `/omg-test-plan` command (retired)

- **R13.1 [MUST] — Removed outright.** The v1 operator-invoked `/omg-test-plan`
  command file is deleted. A standing invocation surface is exactly the
  optionality the PRD removes; keeping it would let an operator re-import the
  opt-in model out of band. Its removal is a deliberate scope decision. (PRD
  R12, Non-Goals; design I13, OQ-C.)

### I14 — docs→Hindsight sync command (boundary only)

- **R14.1 [MUST] — This spec defines only the boundary and the removal.** Shipping
  to Hindsight (both the epic bead and the build report) leaves the automated
  flow entirely and is rehomed to a separate, deliberately-invoked command. This
  spec **names that boundary**; it does not specify the command's behavior. (PRD
  R16, G8; design I14.)
- **R14.2 [MUST — do not build here] — The command's behavior is deferred.** Its
  ship ordering (epic before report), its ergonomics, and the superseded-doc
  handling are a separate effort, reconciled against
  `adr.platform.memory-lifecycle.0001`. Building any of it under this spec is out
  of scope. (PRD Deferred; design I14.)

### I15 — `/omg-build` command (the foreman's ask, de-shipped)

- **R15.1 [MUST] — The ask drives drain-and-close only; report-synthesis and ship
  steps are removed.** The `/omg-build` command is the foreman's ask, and it must
  match the terminal-branch removal (R7.3) and the no-auto-ship boundary (R14.1).
  Its body **must not** instruct the foreman to synthesize the build report or ship
  to Hindsight — the report is the dispatched `P` bead's job (surfacing on the queue
  by label), and shipping left the automated flow. The command drives the
  `omg-foreman` skill to loop the ready queue, dispatch the terminal beads by label
  like any other, and close the epic when close-eligible. Its frontmatter
  `description` and body framing (e.g. "all the way to shipped memory") are
  corrected to end at close, not ship. **The build-mode resolution block and the
  `then:` chain are preserved.** (PRD R16, G8; design I7, Region 4; R7.3/R14.1.)
  - *(Why this is a distinct row, not covered by I7/I8:* the spec removed the
    terminal branch from the foreman **skill** and **persona** but left the two
    commands that *drive* the foreman still ordering it. Without this row, the
    build's own scoping fence — "scoped to the instruments this build already edits"
    — would forbid the fix as scope-creep, and the terminal branch would survive in
    the one place a user actually invokes. The built `omg-build.md` had contradicted
    the feature ("close it, then write the build report and ship to Hindsight"); it
    **has since been corrected** to drive drain-and-close only.)*

### I16 — `/omg-ensure-work-finished` command (the `then:` follow-up, de-shipped)

- **R16.1 [MUST] — The follow-up verifies drain / terminal-dispatch / close only.**
  The `then:`-chain target must be corrected in the same build as I15, or the
  terminal branch re-enters through the follow-up. It checks: epic not fully drained
  → resume the dispatch loop; the terminal `P` bead not yet dispatched/closed → it
  is a ready bead dispatched by label (**never** "write the report yourself"); epic
  close-eligible but not closed → close it. **Every** "shipped to Hindsight," "write
  the report from the child bead comments," and "shipping order" clause is removed,
  and the dangling reference to the `omg-foreman` skill's (deleted) closeout/shipping
  sections is dropped. (PRD R16, G8; design I7, Region 4; R7.3/R14.1. The built
  `omg-ensure-work-finished.md` had mandated the foreman author the report and ship —
  the same contradiction as I15, and it is the chain target I15 preserves; it **has
  since been corrected** in the same pass.)

## Inputs and Outputs

### `/omg-decompose <spec-or-epic>` (plan phase)

- **Input:** the spec/epic to decompose.
- **Output (side effects on the beads graph):** test beads (`z`) and recorded
  no-test decisions (test-planner); implementation beads with hop-1 `test-beads`
  refs and `z blocks impl` edges (build-planner); the review bead `R` authored
  once from the static block; the terminal bead `P` minted and wired `P` depends
  on `R`; a validated DAG. **No** `/omg-test-plan` invocation, **no** planner
  rewrite of `R`.

### `/omg-build <epic>` (build phase)

- **Input:** an epic id.
- **Output:** each bead dispatched by label to a fresh-or-reused context per the
  build mode (test-writer always fresh in `one_agent`); focused done-checks by
  the builder; the full suite run at `R`; findings filed and looped to green;
  the report written by `P`; nothing shipped. On resume of an interrupted epic:
  orphaned `in_progress` beads reclaimed, re-dispatched once, and either
  completed or human-gated.

### The test-write metadata hop (internal contract)

- **Input:** a `z`/`z′`/`u` bead and the authored test.
- **Output:** the concrete run-selector stamped onto the bead (hop 2), and the
  bead left closed or reopened-and-blocked (R17).

### The escape-hatch cycle (internal contract)

- **Input:** a builder genuinely stuck on a focused test.
- **Output:** `w₁` (Mode 1) or `w₂` (Mode 2) filed and wired to block `x`; `x`
  reset to `open`; on the summons agent's dispatch, an uphold/re-plan/adjudicate
  outcome and the summons closed (or human-gated).

## Preconditions and Assumptions

- **The epic is decomposed by the new plan phase.** Every epic carries planned
  verification, a single-author `R`, and a terminal `P` — the build phase relies
  on this shape.
- **The bead body is the universal work order.** Every worker fetches its own
  bead (`bd show <id>`) and executes it; the foreman passes only the id. Recovery
  relies on the reclamation comment being visible to the fresh worker via this
  contract.
- **`bd ready` excludes `in_progress` beads**, and `bd update <id> --status open`
  returns a bead to `bd ready` once unblocked; `bd gate create --type=human
  --blocks <id>` hides a bead from `bd ready` until resolved; `bd list --parent
  <epic> --status in_progress --json` returns exactly the epic's `in_progress`
  children. These were verified on `bd version 1.0.5`. **The build MUST
  re-confirm each on the target `bd` version before relying on it** (per the
  repo's standing caveat that `bd --help` is not authoritative). (Design
  empirical-verification note.)
- **Sync discipline is plugin-owned.** Per `adr.platform.beads-sync-ownership.0001`
  the `BeadsPlugin` owns how beads state is persisted; no instrument built here
  reads or branches on the dolt mode for sync, and the feature is mode-agnostic.
- **Two skill trees exist** for `omg-epics`, `omg-foreman`, and `omg-review`:
  `opencode/skills/` is the shipped **source**, `.opencode/skills/` the dogfooding
  **mirror**. The build edits the source and mirrors to the harness; the trees may
  start divergent, so the build reconciles rather than assuming an identical base.
- **The `test-writing` skill is owned by the tester alone**, delivered by the
  builder's persona not referencing or loading it (a behavioral fact; not enforced
  by a `skill:` permission in this build — see the permission-frontmatter
  Non-Goal). The implementer has no use for a test-writing skill.

## Error and Edge Behavior

- **A worker returns its bead `in_progress` (R17 violation).** Caught at drain
  time (R7.5): the queue reads empty-but-not-close-eligible, the foreman scans,
  finds the strand, and routes it through the one recovery path — not a halt.
- **A worker crashes mid-bead.** Caught at the next fresh `/omg-build`'s run-start
  scan (R7.4): the `in_progress` orphan is reclaimed and re-dispatched.
- **A reclaimed bead's fresh agent also crashes/violates.** Bounded (R7.7): no
  third dispatch — the foreman human-gates the bead. Recovery cannot spin.
- **Chained failure: partial work left AND the replacement fails to notice it.**
  A **named, accepted residual risk** — the reclamation comment mitigates it
  (tells the replacement to look) and makes it auditable, but it is not
  eliminated. It is stated as a known cost, not claimed away. (PRD R18 residual
  risk; design accepted-residual-risk note.)
- **A summons/escape/adjudication bead is left open (not closed).** Guarded by
  the mandatory-close discipline stated in both the handling agent and the
  `omg-epics` wiring for `y`, `w₁`, `w₂`, `m`, `y_m`.
- **A pre-claimed escape-hatch `x` left `in_progress` after escalation.** Guarded
  by the mandatory `x`-reset (R5.5), stated in both the builder and the
  `omg-epics` wiring. Observable symptom: an `in_progress` bead with no live
  worker and no blockers, invisible to `bd ready`.
- **A human-gated epic mistaken for finished.** Distinguished by
  close-eligibility: a done epic is close-eligible with all children closed; a
  gated epic is not close-eligible and has an open gate. Surfacing a pending gate
  prominently is an operability need (OQ, below), not a correctness failure.
- **A red review-suite on a PM-bound finding while the PM cannot decide.** The
  epic pauses on a human gate on `m`; `R`/`P` stay blocked; nothing ships.
- **A PM-minted review-time fix.** Goes through verification planning like any
  fix (`y_m`); it is not exempt. (R10.2.)
- **A broken or malformed R7 metadata chain, or a Mode-1/Mode-2 mis-classification
  from run-selector matching (OQ-2).** Both **degrade to "caught at the review-bead
  full-suite run" (R6.3/R8), never to a wedge or a shipped-broken result.** This
  degradation is a **required safety property**, not incidental: it is what makes
  the unenforced R7 chain and the imperfect run-selector matching safe — a missing
  `test-beads` stamp, a missing `run-selector`, or a failure mis-bucketed as
  Mode 1 vs Mode 2 costs *promptness* (the focused fast-path is skipped), not
  correctness (the full-suite run at `R` still catches it). The build must
  preserve this fall-through. (Design OQ-A/OQ-B, R8 section.)
- **Cycle introduction.** Impossible by construction — every edge added anywhere
  is a forward blocks-edge; `bd dep add` runs cycle detection and `bd swarm
  validate <epic>` confirms acyclicity, including the `P` terminal carve-out.
- **No behavior warrants a test.** A valid outcome: zero `z` beads, all decisions
  recorded as no-test. This is success, not a failure to plan.

## Non-Goals

Inherited from the PRD and design; the build must not quietly reintroduce any:

- **No change to the foreman's routing** (label-only, stateless, no special-case).
  I7/I8 touch only looping mechanics; a routing change is a build defect.
- **No second build-time orchestrator.** The plan-time orchestrator operates in
  the plan phase only.
- **No test-writing skill for the implementer**, and no residual builder
  test-authorship path (R5.1 deletes the charter).
- **No test taxonomy, type enum, risk/cost scoring rubric, or
  ephemeral/checkpoint bead class.**
- **No per-repo onboarding-configured "test run command"** — the agent infers the
  runner from tooling; only the deferred read-deny needs onboarding.
- **No per-bead full-suite runs** — the builder runs only its focused target.
- **No automatic shipping to Hindsight**, no coverage thresholds, no CI/merge
  gating.
- **No `ship_at: close | merge` mode, no session-id-claimant orphan detection, no
  test-dir read-deny build, no formula/molecule extraction** — all named-deferred
  in the PRD.
- **No specification of agents' `permission` frontmatter (the `task:` / `skill:` /
  `bash` / `edit` grant matrix).** This build shapes behavior through persona and
  skill-load *instructions* and delivers the feature through *capability* (an
  agent can dispatch, write, or read what it needs). It does **not** specify the
  `permission` blocks that would *scope* those capabilities. **Deferred, and the
  driver is efficiency, not security:** in opencode an agent's context is
  populated by default and a `permission` deny is what *removes* a skill or a
  dispatch target from that context, so the grant matrix is the lever that trims
  context-window pollution (unneeded skills/agents an instrument carries). That
  optimization — identifying, per agent, exactly which agents/skills/`bash` scopes
  it needs — is a separate effort deferred so this feature can ship now; the
  short-term cost is a looser, noisier context, an *inefficiency* this build
  accepts, not a correctness or feature gap. A builder must **not** treat the
  absence of `permission` blocks as an oversight to "helpfully" fill.
  - **Capability the correction must preserve (in scope), distinct from scoping
    (deferred).** Demoting an agent's mechanics into a skill only works if the
    agent can **load** that skill. "The PM can load `omg-epics`" (and the tester
    `test-writing`/`omg-commands`, the builder `omg-builder`, the reviewer
    `omg-review`) is a **capability** — in scope, and satisfied under opencode's
    default-allow whenever the agent has no `skill:` deny-list removing it. The
    build must **not** author a `permission.skill` allow-list to deliver it. **Hard
    constraint handed to the deferred permissions effort:** when that effort
    eventually scopes each agent's `skill:` block, it **MUST** include the skill
    that carries the agent's demoted mechanics — for the PM, `omg-epics` **must be
    in the allow-list**. Omitting it would silently sever the agent from its own
    procedure and re-wedge the workflow the moment the block lands. (Design OQ-F
    permission-scoping; I10 D-note.)
- **No new `pm-adjudication` (or per-agent adjudication) skill is created.** The
  Mode-2 verification wiring is dependency-graph mechanics shared across the
  reviewer (files `m`/`x`+`y`), the PM (resolves them), and the foreman (dispatches
  by label); it has **one** owner — `omg-epics` §Verification wiring — so a single
  verbatim source stays authoritative and cannot drift edge-for-edge across two
  files. Splitting it out to trim the PM's context is the *deferred* permissions
  optimization done in the wrong instrument; a later build must **not** "helpfully"
  mint a PM-only wiring skill. (I10 decision; design constraint 4.)
- **No conditional procedure baked into any agent persona (the who/how/ask
  split).** An agent file is loaded into *every* conversation that agent has, so
  it carries only **unconditional** content — identity, values, anti-values true in
  every situation. **Situational procedure** — `bd` flag sequences, bead-wiring
  topologies, escalation/recovery step-lists gated on a particular workflow moment
  — is **how-to** and belongs in that workflow's **skill**, with the persona
  carrying at most the unconditional *kernel* of the value plus a **pointer** to
  the skill. Restating conditional mechanics in a persona (as an
  earlier draft of `omg-tester.md` did and an earlier `omg-product-manager.md` did,
  both since corrected) is a **build defect**, not a helpful redundancy. (This is
  the misfile the whole I4/I10 correction addresses; see the per-instrument shape
  rules on I4, I5, I9, I10, and design constraint 4.)
- **No dolt-sync / dolt-mode disclaimer in any bead-mutating agent persona.** A
  persona paragraph telling an agent it "never names a `bd dolt commit/push/pull`"
  and "never reads or branches on the dolt mode" is **concept-leak** — it imports
  the sync verbs, the dolt mode, and the embedded/server distinction only to forbid
  them, on an agent whose entire path is `bd create`/`bd dep add`/metadata stamps
  and never reaches sync. Mode-agnosticism is true **by construction** (the agent
  never touches sync), enforced by the *absence* of sync commands from the runbooks
  it loads — not by a persona sentence. Its one legitimate home is
  `adr.platform.beads-sync-ownership.0001` plus this spec's Preconditions; a persona
  must not restate it. (This disclaimer currently appears verbatim in
  `omg-build-planner.md` and `omg-test-planner.md`; the build strikes it from those
  two — which this build already edits — as part of the economy pass. An agent that
  *operationally reports* the mode, like the onboarder, is not affected; that is an
  earned operational mention, not a forbid-only disclaimer. Other agents carrying
  the same disclaimer but not otherwise touched by this build are swept by the
  separate follow-up economy effort, not here.)
- This spec does **not** re-specify the termination proof, the alternatives, or
  the mechanism's correctness argument — those are owned by the design doc.

## Acceptance Criteria

Because the build is opencode instruments (Markdown/config), acceptance is
verified by **reading the instruments and reasoning about the contracts they
encode**, plus structural checks — not by a unit-test suite. Each criterion maps
to requirements.

### Build acceptance (read-the-instrument — gates this build)

- **AC-I1 (orchestrator):** `omg-decomposer.md` drives the fixed plan-phase order
  and absorbs no planning judgment (R1.1/R1.2); is **able** to dispatch the two
  planners as subagents (R1.3) — the *scoping* of that dispatch via `permission`
  frontmatter is **not** a gate for this build (deferred; see the Non-Goal on
  permission frontmatter); and mints `P` wired `bd dep add <P> <R>` (R1.4).
- **AC-I2 (build-planner):** `omg-build-planner.md` exists, read-only on source
  (R2.1); its persona derives completeness from the spec, not the test beads
  (R2.2), mints no test scope (R2.3), wires `z blocks impl` (R2.4), and writes
  the hop-1 `test-beads` ref onto each implementation bead (R2.5).
- **AC-I3 (test-planner):** `omg-test-planner.md` is confidence-first with the
  minimal vocabulary and no taxonomy (R3.1/R3.2); mints test beads in the plan
  pass (R3.3); carries the `y` and `w₁` mandatory-close authorities (R3.4/R3.5);
  and the v1 review-bead-rewrite + convergence-survey machinery is **gone**
  (R3.6) — verified by its absence.
- **AC-I4 (tester):** the **who/how split holds** — `omg-tester.md` carries the
  sole-test-author identity (R4.1) and the R17 **kernel** sentence (R4.3), and the
  **`test-writing` skill** carries the mechanics: the Case-A/Case-B write behavior
  (R4.1), the hop-2 run-selector write for `z`/`z′`/`u` (R4.2, `bd` form via
  `omg-commands`), the R17 reopened-and-blocked steps (R4.3), and the R18
  recovery-aware procedure (R4.4). **Verified two ways:** the identity/kernel is
  present in the persona, **and** the `bd`-flag mechanics (`--set-metadata
  run_selector=…`, the file-and-block step-list, the reclamation-check) are
  **absent** from the persona and **present** in the skill. A persona that still
  inlines those mechanics **fails** this AC.
- **AC-I5 (builder):** `omg-builder.md` / skill has the "and write tests"
  sentence **deleted** (R5.1) — verified by grep returning nothing; resolves the
  hop-3 done-target via metadata only (R5.2); runs only the focused target
  (R5.3); treats red as normal and escalates only when stuck, never editing the
  test (R5.4); carries the two-mode escape hatch **with the mandatory `x`-reset**
  (R5.5) framed as the R17 contract (R5.6); carries the **R17 kernel sentence in the
  persona** in the builder's own voice (R5.8) — verified present in the persona, not
  only in the skill; and the R18 recovery-aware clause (R5.7).
- **AC-I6 (epics wiring):** both `omg-epics` trees carry the plan-phase sequence
  (R6.1), the author-`R`-once-from-static-block rule (R6.2), the full-suite step
  in the `R` block (R6.3), the always-blocks + label-selects-wiring rule with
  both distinct wirings (R6.4), the escape-hatch/Mode-2 mechanics **verbatim**
  including no-`--ephemeral`, mandatory close, mandatory reset, and the human
  **gate** (not label) (R6.5), the hop-1 write (R6.6), the literal static `P`
  block that writes-and-stops (R6.7), the terminal carve-out on the
  `R`-depends-on-children rule (R6.8), and the same-file `z` sequencing rule
  (R6.9). The edits land in the **source** `opencode/` tree and are **mirrored**
  into `.opencode/` per the sync discipline (R6.10) — the mirror-match is a
  tooling check (`diff … exits 0` *after mirroring*), not a correctness gate on
  the feature.
- **AC-I7 (foreman skill):** both `omg-foreman` trees confine all changes to
  looping mechanics with routing untouched (R7.1); spawn the test-writer fresh in
  `one_agent` (R7.2); have the **"Closing the epic"/"build report"/"Shipping"
  sections removed** (R7.3) — verified by their absence; carry the run-start
  scan (R7.4), the drain-time check **stated distinctly** from it (R7.5), the one
  recovery path (R7.6), the bounded one-retry-carried-on-the-bead-then-gate rule
  (R7.7), and the "observe *that* not *why*" guard (R7.8). Edits in the source
  `opencode/` tree, mirrored into `.opencode/` (R7.9) — mirror-match is a tooling
  check, not a feature gate.
- **AC-reclamation-marker (empirical, gates this build):** the reclamation-marker
  round-trip required by R7.7 is **empirically confirmed on the target `bd`
  version** — a comment written at reclamation is readable back on a subsequent
  scan of that bead — and the result recorded. This is the one recovery-unique
  `bd`-behavior assumption; unlike the runtime feature-acceptance below, this
  check *does* gate the build, because the bounded-retry guarantee rests on it.
- **AC-I8 (foreman persona):** `omg-foreman.md` has all report/ship narration
  **removed** (R8.1) — verified by grep — and its routing description otherwise
  intact (R8.2).
- **AC-I9 (review + reviewer):** both `omg-review` trees carry the reviewer's
  finding **decision** (change-locality → label → wiring, always-blocks, the
  out-of-scope carve-out) with the reviewer staying test-blind (R9.1), the
  `P`-handling clause that writes-and-stops (R9.2). **The `bd` finding-wiring flags
  are *absent* from the `omg-review` skill** — it points at `omg-epics` §Verification
  wiring for them (R9.1); a skill that restates the `--parent`/`no --ephemeral`/
  `bd dep add` flags fails this AC. The **reviewer persona carries the R17 kernel**
  in its own voice (R9.3) — verified present in the persona, not only in the skill.
  **Test-blindness is verified by reading, not by a word-grep** (the skill
  legitimately mentions the full-suite run per R6.3, so a grep for "test" would
  false-fail): the checkable property is that the reviewer gains **no test-mode
  branching, no awareness of `z` beads, and no behavior conditioned on verification
  state** — it labels-and-blocks by change-locality and otherwise executes its work
  order unchanged. Edits in the source `opencode/` tree, mirrored into `.opencode/`
  (R9.4) — mirror-match is a tooling check, not a feature gate.
- **AC-I10 (PM):** the **who/how split holds** — `omg-product-manager.md` carries
  only the **kernel**: the product-intent-authority value (R10.1), the
  record-durably/never-auto-ship value (R10.4), the Hindsight-consult value
  (R10.5), the R17 **kernel** sentence (R10.6), and a **pointer** to the
  `omg-epics` verification-wiring section (R10.2). The **`omg-epics`** Verification
  wiring section carries the mechanics (already present verbatim): both Mode-2
  topologies including the **PM-minted fix gets `y_m` verification** clause
  (R10.2), the cannot-decide **human gate not label** command (R10.3), and the
  R18 recovery-aware procedure (R10.7). **Verified two ways:** the kernel values +
  the pointer are present in the persona, **and** the `w₂`/`m`/`x_m`/`y_m` `bd`
  wiring, the `bd gate create` command, and the reclamation-check are **absent**
  from the persona. A persona that still restates the Mode-2 wiring **fails** this
  AC. **No `pm-adjudication` skill exists** (the wiring's sole owner is
  `omg-epics`).
- **AC-I11 (reviewer can write the report):** `omg-reviewer.md` gains a write
  capability sufficient for the `P` bead to author the build report into the docs
  tree (R11.1). The *scoping* of that grant is **not** a gate for this build
  (deferred); AC-I11 confirms only that the reviewer can write the report.
- **AC-I12 (decompose command):** `/omg-decompose` routes the full plan phase and
  points at the `omg-epics` sequence; no test-planning flag (R12.1).
- **AC-I13 (test-plan retired):** `opencode/commands/omg-test-plan.md` is
  **deleted** (R13.1) — verified by its absence.
- **AC-I14 (sync boundary):** shipping is **absent** from the automated flow —
  checked at the specific loci where shipping lived or could re-enter, not as a
  vague global negative: (a) the foreman skill's **"Shipping" section is gone**
  (R7.3) and (b) the foreman persona's **ship narration is gone** (R8.1) — the two
  paths that ship today; (c) the `P` block **writes-and-stops** with no ship call
  (R6.7/R9.2); (d) the PM's Mode-2 handling **only records comments**, introducing
  no ship call (R10.4); (e) the **`/omg-build` command and its `then:` target
  (`/omg-ensure-work-finished`) contain no report-synthesis step and no ship call**
  (R15.1/R16.1) — verified by their absence; these are live shipping loci that
  re-enter the removed branch the moment they are invoked. The sync command's
  behavior is not built here (R14.1/R14.2).
- **AC-I15/I16 (foreman commands de-shipped):** `/omg-build` drives drain-and-close
  only, preserving the build-mode resolution and `then:` chain (R15.1);
  `/omg-ensure-work-finished` verifies drain/terminal-dispatch/close only, with
  every ship and write-the-report-yourself clause removed and the dangling
  `omg-foreman`-skill closeout/shipping reference dropped (R16.1). Verified by
  reading both command bodies and their frontmatter descriptions.
- **AC-untouched:** `git diff` after the build changes **no** foreman *routing*
  logic (only looping mechanics), and reintroduces **no** taxonomy, scoring
  rubric, or ephemeral bead class anywhere.
- **AC-economy (judgment read, like AC-I9):** each prose-bearing instrument this
  build touches (I1–I10, I12) passes the `authoring-opencode` **"Write for the
  model"** pass. This is a **reading against a decision procedure**, not a grep:
  for each line, *would removing it cause the agent to make a mistake?* — and no
  invariant is stated more than once, no concept is imported solely to forbid it,
  and no guardrail defends a failure the agent's normal path never reaches. The
  worked exemplar of the defect is the `omg-foreman.md` pilot's eight-plus
  restatements of "authors/ships nothing"; an instrument that reads that way
  **fails** this AC. The read **inherits the standard's keep-rules** — it is not a
  "make it shorter" or "delete the negatives" pass: a one-clause rationale on a
  non-obvious rule, a crisp singular negative, and a tight judgment-carrying
  paragraph all **survive**; stripping a kernel a who/how placement rule requires
  present is itself a defect. Discharged by the same authoring-SME + PM/architect
  read that clears the who/how ACs (AC-I4/AC-I9/AC-I10), run **after** the who/how
  placement is correct. Scoped to touched instruments only; it does not gate an
  economy pass of untouched OMG instruments.

### Feature acceptance (runtime — exercised on first dogfood, not a build gate)

Requires a live epic, which does not exist at build time, so it does **not** gate
oc-smith's instrument build. It confirms the built instruments behave correctly
when first exercised.

- **AC-loop-terminates:** on a constructed test epic with a planned finding,
  `bd swarm validate <epic>` reports no cycles and the close order matches the
  design's traced branches (Regions 1–5), including the terminal `P` and a
  reclaimed orphan.
- **AC-independence:** on a `one_agent`-mode run, the test-writer bead and the
  implementation bead it verifies are authored in **separate contexts** (the
  test-writer is spawned fresh), confirming a test is never authored in the same
  accumulating context as its code.
- **AC-recovery:** re-running `/omg-build` on an epic with an orphaned
  `in_progress` bead reclaims and completes it; a twice-failed bead is
  human-gated, not re-dispatched a third time.
- **AC-gate-pauses-cleanly:** an epic with an open human gate (a PM cannot-decide
  gate on `w₂`/`m`, or a twice-failed recovery gate) is **not** close-eligible, no
  terminal bead fires, and nothing ships — the epic idles rather than appearing
  done — and it **resumes** when the gate is resolved (`bd gate resolve`), the
  gated bead re-entering `bd ready`. (PRD success metric "A human gate pauses
  cleanly"; design Region 3/3b/5 idle-state.)
- **AC-no-auto-ship:** completing an epic writes the build report to the docs
  tree and ships **nothing** to Hindsight; a human running the sync command is
  the only path to canon.

## Open Questions

Build-time items the design left for the spec/build to make precise. None is
load-bearing for termination (the design proves that independently); each affects
how cleanly or promptly a mechanism works.

- **OQ-1 — The reclamation-marker's exact string form.** R7.7 **decides** the
  carrier (a parseable reclamation comment with a recognizable marker) and
  mandates build-time empirical confirmation that it survives across runs — so the
  design's OQ-H hand-off is discharged, not deferred. What remains is the marker's
  exact string form (the literal prefix/format the recovery step writes and the
  scan matches), a cosmetic build detail with no contract consequence. (Design
  OQ-H, now resolved by R7.7.)
- **OQ-2 — Run-selector matching format.** How a runner's failure report string
  is matched against a stored `run-selector` (to classify Mode 1 vs Mode 2) can
  drift across stacks; the exact matching is a build detail. A mismatch degrades
  to "caught at the review-bead full-suite run," not a wedge. (Design OQ-A.)
- **OQ-3 — Requirement→implementation-bead mapping.** Whether spec requirements
  enumerate one-to-one or several fold into one implementation bead — and how the
  build-planner attaches possibly-multiple `test-beads` ids when they fold — is a
  build judgment the planner persona must guide. (Design OQ-B.)
- **OQ-4 — `R`-not-found handling.** Behavior when an epic has no reviewer bead
  (malformed epic): the planner/orchestrator should surface the condition rather
  than silently skip. Low-stakes; the normal path always has an `R`.
- **OQ-5 — The reviewer write-grant shape and the satellite onboarding change —
  deferred, not open for this build.** Scoping the reviewer's write grant (a
  docs-tree frontmatter glob, a satellite `external_directory` reach, or both) is
  part of the deferred permissions effort (see the Non-Goal on permission
  frontmatter), **not** something this build settles. This build grants a working
  write capability; the tightening is deferred. (PRD OQ-F; design I11.)
- **OQ-6 — `/omg-test-plan` retirement + stale-shipping-framing cleanup.** Any
  references to the retired command elsewhere in the instruments/docs must be swept
  (done in the instrument tree and `USAGE.md`). Additionally, "shipped memory" /
  "ship to Hindsight" framing in command bodies and frontmatter descriptions is
  swept as part of I15/I16 (the `/omg-build` and `/omg-ensure-work-finished`
  corrections). (Design OQ-C.)
- **OQ-7 — The sync command's name and behavior.** Deferred to its own effort,
  reconciled against `adr.platform.memory-lifecycle.0001`. (PRD OQ-G; design I14.)

## Related Documents

- `prd.platform.test-planning.0002` — the PRD this spec serves: the problem,
  users, goals (G1–G9), requirements (R1–R18), success metrics, and scope.
- `design.platform.test-planning.0002` — the design doc that owns the mechanism,
  the termination proof (Regions 1–5), the alternatives, and the instrument-level
  rationale. Authoritative on *why* and *whether it terminates*; this spec is the
  buildable *what*.
- `spec.platform.test-planning.0001` — **superseded by this spec.** The v1 build
  contract; preserved as the record of what was built and dogfed.
- `omg-decomposer` / `omg-build-planner` / `omg-test-planner` — the plan-time
  orchestrator and the two planners (I1–I3).
- `omg-tester` + `test-writing` skill — the sole test-writer (I4).
- `omg-builder` + skill — the implementation agent, code-only (I5).
- `omg-epics` skill — the plan-phase sequence and test-planning wiring (I6).
- `omg-foreman` agent + skill — routing untouched; looping mechanics gain the
  fresh-context test-writer, terminal-branch removal, and crash recovery (I7/I8).
- `omg-review` skill — the R15 finding wiring and `P` handling (I9).
- `omg-product-manager` agent — the Mode-2 adjudicator, both topologies (I10).
- `omg-reviewer` agent — able to write the report for `P`; grant scoping deferred
  (I11).
- `omg-decompose` / `omg-test-plan` commands — the ask now covers the full plan
  phase; the v1 opt-in command is retired (I12/I13).
- The docs→Hindsight **sync command** — new home for shipping; boundary named
  here, behavior deferred and reconciled against
  `adr.platform.memory-lifecycle.0001` (I14).
