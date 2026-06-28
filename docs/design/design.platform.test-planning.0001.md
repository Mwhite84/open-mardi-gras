---
schema_version: 1
id: design.platform.test-planning.0001
type: design
title: "Test Planning as a First-Class, Owned Step in the OMG Delivery Workflow"
status: draft
domain: platform
created_at: 2026-06-26T04:17:07Z
updated_at: 2026-06-26T13:12:18Z
hindsight:
  strategy: spec-or-adr
  tags:
    - source:authored
    - domain:platform
    - discipline:engineering
    - memory_type:design
---

# Test Planning as a First-Class, Owned Step in the OMG Delivery Workflow — Design Doc

> Design document. Argues for a whole approach to building something: the
> proposed structure, the alternatives weighed, and the reasoning that connects
> goals to design.
>
> **Status: draft.** This document captures a settled design conversation for
> architectural review, against the approved PRD `prd.platform.test-planning.0001`.
> It is **not yet approved for build.**

> **Read first.** The planner-summons bead is a **real (non-ephemeral) bead**:
> `bd ready` hides ephemeral beads and the foreman must not change, so a bead the
> foreman has to dispatch off the ready queue cannot be ephemeral. See **Open
> Questions §1**.
>
> Everything else in this design is build-ready pending the sign-offs in Open
> Questions. The loop is armed *by construction* — the planner rewrites `R`'s
> body, and executing a bead's body is how every worker in the foreman loop
> already operates (see **Context → the bead body is the work order** and
> **Resolution of Open Question 3**).

## Goals

This design must deliver a buildable, correct mechanism for the PRD's intent.
Concretely:

1. **Give test planning an owner** — a `omg-test-planner` agent that is read-only
   with respect to source code (like the decomposer and reviewer), reasons over an
   already-built epic's graph, and *plans* verification by minting and wiring
   test-labeled work. It is distinct from the existing `omg-tester`, which
   *writes* tests.
2. **Make the planner the sole owner of test-awareness.** When and only when the
   operator runs the planning step, the epic becomes test-aware: the planner both
   (a) plans/wires verification over the original build graph and (b) rewrites the
   review bead body to the test-aware form that arms the findings loop.
3. **Close the findings-driven gap** — a reviewer-surfaced fix gets its
   verification *planned before it is built* (or explicitly declined with a
   recorded reason), on the same footing as originally decomposed work.
4. **Change nothing in the blind agents' judgment.** Zero changes to the foreman
   (label-only dispatch) and zero changes to the decomposer (test-blind). The
   reviewer gains test-awareness only as bead-body *data* the planner writes into
   `R` — and this *is* achievable, because executing a bead's body is the universal
   foreman-loop contract: the foreman passes a bead *id*, and the dispatched agent
   fetches its own body (`bd show <id>`) and does what the bead says. The reviewer
   is no exception; it executes the work order it finds in `R`. The reviewer's
   *judgment* stays blind to test mode — it does not branch on "are we testing,"
   it just executes whatever filing steps its work order names. The one alignment
   we recommend (Instruments checklist) makes the reviewer *skill* state this
   fetch-and-execute contract explicitly, as the builder skill already does; it
   teaches no test-awareness. The only path is the explicit
   `/omg-test-plan <epic-id>` command.
5. **Prove the loop terminates.** Every branch of the findings loop drains to a
   clean epic close with no deadlock and no leaked beads — and that proof is in
   this document, traced, not asserted.

## Non-Goals

Inherited verbatim from the PRD; this design does not relitigate them and must not
quietly reintroduce any:

- **No test taxonomy or risk/cost scoring rubric.** No ~10-type enum, no
  multi-axis matrix. The planner reasons in prose about confidence.
- **No new judgment-review agent and no mid-graph review gates.** That is the
  existing reviewer's job.
- **No foreman change of any kind.** If the design needs one, the design is wrong
  (this is the constraint that forces the summons bead to be real, not ephemeral).
- **No coverage thresholds, CI wiring, or merge gating.**
- **No formula/molecule extraction yet, no automatic test-planning path, and no
  cascading re-planning.** All three are Deferred (see Tradeoffs → Deferred).

This design also does **not** define the planner's prose reasoning quality (that
is the planner agent's persona and the inherited `omg-tester` philosophy); it
defines the *mechanism and structure* the planner operates within.

## Context

### The existing system, verified against the real instruments

The mechanisms below were confirmed by reading the actual agent and skill files
and by `bd <cmd> --help` / `bd config list` against beads `v1.0.5`, not taken on
faith from the brief.

- **Dispatch is label-only and stateless.** `opencode/agents/omg-foreman.md` and
  `.opencode/skills/omg-foreman/SKILL.md` confirm the foreman loops on
  `bd ready --parent <epic-id> --json`, reads `bd state <id> agent` for each ready
  bead, and dispatches to that agent via the Task tool. It holds no orchestration
  state; "newly-unblocked beads surface on the next pass." A bead with no `agent`
  label stops the foreman. **The foreman's `bd ready` call passes no
  `--include-ephemeral` flag** — which is why the summons bead must be real, not
  ephemeral.

- **The bead body is the work order for every agent in the foreman loop.** This
  is the contract the whole design rests on, verified against the real instruments.
  The foreman dispatches a bead by passing its **id** (`omg-foreman` SKILL.md
  step 4: "Pass the worker the bead id and `dolt_mode`") — it never passes the
  body. The dispatched worker fetches its own body and executes it: `omg-builder`
  SKILL.md steps 2–3 are literally "Read the full description. `bd show <id>`…
  Implement what the description says — no more, no less." The body has *always*
  carried the instruction to act — the older master-branch `omg-decompose.md`
  (lines 49–60) wrote the review bead's *description* to say, verbatim, "Invoke
  the reviewer agent (@omg-reviewer) to perform a thorough code review…" That is
  how review has always been instructed: the work order lives in the bead body,
  authored at decompose time. So "the foreman passes the id, not the body,
  therefore a body rewrite is inert" is a non-sequitur — the body is the
  instruction source for the entire loop, by design.

- **The review/findings loop already exists, and the reviewer runs it by
  executing its review bead.** `omg-reviewer.md` + `omg-review` SKILL.md +
  `omg-commands` SKILL.md: the reviewer is handed the review-bead **id**, fetches
  it, and runs the standard review work order — file each finding as a bead with a
  `discovered-from` link, stamp each finding's own `agent` label, make epic-scoped
  findings children of the epic that depend-block the review bead
  (`bd dep add <review-bead-id> <finding-id>`), and **reopen the review bead**
  (`bd update <review-bead-id> --status open`) so the loop continues. The review
  bead closes only on a pass with no outstanding epic-scoped findings. The standard
  review steps live in the `omg-review` skill; the review bead's body is the work
  order that invokes them. When the planner rewrites `R`'s body to add the
  test-aware filing steps, those become part of the same work order the reviewer
  executes — no different in kind from the standard steps. One honest gap: the
  `omg-review` skill, unlike the builder skill, does not *yet spell out* "`bd show
  <R>` and execute the work order you find there." Aligning it to do so is the
  minimal recommended edit (Instruments checklist) — an alignment with the
  universal loop contract, not a teaching of test-awareness. The reviewer's
  *judgment* carries no test logic, and never needs to.

- **The decomposer is test-blind and owns the review-bead pattern.**
  `omg-decomposer.md` + `.opencode/skills/omg-epics/SKILL.md`: it mints the epic
  from the spec, mints children, stamps every bead's `agent` label with
  `bd set-state <id> agent=<name>`, and creates one "Code review" bead stamped
  `agent=omg-reviewer`, blocked by all other children. It produces the **same
  epic** whether or not the epic is later tested.

- **The test *writer* exists and is philosophically correct.**
  `opencode/agents/omg-tester.md` (`write/edit/bash: true`,
  `skill: test-writing: allow`) refuses tests that do not increase justified
  confidence. `opencode/skills/test-writing/SKILL.md` is ecosystem-specific *how*.
  The planner is the missing *planning* complement and inherits this philosophy.

- **`bd ready` excludes ephemeral beads by default.** `bd ready` and `bd list`
  do not surface ephemeral ("wisp") beads unless `--include-ephemeral` is passed,
  and the foreman's `bd ready` call passes no such flag. A bead the foreman must
  dispatch off the ready queue therefore cannot be ephemeral — it would never be
  surfaced. This is why the planner-summons bead is a real (non-ephemeral) child
  bead. v1 uses no ephemeral beads at all.

- **Workflow mode.** `.workflow.yaml` is solo, `docs_base: docs`,
  `build.mode: one_agent`. Beads runs in **server mode** (`.beads/metadata.json`
  `dolt_mode: server`): every `bd` write lands on the shared Dolt server
  immediately. This is why no live test beads were created during this design's
  verification — the semantics above come from `--help`, config, and the
  git-ignore manifest, which are authoritative.

### Binding constraints (which forces dominate)

For this problem, the dominant constraints are, in order:

1. **Correctness of the dependency graph — specifically, deadlock-freedom and no
   leaked beads.** The whole value proposition is a loop that terminates cleanly.
   A graph that can wedge is worse than no feature. This dominates everything.
2. **Operability under the zero-judgment-change constraint on the foreman and
   reviewer.** The design's safety rests on those two agents' *judgment* staying
   ignorant of test mode; any test-awareness that leaks into their *logic* (not
   their bead-body data) breaks the model. The reviewer executing whatever filing
   steps its bead body names is *not* such a leak — it is the universal loop
   contract, the same way the builder executes its bead.
3. **Maintainability via the who/how split.** Planner *identity* belongs in the
   agent persona; the wiring *mechanics* belong in `omg-epics` beside the existing
   decomposition/review-bead patterns, not duplicated into the agent.

Scale, security, and cost are not binding here: this is single-operator workflow
tooling acting on a local/remote beads graph, not a multi-tenant service.

## Proposed Approach

### Overview

Three new/changed pieces, and a precise wiring contract:

- A new **`omg-test-planner`** agent (the *who*) — read-only on source code,
  reasons over a built epic, plans verification, owns test-awareness.
- A new **`/omg-test-plan <epic-id>`** command (the *ask*) — the sole v1 entry
  point; routes the planner over an existing epic.
- The **wiring mechanics** (the *how*) added to `.opencode/skills/omg-epics/SKILL.md`,
  beside the existing review-bead and dependency patterns: how planned test beads
  are wired, how the planner-summons bead is wired, and the mandatory close step.

The planner does exactly two things when it runs, and nothing in any other agent
branches on whether it ran:

1. **Plan the original build graph.** Read the epic's build beads; per bead decide
   what verification (if any) materially increases justified confidence; express
   each decision as test-labeled work wired into the epic, or as a recorded
   "no test needed, because…" outcome.
2. **Arm the findings loop.** Rewrite the existing review bead's body to the
   test-aware instructions (below), so that *future* reviewer-filed findings
   summon the planner before their fixes are built.

"Are we testing?" is answered purely by "did the operator run `/omg-test-plan`?"
— there is no flag and no branch anywhere.

### Resolution of Open Question 2 — the planner's structural vocabulary (keep it small)

The planner's entire vocabulary is **two wiring shapes of one
`agent=omg-tester` bead, plus a no-bead "no test needed" decision.** That is the
whole set; growing it back toward a taxonomy is explicitly out of scope.

- **Design-vs-run timing is a wiring choice, not a new shape.** A test bead
  labeled `agent=omg-tester` is wired one of two ways — **Case A** (authored
  before the fix) or **Case B** (run after the fix), below. Same bead, same
  label; the dependency edges express the timing. No extra vocabulary needed.

- **"No test needed" is a recorded decision that mints no bead.** When
  verification would not increase justified confidence — mechanical change,
  covered elsewhere, low-risk, or a deterministic gate (lint/typecheck/build)
  already covers it — the planner records the reason and creates no bead. v1 does
  not mint a "gate bead"; the deterministic gate is assumed to run in the
  build/CI context the operator already has.

**Net minimal vocabulary the planner actually uses:**

| Planner outcome | Beads expression | Label |
|---|---|---|
| Verification needed, authored before fix | test bead, **Case A** wiring | `agent=omg-tester` |
| Verification needed, run after fix | test bead, **Case B** wiring | `agent=omg-tester` |
| No verification needed | **no bead**; recorded reason (covers the deterministic-gate case too) | — |

This is two wiring shapes of one bead type plus one no-bead decision — no
taxonomy, no scoring.

### The findings-driven mechanism (the hard core)

The deadlock-free mechanism. Names: **`R`** = the epic's review
bead (already created by the decomposer); **`x`** = a finding's fix bead
(`agent=omg-builder`); **`y`** = the **planner-summons bead** (`agent=omg-test-planner`);
**`z`** = a planned test bead (`agent=omg-tester`).

> **`y` is a real (non-ephemeral) child bead**, because `bd ready` hides
> ephemeral beads and the foreman cannot be changed to reveal them. The cost is
> one closed planning-summons bead per finding in the durable record — an
> acceptable, even desirable, audit trail: the findings-driven planning decision
> becomes a visible recorded event. See Open Questions §1.

**Hard rules — the test-aware review-bead instructions (authored by the planner)
tell the reviewer to do this when it files an epic-scoped build finding:**

1. File the finding's fix bead **`x`**, `agent=omg-builder`, as a child of the
   epic, with `discovered-from:<R>` (existing reviewer behavior).
2. File the planner-summons bead **`y`**, **a real bead** (no `--ephemeral`),
   `agent=omg-test-planner`, as a child of the epic, with `discovered-from:<R>`.
3. Wire **`y` blocks `x`**: `bd dep add <x> <y>` ("`x` depends on `y`"). The fix
   cannot be built before its verification is planned.
4. Wire **`R` depends on `x`** (existing behavior: epic-scoped finding blocks the
   review bead): `bd dep add <R> <x>`.
5. Reopen `R`: `bd update <R> --status open` (existing behavior).

**Then the queue carries it, with zero foreman or reviewer logic change:**

6. Foreman's next `bd ready --parent <epic>` surfaces **`y`** (it is real and
   unblocked); `x` is hidden (blocked by `y`). Foreman reads `bd state <y> agent`
   → `omg-test-planner` → dispatches `y` to the planner, exactly like any other
   bead. The foreman learns nothing.
7. The planner, working `y`, decides what verification `x` needs:
   - If a test is warranted, it creates **`z`** (`agent=omg-tester`, child of the
     epic) and wires it per **Case A** or **Case B** below.
   - If no test is warranted, it creates no `z` and records the reason (as a
     comment on `x` and/or in `y`'s close reason).
   - **In every branch it then closes `y`**: `bd close <y> --reason "<plan or
     no-test reason>"`. *Closing `y` is mandatory and is the explicit end of the
     summons bead's life.* `y` exists only to summon the planner; once the plan
     exists, `y` is consumed.

**Case A — design-before-fix (red/green):** verification can and should be
authored before the implementation.

- Planner wires **`z` blocks `x`**: `bd dep add <x> <z>`.
- After `y` closes: `z` is ready → tester writes the *failing* test, closes `z` →
  `x` is now unblocked (both `y` and `z` closed) → builder makes it pass, closes
  `x` → `R` is unblocked (its dep `x` is closed) → review pass.

**Case B — run-after-fix:** the verification can only be *run* after the fix
exists (e.g. it asserts post-fix behavior).

- Planner wires **`x` blocks `z`**: `bd dep add <z> <x>`, **and** **`z` blocks `R`**:
  `bd dep add <R> <z>` (so the review cannot close with an unverified fix).
- After `y` closes: `x` is unblocked (`y` closed) → builder fixes, closes `x` →
  `z` is unblocked → tester runs the test, closes `z` → `R` is unblocked (deps `x`
  and `z` both closed) → review pass.

**No-test branch:** planner creates no `z`, records the reason, closes `y` → `x`
is unblocked → builder fixes, closes `x` → `R` unblocked → review pass.

### Proof of termination and no-leak (traced, not asserted)

Treat the epic graph as a DAG (beads enforces acyclicity; `bd dep add` runs cycle
detection, and `bd swarm validate` confirms it). Every edge added above is a
*blocks* edge from a later bead to an earlier one in a strictly forward direction
(`y → x → R`; `z → x` in Case A; `x → z → R` in Case B), so no cycle is
introduced. A finite DAG with no cycle has a topological order; the foreman closes
beads in dependency order; therefore the queue strictly drains. Tracing each
branch to the close of `R` confirms there is no state in which a bead is
permanently blocked:

- **Case A:** close order `y, z, x, R`. At each step the next bead's blockers are
  all closed. ✓
- **Case B:** close order `y, x, z, R`. ✓
- **No-test:** close order `y, x, R`. ✓

**No leak:** `y` is a real bead and is *closed*, not abandoned; it leaves a normal
closed-bead record. `z` (when created) is closed by the tester. v1 uses no
ephemeral beads anywhere, so there is nothing that can be TTL-compacted out from
under an open dependency. ✓

### Resolution of Open Question 3 — reviewer-instruction authoring

The decomposer creates a **plain** review bead `R` (unchanged). The planner, when
the operator runs `/omg-test-plan`, **rewrites `R`'s body** to add the test-aware
filing steps. Mechanism, verified against `omg-commands`:

- The planner finds `R` for the epic (`bd ready`/`bd list --parent <epic>` →
  the bead whose `agent=omg-reviewer`).
- It overwrites the body with `bd update <R> --body-file -` (reading the new body
  from stdin), or `bd update <R> --description "<…>"`. `R` is mutable until the
  epic ships (the epic, not `R`, is the shipped authority; `R` is closed before
  the epic closes), so this edit is within the immutability rules.
- The new body contains the **Hard rules** list above, in addition to the standard
  review work order.

**This arms the loop, because executing the bead body is how the loop already
works.** The foreman passes `R`'s **id**; the reviewer fetches `R` (`bd show <R>`)
and executes the work order it finds there — exactly as the builder fetches and
executes its bead (`omg-builder` SKILL.md steps 2–3), and exactly as review has
always been instructed (the master-branch `omg-decompose.md` wrote "Invoke the
reviewer agent…" into the review bead's *body*). When the work order says "also
file `y` and wire `y → x`," the reviewer does; when it doesn't, the reviewer files
findings the old way. The reviewer needs **no test-awareness** — it just executes
its work order. The rewrite is therefore not inert; it is the loop being armed by
construction.

The reviewer's *judgment* stays blind to test mode: it does not branch on "are we
testing." The standard review steps (read every changed file, file a bead per
finding, separate blocking from nice-to-have) are unchanged and continue to live
in the `omg-review` skill; the planner's added filing steps ride in `R`'s body as
data, alongside them, and are executed the same way.

**One alignment edit is recommended — and it is alignment with the loop contract,
not test-awareness.** The `omg-review` skill, unlike the builder skill, does not
*yet spell out* that the reviewer fetches its bead and executes the work order it
carries. The builder skill makes this explicit (steps 2–3); the reviewer skill
leaves it implicit, describing only the standard filing procedure. The minimal,
correct edit is to align the reviewer skill with the universal contract: state
that the reviewer **fetches its review bead (`bd show <R>`) and executes the work
order it finds there** — the standard review steps plus whatever additional filing
steps the bead body carries. This is the same fetch-and-execute behavior every
other worker in the loop already has; it is **not** a "logic-blind clause that
detects a test-aware block," and it teaches the reviewer nothing about test mode.
The reviewer agent *persona* needs no change. (Captured in the Instruments
checklist and Open Questions §3 as the recommended alignment, not a blocking
remediation.)

The on-demand step is then complete, not half: planning the original graph *and*
rewriting `R` are both done in the single `/omg-test-plan` run. A plain-review
epic has a reviewer that files findings the old way; a test-planned epic has a
reviewer whose `R` body now *also* tells it to file `y` and wire `y → x` — and the
reviewer executes that body the same way it executes any review bead.

### Resolution of Open Question 1 — summons-bead wiring

Stated as the hard rules above. To collect them unambiguously:

- **`y` is a real child bead** (`bd create … --parent <epic>`, **no**
  `--ephemeral`), `agent=omg-test-planner`, `discovered-from:<R>`.
- **`y` blocks `x`** (`bd dep add <x> <y>`) — always.
- **`R` depends on `x`** (`bd dep add <R> <x>`) — existing reviewer behavior.
- **Case A:** **`z` blocks `x`** (`bd dep add <x> <z>`).
- **Case B:** **`x` blocks `z`** (`bd dep add <z> <x>`) **and `z` blocks `R`**
  (`bd dep add <R> <z>`).
- **Mandatory close:** the planner closes `y` in every branch
  (`bd close <y> --reason "…"`). This is stated explicitly because `y` is the
  first bead type whose entire purpose is to be consumed; an agent must never have
  to *infer* that it should close `y`.

### Instruments to Create / Change (the build checklist)

| Instrument | Action | Rationale (who/how split) |
|---|---|---|
| `opencode/agents/omg-test-planner.md` | **Create** | The planner's *identity*: read-only on source, confidence-first posture inherited from `omg-tester`, justifies both what it plans and what it declines, the two-step run contract (plan graph + rewrite `R`). **Frontmatter shape (confirmed against `omg-decomposer.md`, the read-only sibling):** `mode`, low `temperature`, a `tools:` block with `write: false`, `edit: false`, `bash: true`, and a `permission:` block with `bash: allow` and a `skill:` map granting `omg-epics`, `omg-commands` (and the wiring/test references it needs). Source stays read-only (`write/edit: false`); beads mutation and the `R` body edit go through `bd` via `bash`. **Note:** with `edit: false`, the agent cannot edit source *files*, which is correct — but confirm at build that editing the review bead body via `bd update --body-file -` (a `bash` call, not a file edit) is unaffected by the `edit` permission. It is, since `bd` writes go through `bash`, but the build must verify the permission set actually lets the planner run every `bd` write it needs. |
| `opencode/skills/omg-epics/SKILL.md` **and** `.opencode/skills/omg-epics/SKILL.md` | **Edit (both copies)** | Add a "Test-planning wiring" section beside the Review Bead Pattern: the summons-bead rules, Case A / Case B edges, the mandatory `y` close, and the test-aware review-bead instruction block the planner writes. **There are two skill trees in this repo** — `opencode/skills/` (the package that ships to users, alongside `opencode/agents/` and `opencode/commands/`) and `.opencode/skills/` (this repo's own dev tooling). They are currently identical copies; the *shipped* instrument is `opencode/skills/…`, so the build must edit the package copy and keep them in sync (or whatever single source the build uses). The *mechanics* live in the skill, not the agent — consistent with how the decomposer's wiring already lives there. |
| `opencode/commands/omg-test-plan.md` | **Create** | The `/omg-test-plan <epic-id>` command. **Confirmed location/format against the real command dir:** commands live in `opencode/commands/` (plural), as Markdown with YAML frontmatter carrying `description:` and `agent:` (see `omg-decompose.md`, `omg-build.md`). Frontmatter: `agent: omg-test-planner`; body routes the planner over epic `$1`, passing the epic id and the dolt mode (read it the way `omg-build.md` does: `jq -r '.dolt_mode // "embedded"' .beads/metadata.json`). It is the sole v1 entry point. Unlike `omg-build`, it should **not** carry a `then:` chain in v1 (no auto-follow). |
| `opencode/agents/omg-tester.md` | **One-line edit** | Add a single acknowledgment that it may be handed a *pre-planned* test bead and, when so, should honor the bead's wiring intent (write the failing test for a Case-A bead; run/author the post-fix test for a Case-B bead) rather than re-deciding scope. This is the minimum to keep the tester from second-guessing a plan the planner already justified. It is **data/orientation, not logic** — no test-mode branch. See Open Questions §5. |
| `opencode/agents/omg-decomposer.md` | **No change** | It already produces the same epic with a plain review bead; the planner upgrades `R` only if/when the operator runs the step. |
| `opencode/agents/omg-foreman.md`, `omg-foreman` skill (both trees) | **No change** | Label-only dispatch already routes `y`, `z`, and `R` with no special-casing — *because `y` is real, not ephemeral.* This is the design's central constraint and it is met. |
| `opencode/skills/omg-review/SKILL.md` (both trees) | **Minimal alignment edit (recommended, not blocking)** | The body-rewrite arms the loop on its own — the reviewer fetches `R` and executes its work order, like every worker in the foreman loop. The recommended edit only **aligns the reviewer skill with that universal contract**, which the builder skill already states and the reviewer skill leaves implicit: add that the reviewer **fetches its review bead (`bd show <R>`) and executes the work order it finds there** — the standard review steps plus any additional filing steps the bead body carries. This is *not* a "logic-blind clause that detects a test-aware block," and it teaches the reviewer **nothing** about test mode. The reviewer **agent persona** needs no change. See Open Questions §3. |

## Alternatives Considered

The PM weighed three structural placements; each is held to the binding
constraints, not strawmanned.

**A. Fold planning into the decomposer.** The decomposer already mints the epic
and owns the review-bead pattern, so planning verification there is tempting and
would need no new agent.

- *Why it loses:* It collapses two genuinely different judgments —
  *decompose the build* vs. *plan the confidence* — into one agent, and it
  destroys the PRD's load-bearing property that the decomposer is **test-blind**
  and produces the *same epic either way*. Once the decomposer plans tests, "are
  we testing?" becomes a decomposer branch (a mode flag or a fork), which the PRD
  explicitly forbids. It also forecloses the deferred auto path's clean shape: auto
  is meant to become a thin wrapper that calls the *same* planner, not a second
  copy of planning logic living in the decomposer. Rejected.

**B. Fold planning into the existing `omg-tester`.** The tester already reasons
about confidence; give it a planning mode.

- *Why it loses:* The tester has `write/edit/bash: true` and *writes tests* — it
  is the worker, the thing the planner dispatches to. Merging planner and worker
  means the agent that decides *what confidence is needed* is the same one that
  *produces the test*, removing exactly the distance the PRD wants (the same reason
  the reviewer does not fix what it reviews). It also gives a source-writing agent
  a planning role over the whole graph, widening its blast radius. The planner must
  be read-only on source, like the decomposer and reviewer; the tester cannot be.
  Rejected. (The tester still gets a one-line acknowledgment that it may receive a
  pre-planned bead — that is orientation, not a planning role.)

**C. Make the reviewer plan tests.** The reviewer already notices missing tests
and runs the findings loop, so let it decide and wire verification.

- *Why it loses:* This is the status quo's *worst* property promoted to a feature:
  test thinking happens only *after* review, exactly when the riskiest (flagged)
  changes are entering the graph — the PRD's central complaint. It also forces
  test-mode logic into the reviewer, violating "the reviewer follows the
  instructions in the bead it is handed and stays ignorant of test mode." Planning
  must happen *over the built epic, before* findings, and *for* findings via a
  summoned planner — not inside the reviewer's own judgment. Rejected.

**D. Keep the summons bead ephemeral (the PRD's literal "wisp"), and change the
foreman to pass `--include-ephemeral`.** This would honor the "vapor, no durable
record" intent.

- *Why it loses:* It violates the PRD's hardest non-goal (zero foreman change) and
  re-grows orchestration awareness in the one agent whose value is having none.
  It also exposes the TTL-compaction hazard (a wisp can vanish while blocking a
  fix). The "no durable record" benefit is small and arguably a *loss* — a
  findings-driven planning decision is worth recording. Rejected in favor of a real
  summons bead.

## Tradeoffs

**What the chosen approach gains:**

- **A terminating, leak-free loop** proven by trace, using only the existing
  blocking semantics the workflow already relies on. No new beads primitive, no new
  foreman capability.
- **Strict who/how/ask separation:** planner identity in the agent, wiring in
  `omg-epics`, entry in the command — each where the project's conventions put it.
  (The one recommended reviewer-skill edit is an *alignment* with the universal
  loop contract — make explicit that the reviewer fetches and executes its bead —
  not a test-awareness change; see Open Questions §3.)
- **The blind agents stay blind *in judgment*.** Foreman: zero change.
  Decomposer: zero change. Reviewer: its *judgment* stays test-ignorant; it acts
  on `R`'s body as data, which is exactly how every worker in the foreman loop
  already operates — the foreman passes a bead id, the worker fetches and executes
  its body. The loop is armed by the planner's body rewrite alone; the one
  recommended reviewer-skill edit only *spells out* that fetch-and-execute contract
  (which the builder skill already states and the reviewer skill leaves implicit),
  and it carries no test logic. This is what genuinely makes the design safe to
  ship.
- **A clean future seam for auto.** Because all test-awareness lives in the
  planner and the command is a thin router, the deferred `test.auto` path becomes
  a wrapper invoking the same planner — additive, not a redesign.

**What it gives up (honest costs):**

- **A real summons bead per finding** persists in the durable record (closed).
  This is the deliberate trade for foreman-compatibility and is a net audit
  positive, but it is one bead per finding rather than none.
- **Idempotency is a planner discipline, not a guarantee.** Running
  `/omg-test-plan` twice on the same epic must not double-wire. See Operational
  Considerations.

### Deferred (named, not designed here)

- **Automatic test planning** gated by a `.workflow.yaml` `test.auto` key — blocked
  on harness support (an agent cannot invoke a slash command; `then`-chaining fires
  unconditionally). When conditional command chaining exists, auto wraps the same
  planner.
- **Formula/molecule extraction** of the recurring shapes (summons→fix,
  design→impl→run) once the hand-wired pattern is proven in `one_agent` mode.
- **Cascading re-planning** across large affected subgraphs.
- **Ephemeral/one-time checkpoint tests** — considered and cut: a failing
  checkpoint has no fixer (the tester does not fix code) without reinventing the
  review loop, and build agents already run throwaway validations natively.
  Revisit if a real gap appears.

## Operational Considerations

**Termination is the operational invariant.** The loop must always drain. The
proof above holds **by construction**: the loop is armed the moment the planner
rewrites `R`'s body, because executing the bead body is how the foreman loop
already works — the reviewer fetches `R` and executes its work order, the same as
every other worker. There is no pending instrument decision the proof waits on;
the only remaining obligation is the planner always closing `y`. The ways it could
wedge, and their guards:

- *The planner forgets to close `y`* → `x` blocks forever. **Guard:** the
  mandatory-close rule is stated explicitly in both the planner agent and the
  `omg-epics` wiring section; the planner's run is not "done" until `y` is closed.
  A `bd ready --parent <epic>` that shows a stuck `omg-test-planner` bead with no
  forward progress is the observable symptom.

v1 uses no ephemeral beads, so no bead can be TTL-compacted out from under an
open dependency.

**Running the planner more than once on the same epic (convergence, not just
idempotency).** The planner's job is framed as a *goal*, not a prohibition: on
every run it **converges the epic onto the correct test state for the graph as it
exists right now.** Re-running is therefore a first-class, *useful* operation — an
epic whose build graph has grown (new build beads, new findings) is re-planned for
the new reality — and a redundant run is a no-op because the graph already matches
the planner's target. This is the same posture the existing `omg-tester` already
holds ("check existing coverage, do not duplicate"), lifted to the planning level.

Concretely, convergence means the planner, on any run:

- Reads the current implementation state of each build bead **and the tests that
  already exist** (as beads and in the suite), then plans from that reality —
  sharpening, not blindly re-adding. It does not re-wire verification that is
  already correctly planned.
- Treats `R`'s test-aware body as already-correct and leaves it as-is (or rewrites
  it to the same content) rather than stacking a second copy of the instructions.
- Treats an already-planned finding (`y` closed, `z` present and correctly wired)
  as settled, and only plans *newly unplanned* work.

Because we cannot enforce this programmatically — the planner is an agent, not a
deterministic function — **this is a discipline expressed in the planner's
instructions, like every other rule in this workflow.** The planner agent and the
`omg-epics` wiring section must tell it, in plain terms, to *survey what exists and
converge*, so that "how many times has this run?" never changes the end state. (Open
Questions §6.)

**In-flight epics.** Because test-awareness is purely "did the operator run the
step," an epic mid-build can have `/omg-test-plan` run against it at any time: the
planner plans whatever build beads exist and rewrites `R`. Beads already built/closed
get post-hoc verification only if the planner wires Case-B style against them and
they have not yet passed review. Findings that arrive *after* the planner ran are
handled by the armed `R` body. An epic on which the step is *never* run behaves
exactly as today. There is no migration and no global state to flip.

**Behavior across the three build modes.** The mechanism was reasoned in
`one_agent`; it holds in `one_agent_fresh_contexts` and the experimental
`multi_agents` mode, with these specifics confirmed against `omg-foreman`:

- **The reviewer is never fanned out.** In all modes the foreman dispatches a
  ready review bead "as its own single invocation" (`omg-foreman` skill). So the
  reviewer's filing of `x`, `y`, and the `y → x` / `R → x` edges all complete
  inside one subagent run *before* the foreman's next `bd ready` pass (the foreman
  collects results, then loops). There is **no window** in which the foreman sees
  `x` after `x` is created but before `y → x` is wired — the wiring is done by the
  time control returns. This is what makes "`y` blocks `x`" reliably serialize
  planner-before-fix even under `multi_agents`.
- **`y`/`x` touch beads, not source.** The summons edge serializes *dispatch
  order*; `y` (planner) writes no source, so no file-clobber concern applies to it.
- **`z`/`x` file-overlap is the pre-existing decomposer discipline, inherited.** In
  `multi_agents` the dependency graph is also the file-concurrency guard
  (`omg-epics`). A test bead `z` and its fix `x` are always serialized to each
  other (Case A: `z → x`; Case B: `x → z`), so the test and the code it verifies
  never land in the same ready wave. But two *different* findings' beads that touch
  the same files must still be wired to block each other — the planner, when it
  mints `z` beads, inherits the same "wire file-sharing beads in sequence" rule the
  decomposer follows. The spec should state this explicitly so the planner does not
  create same-file `z` beads in a parallel wave.

**Observability.** The planner's decisions are visible in the graph: `z` beads
present and wired = planned verification; closed `y` beads with reasons = the
findings-driven planning audit; "no test needed, because…" reasons on `x`/`y` =
the declined-with-cause record. `bd dep tree <epic>` and `bd swarm validate <epic>`
let an operator confirm the wiring and the absence of cycles after a plan run.

**Server-mode note.** Beads runs in server mode here; every `bd` write the planner
and reviewer make lands on the shared Dolt server immediately. The planner must not
run `bd dolt push/pull/commit` (forbidden in server mode), consistent with how all
OMG agents already handle sync.

## Open Questions

1. **Summons bead is real, not ephemeral — RESOLVED.** The summons bead `y` is a
   **real (non-ephemeral) bead**, because `bd ready` hides ephemeral beads and the
   foreman cannot be changed to reveal them. The accepted cost — one closed summons
   bead per finding in the durable record — is preferred over a foreman change (and
   is a net audit positive).

2. **Vocabulary — RESOLVED.** The planner's vocabulary is exactly: two wiring
   shapes of one `agent=omg-tester` bead (Case A design-before-fix, Case B
   run-after-fix) plus a no-bead "no test needed" decision (which absorbs the
   deterministic-gate case). No taxonomy, no scoring. Ephemeral/one-time checkpoint
   tests were considered and cut (see Deferred).

3. **Reviewer-skill alignment — RESOLVED (in scope for build).** Test-aware filing
   steps live **in `R`'s rewritten body**, and the reviewer executes them the same
   way it executes any review bead — the loop is armed by the body rewrite alone,
   because executing a bead's body is the universal foreman-loop contract. The build
   includes a one-section **alignment** of the `omg-review` skill: make explicit, as
   the builder skill already does, that the reviewer **fetches its review bead
   (`bd show <R>`) and executes the work order it finds there**. This adds no
   test-awareness and no branch; the reviewer *agent persona* is unchanged.

4. **Command surface — RESOLVED.** The command is `/omg-test-plan <epic-id>`, at
   `opencode/commands/omg-test-plan.md`, Markdown with frontmatter `description:` +
   `agent: omg-test-planner`, body routing over `$1` (mirrors `omg-decompose.md` /
   `omg-build.md`). No `then:` chain in v1.

5. **`omg-tester` touch — RESOLVED.** The build includes a **one-line**
   acknowledgment on the tester so it honors a pre-planned bead's wiring intent
   (write the failing test for a Case-A bead; author/run the post-fix test for a
   Case-B bead) rather than re-deciding scope. Orientation, not a test-mode branch.

6. **Planner convergence instructions.** The planner is framed to *converge the
   epic onto the correct test state for the current graph* on every run, so
   re-running is useful (re-plan for new build beads/findings) and a redundant run
   is a no-op. This is a **discipline in the planner's instructions, not a
   programmatic guarantee** — consistent with the rest of this workflow, where the
   agent is told to do the right thing rather than constrained to. The spec should
   nail the *survey* the planner performs before wiring (what implementation exists,
   what tests already exist as beads and in the suite) so "sharpen from current
   reality" is concrete, not vague. The signals it can survey — `discovered-from`
   links, a planner-stamped marker, the test-aware-`R` body, existing
   `agent=omg-tester` children — are aids to that survey, not an enforcement
   mechanism. This is the highest-leverage instruction to get right, because a
   poorly-surveyed re-run is the most likely real-world footgun.

7. **Document identity convention — RESOLVED (decision recorded).** This doc keeps
   `id: design.platform.test-planning.0001` at `docs/design/` with `type: design`.
   The bare type segment `design` is the consistent choice: the id grammar uses
   bare type names (`prd`, `adr`, `spec` — never `prd-doc` or `adr-record`), so
   `design` — not `design-doc` — is correct. The repo's existing
   `design-doc.platform.then-chaining-args.0001` is the **anomaly**: its author took
   the *template filename* (`templates/design-doc.md`) as the id's type segment by
   mistake. Two follow-ups (tracked outside this doc, not blocking it):
   - **Migrate** `design-doc.platform.then-chaining-args.0001` →
     `design.platform.then-chaining-args.0001`, moving it from `docs/design-doc/` to
     `docs/design/`, and fix any references to its old id.
   - **Fix the trap at its source** in `doc-templates`: make explicit that a design
     doc's id type segment is `design` (not the template filename `design-doc`), so
     the next author cannot repeat the slip. The `memory_type:` tag has the same gap
     (`hindsight.md` lists no design-doc value; this doc uses `memory_type:design`)
      and should be addressed in the same pass.

## Related Documents

- `prd.platform.test-planning.0001` — the approved PRD; this design's problem
  statement and scope. Honored, including its Non-Goals and Deferred items.
- `omg-tester` agent + `test-writing` skill — the test *writer* the planner
  dispatches to; its confidence-first philosophy is the planner's inheritance.
- `omg-decomposer` agent + `omg-epics` skill — the test-blind decomposer and the
  skill that will hold the new wiring mechanics.
- `omg-reviewer` agent + `omg-review`/`omg-commands` skills — the reviewer that
  executes the test-aware `R` body as data, the same way every worker executes its
  bead. The loop is armed by the planner's body rewrite alone; the only recommended
  edit is a one-section **alignment** of `omg-review` to state explicitly that the
  reviewer fetches and executes its review bead (as the builder skill already does)
  — not a test-awareness change, and the agent persona stays unchanged. See Open
  Questions §3.
- `omg-foreman` agent + `omg-foreman` skill — the label-only dispatcher that must
  not change; the real-summons-bead correction is what keeps that promise.
- `adr.platform.memory-lifecycle.0001` — the immutability/supersession rule that
  permits the planner to edit `R`'s body (mutable until the epic ships) but forbids
  in-place edits to shipped content.
