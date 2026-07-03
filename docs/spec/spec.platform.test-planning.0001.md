---
schema_version: 1
id: spec.platform.test-planning.0001
type: spec
title: "Test Planning Instruments for the OMG Delivery Workflow"
status: superseded
superseded_by: spec.platform.test-planning.0002
domain: platform
created_at: 2026-06-27T21:36:52Z
updated_at: 2026-07-03T00:47:52Z
hindsight:
  strategy: spec-or-adr
  tags:
    - source:authored
    - domain:platform
    - discipline:engineering
    - memory_type:spec
---

# Test Planning Instruments for the OMG Delivery Workflow — Spec

> Specification. Defines what the system or component must do, precisely enough
> to be built and verified against.
>
> **Status: draft.** Buildable contract for the test-planning feature, derived
> from the approved PRD `prd.platform.test-planning.0001` and design doc
> `design.platform.test-planning.0001`. It is **not yet approved for build**
> until the architect buildability pass clears.

## Overview

This spec defines the concrete build contract for **test planning** in the OMG
delivery workflow: the set of opencode instruments to create and change so that
verification becomes a deliberate, owned, tracked step — closing the gap where
findings-driven fixes get the least test coverage (PRD Problem).

The "build" here is **opencode instruments, not application code**: Markdown
agent personas, skill runbooks, and a slash command under the repo's
`opencode/` tree. The builder of this spec is **oc-smith** (the instrument
author), not a coding agent.

The mechanism itself — the deadlock-free findings loop, the summons-bead wiring,
the termination proof, the alternatives weighed — is **fully specified in the
design doc and is not relitigated here.** This spec's job is narrower and
sharper: state, per instrument, the behavior that must be true, the inputs and
outputs, and the acceptance criteria that confirm it — and to make **concrete**
the one piece the design left as prose: the planner's **convergence survey**
(design doc Open Question §6), which is this spec's center of gravity.

Naming, inherited from the design doc and used throughout:

- **`R`** — the epic's review bead (created plain by the decomposer).
- **`x`** — a finding's fix bead (`agent=omg-builder`).
- **`y`** — the planner-summons bead (`agent=omg-test-planner`), a **real,
  non-ephemeral** child bead.
- **`z`** — a planned test bead (`agent=omg-tester`), always durable.

### The instruments (build inventory)

| # | Instrument | Action |
|---|---|---|
| I1 | `opencode/agents/omg-test-planner.md` | **Create** — the planner agent (the *who*) |
| I2 | `opencode/commands/omg-test-plan.md` | **Create** — the `/omg-test-plan` command (the *ask*) |
| I3 | `opencode/skills/omg-epics/SKILL.md` **and** `.opencode/skills/omg-epics/SKILL.md` | **Edit (both trees)** — the test-planning wiring section (the *how*) |
| I4 | `opencode/skills/omg-review/SKILL.md` **and** `.opencode/skills/omg-review/SKILL.md` | **Edit (both trees)** — fetch-and-execute alignment |
| I5 | `opencode/agents/omg-tester.md` | **One-line edit** — honor a pre-planned bead's wiring intent |

Instruments deliberately **untouched**: `omg-foreman` (agent + skill, both
trees), `omg-decomposer`, and the `omg-reviewer` *agent persona*. Changing any of
these is out of scope and a build defect (see Non-Goals).

## Requirements

Each requirement is stated so it can be verified, and traces to a PRD goal/
requirement or a design-doc decision. Every requirement here is **[MUST]** —
essential to the feature being correct and complete. One is marked **[MUST —
low-risk]** (R4.1): it is in scope and verified, but the mechanism functions even
without it, so it hardens rather than enables. "Low-risk" is not "optional."

### I1 — The `omg-test-planner` agent

- **R1.1 [MUST] — Read-only on source, frontmatter mirrors the decomposer.** The
  planner's frontmatter matches the read-only sibling `omg-decomposer.md`
  **exactly in shape**: `mode: primary`, a low `temperature`, `tools: {write:
  false, edit: false, bash: true}`, and `permission: {bash: allow}`. It carries
  **no `permission.skill:` map** — like the decomposer, it loads the skills it
  needs (`omg-epics`, `omg-commands`) by **instruction in its persona prose**, not
  by a permission grant. It mutates beads and edits the review-bead body **only
  through `bd` via `bash`** — never by editing source files; `edit: false` blocks
  source-file edits but does not block `bd update <R> --body-file -`, which is a
  `bash` call. (PRD R1; design "Instruments to Create / Change"; frontmatter shape
  verified against the real `omg-decomposer.md`.)
- **R1.2 [MUST] — Confidence-first posture, inherited from `omg-tester`.** The
  planner plans verification only where it materially increases justified
  confidence, and is as willing to plan **no** test (with a recorded reason) as
  to plan one. It justifies both what it plans and what it declines. (PRD R2,
  Goal 3.)
- **R1.3 [MUST] — The two-step run contract.** A single planner run over an epic
  does **both**: (a) plans verification over the epic's build graph, and (b)
  rewrites the review bead `R`'s body to the test-aware form (R3.x). A run that
  does only one of these is incomplete. (PRD R3; design Goal 2, "Proposed
  Approach → Overview".)
- **R1.4 [MUST] — The minimal vocabulary, and nothing more.** The planner's
  entire expressive vocabulary is: a **Case A** test bead, a **Case B** test
  bead (two wiring shapes of one `agent=omg-tester` bead), and a **no-bead "no
  test needed"** decision recorded with a reason. No taxonomy, no scoring rubric,
  no test-type enum, no ephemeral/checkpoint bead. Reintroducing any of these is
  a build defect. (PRD Non-Goals, Scope; design OQ§2.)
- **R1.5 [MUST] — Mandatory close of `y`.** When the planner is dispatched on a
  summons bead `y`, it closes `y` in **every** branch (test planned or not)
  before its run is done: `bd close <y> --reason "<plan or no-test reason>"`.
  The agent must be told this explicitly; it must never have to infer it. (Design
  "findings-driven mechanism" step 7, OQ§1, Operational guard.)
- **R1.6 [MUST] — The convergence survey.** On **every** run the planner converges
  the epic onto the correct test state for the graph *as it exists at that
  moment* — re-running is a first-class, useful operation, and a redundant run is
  a no-op. The concrete survey procedure is specified in **R6** below; R1.6 is
  the requirement that the agent persona instruct the planner to perform it.
  (PRD open item; design OQ§6.)
- **R1.7 [MUST] — Task semantics only; sync is plugin-owned; mode-agnostic.** The
  planner carries **task semantics only** — it issues `bd` commands for the work
  it does (create/wire/close beads, rewrite `R`'s body) and **does not hardcode
  any `bd dolt` sync command, and does not branch on `dolt_mode`.** Sync discipline
  — how beads state is persisted and propagated — is owned by the `BeadsPlugin`,
  per `adr.platform.beads-sync-ownership.0001`. The planner is therefore written
  **mode-agnostic**: it carries no `server`-vs-`embedded` sync branch and is
  correct in **both** deployment modes by relying on the plugin. A planner that
  names `bd dolt commit/push/pull`, or reads/branches on the dolt mode for sync,
  is a build defect.

### I2 — The `/omg-test-plan` command

- **R2.1 [MUST] — Form mirrors the existing command family.** A Markdown file
  with YAML frontmatter carrying `description:` and `agent: omg-test-planner`,
  body routing the planner over epic `$1`. It mirrors `omg-decompose.md` /
  `omg-build.md` in shape and lives at `opencode/commands/omg-test-plan.md`
  (plural `commands/`). (Design OQ§4; verified against the real command dir.)
- **R2.2 [MUST] — It routes over the epic id only.** The body passes the epic id
  (`$1`) to the planner. It does **not** read or pass the dolt mode: sync is
  plugin-owned (R1.7, `adr.platform.beads-sync-ownership.0001`), so the planner
  has no use for the mode and the command carries no `dolt_mode` plumbing. (This
  is where `/omg-test-plan` deliberately diverges from `omg-build.md`, which passes
  the mode to fan it out to builders — the planner has no such downstream.)
- **R2.3 [MUST] — No `then:` chain in v1.** Unlike `omg-build.md`, the command
  carries **no** `then:` frontmatter — there is no auto-follow. It is the sole v1
  entry point to test planning. (Design I2 row, OQ§4; PRD Scope/Deferred — auto
  is deferred.)

### I3 — The `omg-epics` wiring section (both skill trees)

- **R3.1 [MUST] — A new "Test-planning wiring" section, beside the existing
  patterns.** Added to `omg-epics` SKILL.md next to the Review Bead Pattern and
  dependency-wiring rules — because the *mechanics* live in the skill, not the
  agent, consistent with how the decomposer's wiring already lives there. (Design
  "Maintainability via who/how split"; I3 row.)
- **R3.2 [MUST] — Both skill trees edited and kept in sync.** This repo has two
  `omg-epics` skill trees: `opencode/skills/omg-epics/SKILL.md` (the **shipped**
  package copy) and `.opencode/skills/omg-epics/SKILL.md` (this repo's dev
  tooling). They are currently identical; the build edits the package copy and
  keeps both in sync. Editing only one is a build defect. (Design I3 row, the
  two-skill-tree gotcha.)
- **R3.3 [MUST] — The summons-bead hard rules are stated verbatim as wiring
  mechanics**, exactly as the design doc enumerates them:
  - `y` is a **real** child bead (`bd create … --parent <epic>`, **no**
    `--ephemeral`), `agent=omg-test-planner`, `discovered-from:<R>`.
  - `y` blocks `x`: `bd dep add <x> <y>` — always.
  - `R` depends on `x`: `bd dep add <R> <x>` — existing reviewer behavior.
  - **Case A** (design-before-fix): `z` blocks `x` — `bd dep add <x> <z>`.
  - **Case B** (run-after-fix): `x` blocks `z` — `bd dep add <z> <x>` — **and**
    `z` blocks `R` — `bd dep add <R> <z>`.
  - Mandatory close: the planner closes `y` in every branch.
  (Design "Resolution of Open Question 1", "the hard core".)
- **R3.4 [MUST] — The canonical test-aware `R`-body block is authored here as
  literal, stable text.** The `omg-epics` section must contain the **exact Markdown
  block** the planner writes into `R`'s body — one authored artifact that both the
  planner persona (R1.3(b)) and the convergence survey (R6.4) reference, so
  "rewrite `R` to the *same* content" and "don't stack a second copy" have a
  concrete referent. The block states the reviewer's filing steps for an
  epic-scoped build finding, **carrying the load-bearing qualifiers verbatim**
  (paraphrasing them away is a build defect — an ephemeral `y` is the deadlock the
  whole design exists to prevent):
  1. File the fix bead `x`, `agent=omg-builder`, child of the epic, **with
     `discovered-from:<R>`**.
  2. File the summons bead `y`, **a real bead — `--parent <epic>`, NO
     `--ephemeral`** — `agent=omg-test-planner`, **with `discovered-from:<R>`**.
  3. Wire `y` blocks `x`: `bd dep add <x> <y>`.
  4. Wire `R` depends on `x`: `bd dep add <R> <x>`.
  5. Reopen `R`: `bd update <R> --status open`.

  The block should carry a stable sentinel/marker (e.g. a fixed heading or comment
  line) so the survey can cheaply recognize an already-armed `R` (see R6.4, OQ-2).
  This is the block referenced by R1.3(b). (Design "Hard rules" list, OQ§1.)
- **R3.5 [MUST] — The multi-agents file-overlap rule is carried forward.** The
  section states that when the planner mints `z` beads, two *different* findings'
  beads that touch the same files must be wired to block each other — the same
  "wire file-sharing beads in sequence" rule the decomposer already follows — so
  the planner does not create same-file `z` beads in a parallel ready wave.
  (Design "Operational → multi_agents".)

### I4 — The `omg-review` skill alignment (both skill trees)

- **R4.1 [MUST — low-risk] — State the fetch-and-execute contract explicitly.** The
  `omg-review` skill is aligned to state, as the builder skill already does, that
  the reviewer **fetches its review bead (`bd show <R>`) and executes the work
  order it finds there** — the standard review steps **plus** any additional
  filing steps the bead body carries. This edit is **in scope for build** and
  AC-I4 verifies it. It is marked *low-risk* (not optional) because the loop is
  already armed by the planner's `R`-body rewrite alone — the reviewer fetches and
  executes its bead like every worker — so this alignment hardens the contract
  rather than enabling the mechanism. Do not skip it. (Design "Resolution of OQ§3",
  OQ§3 — "RESOLVED, in scope for build".)
- **R4.2 [MUST] — It teaches no test-awareness.** The alignment adds **no**
  test-mode branch, no "detect a test-aware block" clause, and no knowledge of
  what testing is. The reviewer's *judgment* stays blind to test mode; it merely
  executes whatever filing steps its work order names. If the edit teaches the
  reviewer anything about testing, it is wrong. (PRD R3/Goal 4; design OQ§3,
  binding constraint 2.)
- **R4.3 [MUST] — The reviewer *agent persona* is unchanged**, and both skill
  trees are edited and kept in sync (same two-tree rule as R3.2). (Design I4 row.)

### I5 — The `omg-tester` acknowledgment

- **R5.1 [MUST] — A one-line acknowledgment, not a mode.** A single line is added
  to `omg-tester.md` stating that the tester may be handed a **pre-planned** test
  bead and, when so, should honor the bead's wiring intent — write the *failing*
  test for a Case-A bead; author/run the post-fix test for a Case-B bead — rather
  than re-deciding scope the planner already justified. This is orientation/data,
  **not** a test-mode branch in its logic. More than one line, or any branching
  logic, is out of scope. (PRD OQ resolved; design OQ§5, I5 row.)

### R6 — The planner's convergence survey (the spec's center of gravity)

This requirement makes concrete what the design doc left as prose (design OQ§6).
It is a **discipline expressed in the planner's instructions** — the planner is
an agent, not a deterministic function, so this is *instructed*, not enforced.
The build (I1 agent persona, reinforced by the I3 wiring section) must tell the
planner to run this survey, in order, on every run **before** it wires anything.

- **R6.1 [MUST] — Survey the build graph.** Enumerate the epic's build beads via
  `bd list --parent <epic> --json` (and the review bead `R`, identified as the
  child whose `agent=omg-reviewer`). This is the set of work whose verification
  the planner reasons about.
- **R6.2 [MUST] — Survey what is already implemented.** For each build bead, read
  its current implementation state (closed vs. open, and what it built) so the
  planner plans from reality — Case A (verification authored before the fix) only
  makes sense for not-yet-built work; already-built work takes Case B or a
  no-test decision.
- **R6.3 [MUST] — Survey what tests already exist.** Two sources, both consulted:
  (a) existing `agent=omg-tester` child beads of the epic and their wiring
  (planned-but-unbuilt, or built/closed), and (b) tests already present in the
  suite for the behavior in question. The suite survey is a **static read** —
  locating and reading existing test files (via read-only `bash` commands),
  **not** executing the suite — consistent with the planner's read-only posture
  (R1.1); the planner does not run tests. The planner does **not** re-add
  verification that is already planned or already exists.
- **R6.4 [MUST] — Survey `R`'s body state.** Determine whether `R`'s body already
  carries the test-aware filing steps. If it does, the planner treats it as
  already-correct and leaves it as-is (or rewrites it to the *same* content) —
  it does **not** stack a second copy of the instructions.
- **R6.5 [MUST] — Survey already-planned findings.** A finding whose `y` is closed
  and whose `z` is present and correctly wired is **settled**; the planner plans
  only *newly unplanned* work. (Signals it may use to recognize settled work —
  `discovered-from` links, a planner-stamped marker, the test-aware `R` body,
  existing `omg-tester` children — are aids to the survey, not an enforcement
  mechanism.)
- **R6.6 [MUST] — Converge, then wire.** Having surveyed, the planner sharpens
  toward the correct end state: it adds verification only for unplanned work,
  leaves correctly-planned work untouched, and (re)writes `R`'s body to the
  canonical test-aware block at most once. The end state must be identical
  whether the planner ran once or N times on the same graph. (Design Operational
  → convergence.)

## Inputs and Outputs

### `/omg-test-plan <epic-id>` (the entry point)

- **Input:** an epic id (`$1`). (No dolt mode — sync is plugin-owned; see R2.2.)
- **Output (side effects on the beads graph):**
  - Zero or more `z` test beads (`agent=omg-tester`) created and wired Case A or
    Case B.
  - Recorded "no test needed, because…" reasons (as comments on the relevant
    build bead and/or in a close reason) where verification is declined.
  - The review bead `R`'s body rewritten to the test-aware form (if not already
    so).
  - **No** new ephemeral beads (v1 uses none). **No** foreman/decomposer/reviewer-
    persona changes.

### The summons-bead cycle (findings-driven, at review time)

- **Input:** a reviewer-filed epic-scoped build finding, while executing a
  test-aware `R` body.
- **Output:** `x` (fix bead) and `y` (summons bead) created and wired
  (`y` blocks `x`, `R` depends on `x`), `R` reopened. On the planner's subsequent
  dispatch of `y`: an optional `z` wired Case A/B, and `y` closed.

### Planner per-build-bead decision (internal contract)

- **Input:** one build bead, plus the survey state from R6.
- **Output:** exactly one of — a Case A `z`, a Case B `z`, or a recorded no-test
  decision. (R1.4.)

## Preconditions and Assumptions

- **The epic exists and has been decomposed.** `/omg-test-plan` runs over an
  *already-built* (or building) epic; it does not mint epics. (Design "In-flight
  epics".)
- **Sync discipline is plugin-owned and deployment-specific.** Per
  `adr.platform.beads-sync-ownership.0001`, the `BeadsPlugin` owns how beads state
  is persisted and propagated, and informs agents of any sync steps. The feature
  is **mode-agnostic**: it works in both `embedded` and `server` deployments, and
  no instrument it builds reads or branches on the dolt mode for sync. The spec
  pins **no** deployment mode.
- **The foreman dispatches by label off `bd ready`**, which **excludes ephemeral
  beads** — the load-bearing fact that forces `y` to be real. The build must not
  rely on any ephemeral bead being dispatchable. (Design Context.)
- **The bead body is the universal work order.** Every worker fetches its own
  bead (`bd show <id>`) and executes it; the foreman passes only the id. The
  reviewer is no exception. The build relies on this contract, not on a special
  reviewer change. (Design Context.)
- **Two skill trees exist** (`opencode/skills/` shipped, `.opencode/skills/` dev)
  and must stay in sync for `omg-epics` and `omg-review`.

## Error and Edge Behavior

- **Planner forgets to close `y`** → `x` blocks forever (deadlock). Guarded by the
  mandatory-close rule stated in **both** the planner agent (R1.5) and the
  `omg-epics` wiring section (R3.3). Observable symptom: a stuck
  `omg-test-planner` bead on `bd ready --parent <epic>` with no forward progress.
- **Re-run on an already-planned epic** → must be a no-op, not a double-wire,
  per the convergence survey (R6). A second copy of the `R` body block, or a
  duplicate `z` for already-planned work, is a correctness failure.
- **Planner run on an in-flight epic** → it plans whatever build beads exist and
  rewrites `R`; already-closed beads get post-hoc verification only via Case B if
  they have not yet passed review. No migration, no global state flip. (Design
  "In-flight epics".)
- **Cycle introduction** → impossible by construction (all edges are forward
  `y→x→R`, `z→x` Case A, `x→z→R` Case B); `bd dep add` runs cycle detection and
  `bd swarm validate <epic>` confirms acyclicity. The build need add no new guard,
  but acceptance verifies it.
- **No build beads warrant a test** → a valid outcome: zero `z` beads, all
  decisions recorded as "no test needed". This is success, not a failure to plan.
- **`R` not found / no reviewer bead** → the planner cannot arm the loop; this is
  an epic that was not decomposed normally. **Default behavior: the planner
  surfaces the condition** (reports that no reviewer bead was found and that the
  loop cannot be armed) rather than silently skipping the body rewrite. It may
  still plan verification over the build graph, but it must not pretend the loop
  is armed. (Refinements to this handling are OQ-1; the surface-don't-skip default
  is the spec's requirement.)

## Non-Goals

Inherited from the PRD and design doc; the build must not quietly reintroduce
any:

- **No foreman change of any kind** (agent or skill, either tree). The label-only
  dispatcher routes `y`, `z`, and `R` already. A foreman edit is a build defect.
- **No decomposer change.** It already mints the same epic with a plain `R`.
- **No `omg-reviewer` *agent persona* change.** Only the `omg-review` *skill* is
  aligned (I4), and only to state the universal fetch-and-execute contract.
- **No test taxonomy, type enum, or risk/cost scoring rubric.**
- **No ephemeral/checkpoint test bead class.** v1 mints only durable `z` beads or
  nothing. (Cut deliberately — see PRD/design Deferred.)
- **No `then:` auto-chain, no `test.auto` config path, no cascading re-planning,
  no formula/molecule extraction.** All deferred.
- **No coverage thresholds, CI wiring, or merge gating.**
- This spec does **not** re-specify the termination proof, the alternatives, or
  the mechanism's correctness argument — those are owned by the design doc and
  are not re-derived here.

## Acceptance Criteria

Because the build is opencode instruments (Markdown/config), acceptance is
verified by **reading the instruments and reasoning about the contracts they
encode**, plus structural checks — not by a unit-test suite. Each criterion maps
to a requirement.

### Build acceptance (read-the-instrument — gates this build)

These are satisfiable by reading the built instruments and running simple
structural checks. They are what oc-smith must satisfy to call the build done.

- **AC-I1 (planner agent):** `opencode/agents/omg-test-planner.md` exists with
  frontmatter matching `omg-decomposer.md`'s shape — `tools: {write: false, edit:
  false, bash: true}`, `permission: {bash: allow}`, **no `skill:` map** (R1.1);
  states the confidence-first posture (R1.2); states the two-step run contract —
  plan graph **and** rewrite `R` (R1.3); states the minimal vocabulary with no
  taxonomy (R1.4); states the mandatory `y` close in every branch (R1.5);
  instructs the R6 convergence survey before wiring (R1.6); carries **task
  semantics only** — names **no** `bd dolt` sync command and **no** `dolt_mode`
  branch (R1.7); and loads `omg-epics`/`omg-commands` by persona-prose instruction.
- **AC-I2 (command):** `opencode/commands/omg-test-plan.md` exists with
  frontmatter `description:` + `agent: omg-test-planner` and **no** `then:`
  (R2.1, R2.3); body routes over `$1` only, with **no** `dolt_mode` read or
  plumbing (R2.2).
- **AC-I3 (wiring):** Both `omg-epics` SKILL.md trees carry a "Test-planning
  wiring" section (R3.1) stating the summons-bead hard rules verbatim (R3.3), the
  **literal canonical test-aware `R` block with the real/no-`--ephemeral`/
  `discovered-from` qualifiers present** (R3.4), and the same-file `z` sequencing
  rule (R3.5). **The two trees are byte-identical whole files**, verified by
  `diff opencode/skills/omg-epics/SKILL.md .opencode/skills/omg-epics/SKILL.md`
  exiting 0 (R3.2).
- **AC-I4 (review alignment):** Both `omg-review` SKILL.md trees state the
  fetch-and-execute contract (R4.1) with no test-awareness added (R4.2); the
  `omg-reviewer` agent file is unchanged (R4.3); the two trees are byte-identical
  whole files, verified by `diff` exiting 0. A grep of the `omg-review` skill for
  testing vocabulary returns nothing the alignment introduced.
- **AC-I5 (tester):** `omg-tester.md` gains a brief acknowledgment that honors a
  pre-planned bead's Case-A/Case-B wiring intent, with **no test-mode branch and
  no decision logic** (R5.1). (Verify the *intent* — small, non-branching — not a
  literal line count.)
- **AC-convergence (R6 — the headline):** The planner persona, read end to end,
  describes a survey that inspects build beads (R6.1), implementation state
  (R6.2), existing tests as beads **and** statically in the suite (R6.3), `R`'s
  body state (R6.4), and already-planned findings (R6.5), and converges rather
  than re-adds (R6.6) — such that a reader is convinced a second run on an
  unchanged graph changes nothing, and a run on a grown graph plans only the new
  work. This is the criterion that most directly confirms the PRD's "re-planning
  is useful, not double-wiring" intent.
- **AC-untouched:** `git diff` after the build touches **none** of:
  `omg-foreman.md` (agent or skill, either tree), `omg-decomposer.md`, the
  `omg-reviewer.md` agent. Any change to these fails acceptance.

### Feature acceptance (runtime — exercised on first dogfood, not a build gate)

This requires a live epic to run against, which does not exist at build time, so
it does **not** gate oc-smith's instrument build. It confirms the built
instruments behave correctly when the feature is first exercised.

- **AC-loop-terminates:** On a constructed test epic with a planned finding,
  `bd swarm validate <epic>` reports no cycles, and the close order matches the
  design doc's traced branches (`y,z,x,R` Case A; `y,x,z,R` Case B; `y,x,R`
  no-test). Confirms the design's termination claim survives the built instruments.

## Open Questions

- **OQ-1 — `R`-not-found handling.** The exact behavior when an epic has no
  reviewer bead (malformed/non-standard epic) is left to the build to make
  precise (surface vs. skip). Low-stakes; the normal path always has an `R`.
- **OQ-2 — Marker for settled findings.** R6.5 lists candidate signals
  (`discovered-from`, a planner-stamped marker, the test-aware `R` body, existing
  `omg-tester` children) for recognizing already-planned work. Whether to
  introduce an explicit planner-stamped marker, or rely on the existing signals,
  is a build-time judgment — neither is load-bearing for correctness, only for
  the cleanliness of the convergence survey.
- **OQ-3 — Builder (oc-smith) reviewer.** Whether the eventual build of these
  instruments is reviewed by a code-flavored reviewer or by an instrument-aware
  pass is a *process* question for whoever runs the build, not a property of this
  spec. Noted so it is not lost. (Out of band; does not gate the spec.)

## Related Documents

- `prd.platform.test-planning.0001` — the approved PRD; the problem, users,
  goals, success metrics, and scope this spec serves.
- `design.platform.test-planning.0001` — the design doc that owns the mechanism,
  the termination proof, the alternatives, and the instrument-level rationale.
  This spec is the buildable contract derived from it; the design doc is
  authoritative on *why* and *whether it terminates*, this spec on *what to build*.
- `omg-decomposer` agent + `omg-epics` skill — the test-blind decomposer (unchanged)
  and the skill that gains the wiring section.
- `omg-reviewer` agent + `omg-review`/`omg-commands` skills — the reviewer that
  executes the test-aware `R` body as data; only the `omg-review` skill is aligned.
- `omg-tester` agent + `test-writing` skill — the test *writer* the planned `z`
  beads dispatch to; gains a one-line acknowledgment.
- `omg-foreman` agent + skill — the label-only dispatcher that must not change.
