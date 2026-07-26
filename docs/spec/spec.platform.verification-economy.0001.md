---
schema_version: 1
id: spec.platform.verification-economy.0001
type: spec
title: "Verification Economy — Instrument Language Changes"
status: draft
domain: platform
created_at: 2026-07-26T18:19:55Z
updated_at: 2026-07-26T18:19:55Z
hindsight:
  strategy: spec-or-adr
  tags:
    - source:authored
    - domain:platform
    - discipline:engineering
    - memory_type:spec
---

# Verification Economy — Instrument Language Changes — Spec

> Specification. Defines what the system or component must do, precisely enough
> to be built and verified against.

## Overview

This spec covers the **language-only** half of `prd.platform.verification-economy.0001`:
the changes to instrument prose that need no new mechanism, no bead-graph
topology, no metadata, and no scripts. It is deliberately a per-file change list
rather than an architecture document, because it is meant to be consumed
immediately and then be finished.

It is scoped this way on evidence. The dogfooding failure that produced 7,843
lines of Python verifying 220 lines of Terraform was caused by two things that
are both prose: a confidence planner whose entire vocabulary was "test or
nothing," and a tester instructed that a missing ecosystem guide was a reason to
proceed rather than to stop. Neither needs a mechanism to fix.

The PRD's remaining requirements — fix-round convergence (R6), ruling write-back
(R7), and the repo-local tooling inventory (R11) — need real mechanism and are
out of scope here (see Non-Goals).

**Twelve files change, all Markdown, all under `opencode/`.**

## Requirements

### R1 — The confidence planner gains a proportionality judgment

**File:** `opencode/agents/omg-test-planner.md`

The persona must require that every verification decision weigh the cost of the
verification — to build, to run, and to maintain — against the cost of the
failures it would prevent over the artifact's life, accounting for likelihood,
whether the failure announces itself or fails silently, and whether it can recur
after the epic closes. A verification costing more than the failures it prevents
is not planned, and the reasoning is recorded either way.

**Reconcile the existing anti-ceremony paragraph.** The persona currently reads
"You have no test taxonomy, no type enum, no scoring rubric, no risk matrix,"
which an honest reader takes as forbidding exactly this judgment. It must be
narrowed to reject *test-type taxonomies* and *numeric scoring* while explicitly
permitting reasoned criteria in prose. Do not delete the paragraph — the
restraint it expresses is still wanted. (PRD R1; PRD "Relationship" §1.)

### R2 — The confidence planner's vocabulary expands from two options to four

**File:** `opencode/agents/omg-test-planner.md`

The same paragraph currently states the planner's "entire expressive vocabulary
is a **test bead** or a recorded **no-test decision** — nothing more." That
binary is the direct cause of the invented Python harness: given an artifact
warranting confidence and no test framework to reach for, the only expressible
options were an automated test or nothing.

It must become four: an **automated test**, a **deterministic gate** (compiler,
type checker, linter, validator, schema check, policy check), a **review
obligation** (a reading against a stated standard), and a **recorded
no-verification decision**. Each is a first-class outcome; none is a fallback.
The planner produces confidence by the cheapest sufficient means, which is often
not a test.

**Reconcile the whole persona, not one paragraph.** The binary framing appears
more than once — a separate paragraph declares the planner "as willing to plan
**no** test … as to plan one" and calls a no-test decision "a first-class
outcome," which contradicts a four-outcome vocabulary wherever it survives. Every
sentence in the file that presents the choice as test-or-nothing must be brought
to the four outcomes. A file asserting both is worse than a file asserting
either. (PRD R2.)

### R3 — The plan-pass references carry the expanded vocabulary and record proportionality

**Files:** `opencode/skills/omg-test-planning/references/plan-pass-fresh.md`,
`opencode/skills/omg-test-planning/references/plan-pass-refine.md`,
`opencode/skills/omg-test-planning/references/plan-pass-concern.md`

All three plan-pass references — the planner has three, one per mode, and all
three carry the binary — currently offer a single mint action plus a no-test
comment whose reason menu is "covered elsewhere / mechanical / low-risk / a
deterministic gate already covers it." Two changes:

1. The recorded decision must state the proportionality reasoning from R1 — what
   the verification would cost against what its absence would cost — not only a
   menu selection.
2. The menu's "a deterministic gate already covers it" is currently only an
   excuse to decline. The planner must also be able to *plan* a gate or a review
   obligation as a positive outcome, and must check whether a cheaper mechanism
   already exists before minting a test.

The asymmetry is deliberate to remove: today minting is an action with a code
block and declining is a comment, so the gradient runs one way. All four
outcomes should read as equally available.

**Concern mode needs resolutions for the concerns R9 sends it.** The
concern-mode reference resolves only unverified behaviors, dropped behaviors, and
mis-aimed tests. R9 now routes two more from the decomposer — verification out of
proportion to what it protects, and verification whose mechanism does not fit its
artifact — and neither has a named procedure, so the planner would improvise.
Give each one: the disproportionate case retires the verification or re-plans it
by a cheaper mechanism, and the mismatched case re-plans it as the mechanism that
fits. (PRD R1, R2, R4.)

### R4 — Automated tests target code only, using the ecosystem's own tools

**File:** `opencode/agents/omg-tester.md`

The persona must state that an automated test may be written only for executable
code, and only using the test framework and runner the language and framework
community already provides and conventionally uses. **The workflow never invents
a testing methodology, harness, executor, or assertion framework.** Where no
conventional test tooling exists, that absence is a signal to report back for a
different mechanism — never a problem to solve by building one.

This holds even where an ecosystem's tooling exists but its real cost is
disproportionate: tooling that verifies by provisioning live infrastructure is
available for infrastructure-as-code, and its cost makes deterministic gates the
default there, with tests reserved for a genuinely complex reusable module.
(PRD R3.)

### R5 — Prose is never the subject of an automated test

**File:** `opencode/agents/omg-tester.md`

The existing "Do Not Test" list must gain non-code artifacts: documentation,
runbooks, specifications, and agent instruments are verified by reading, not by
executing. This explicitly includes **code fences embedded in prose** — extracting
and executing a runbook's shell snippets to assert on their behavior is testing
the prose.

It must also state the design finding: where a prose procedure's correctness is
load-bearing enough to warrant executable verification, that is a signal the
procedure should be a **script**, and the tester files that as a finding rather
than testing the prose. A cheap existing gate on prose (a linter, a link checker)
is fine; what is forbidden is an automated test of prose *meaning*. (PRD R4.)

### R6 — A missing ecosystem guide stops the tester instead of licensing invention

**Files:** `opencode/agents/omg-tester.md` (the closing "If no guide fits your
stack, you do not stall" paragraph),
`opencode/skills/test-writing/SKILL.md` (§"When No Guide Exists")

These two passages are the proximate cause of the 7,843 lines. The agent says a
missing guide means "you do not stall — you fall back on the principles you
already hold"; the skill says to inform the user and rely on universal
principles. Together, faced with a Terraform repo, a bead demanding verification,
and Python as the nearest available tool, they authorize building a test
methodology.

Both must be rewritten so that a stack with no conventional test tooling routes
to a **different mechanism** under R4 — a deterministic gate, or a report back to
the confidence planner by the route R10 names — rather than to improvised test
authorship. The distinction to preserve: *no guide for a stack that has test
tooling* means fall back on universal principles and proceed; *no test tooling
for the stack at all* means stop and report. The current text does not
distinguish these. (PRD R3.)

### R7 — The reviewer's testing findings are bounded by proportionality and artifact class

**Files:** `opencode/skills/omg-review/SKILL.md` (§"Categories to examine"),
`opencode/agents/omg-reviewer.md`

The skill's Testing category currently reads "Missing coverage, untested edge
cases, brittle assertions" — unbounded on both plausibility and proportion, and
the only loop in the system that can run more than once. It must be bounded by
the same proportionality test as R1, and by artifact class: missing coverage on
prose or on a declarative artifact is not a finding.

The persona is one-sided in the same way — it hunts "the missing tests" and has
no counterpart for verification that is disproportionate to what it protects.
Add that counterpart, so the reviewer can file a finding for over-verification as
readily as for under-verification. (PRD R1, R4; PRD Problem §4.)

### R8 — A blocking code finding mints a regression test, not a planner summons

**Files:** `opencode/skills/omg-misc/bead-content/review-bead.md` (step 2,
builder-bound branch, sub-steps a–c),
`opencode/skills/omg-review/SKILL.md` (§4, builder-bound bullet)

Today every builder-bound P0/P1 finding files a summons bead for the confidence
planner, which blocks the fix, and the planner then decides whether the fix needs
a test. That decision re-derives a judgment the reviewer already made — priority
already weighs blast radius against fix cost — from less context, at the price of
a bead and a full agent dispatch per finding.

Replace it with a default. The finding mints its fix bead plus a **regression test
bead** (`agent=omg-tester`), authored before the fix so it is observed failing
against the reproducible defect — the only evidence a regression test catches
anything.

**The graph shape is unchanged:** the new bead blocks the fix exactly as the
summons did, and the fix blocks the review bead. Only the label and the body
differ, and one dispatch disappears. No script, metadata, or wiring change.

**This applies only when the finding's subject is code.** When it is prose or a
declarative artifact, R5 governs: no test bead is minted, and the fix-and-review
cycle is itself the verification. (PRD R5.)

### R9 — The decomposer hunts over-verification alongside under-verification

**File:** `opencode/skills/omg-decompose/SKILL.md` (§3, "Hunt the cross-slice
problems")

The seam survey currently hunts two gaps, both in the same direction: a spec
obligation with no test and no recorded decision, and a test bead blocking no
implementation bead. Every quality check in the build loop detects
under-verification and none detects its opposite, which is why the restraint
language elsewhere was outnumbered.

Add the mirror: verification planned out of proportion to what it protects, and
verification whose mechanism does not fit its artifact. The decomposer flags it
and sends it back to the confidence planner exactly as it does any other
test-planner concern — it mints and rewires nothing itself, per the section's
existing discipline.

**Also bring the existing bullets to the four outcomes.** The survey currently
looks for "no test and no recorded no-test decision" and reads the planner's
comments as "no-test decisions." Under R2 a spec obligation may legitimately be
covered by a gate or a review obligation, so a survey that recognizes only tests
and no-test decisions will report a false gap against a behavior that was
properly handled. (PRD Problem §4; PRD R1, R2, R4.)

### R10 — Disproportionate verification is escapable at build time

**Files:** `opencode/skills/omg-test-planning/references/summons-stuck-builder.md`,
`opencode/skills/omg-test-planning/references/summons.md`,
`opencode/skills/test-writing/SKILL.md` (§3, the reopen-and-block branch)

Plan-time proportionality (R1) is judged without the artifact in hand. R10 is the
correction available once the real cost is visible, and it is what gives R4 and
R6 somewhere to send a tester who finds no conventional tooling.

The resolution machinery already exists and already reasons about cost — the
retire branch reads "what the test guards costs less to recover from than the
defense costs to keep." Four gaps to close:

1. **Widen the situation.** It currently fires only when a *builder* is stuck on
   a planned test. It must also fire when the *tester*, while writing a planned
   verification, finds that the verification costs more than the failures it
   would prevent — including the case where making the artifact testable would
   require building test tooling that does not exist.
2. **Name the tester's route.** The tester has a generic reopen-and-block path
   today but nothing tells it this is that case. It must state: file a bead
   labeled `agent=omg-test-planner`, wire it to block your own test bead, reset
   yours to the queue, and stop — the existing dispatch-lifecycle path, applied
   to this trigger.

3. **Repair the triage that routes a summons.** `summons.md` sorts an incoming
   summons into two situations: one asking the planner to plan verification for a
   fix, and one reporting a builder stuck on a planned test. R8 kills the first
   for review findings, and gap 1 above creates an arrival the triage cannot
   classify — a tester-filed escalation. A summons that matches no branch strands
   the bead that waits on it. The triage must route the tester's escalation, and
   must not present a branch that R8 has retired.

4. **Bring the three resolutions to the widened trigger.** They assume a builder
   on the other end and no longer hold universally. **Uphold** ("the builder must
   satisfy it") and **retire** ("the builder is right") must name whoever
   escalated. **Retire** mints a *removal* bead to strip the assertion from the
   suite — correct when a builder is stuck on an existing test, wrong when a
   tester escalates before authoring one, where there is nothing to remove and
   retiring means closing the test bead with the reason recorded instead.
   **Re-plan** gains one option: re-plan the verification as a deterministic gate
   or a review obligation, not only as a corrected test, per R2.

5. **Stop overloading one placeholder for two roles.** The reference names a
   single `<fix>` meaning "the bead waiting on your decision — the builder's fix
   bead, or, when a tester escalated, the tester's own test bead." Those are
   opposite roles: for a builder it is a bead that stays open and waits, and for
   a tester it is the bead being resolved. One name for both is why each branch
   needs a special case and why two were written wrong. Name the two distinctly —
   the bead that waits on the ruling, and the test bead whose verification is in
   dispute — and have each branch say which it operates on. This is the same
   defect the naming conventions in `doc-templates` exist to prevent.

**The invariant every branch must satisfy.** After the planner closes the
summons, no bead involved may be left open with nothing that will ever close it,
and none may be left waiting on a bead that will never come. Two current branches
violate it, both only in the tester case: re-planning as a gate never closes the
tester's test bead, so it blocks its dependant forever; and re-planning as a
corrected test leaves the disputed bead waiting on its own replacement, so a
tester is eventually re-dispatched to write the test just ruled wrong. **Trace
both escalation paths through all three resolutions and confirm the invariant
holds in each of the six.** (PRD R8.)

## Inputs and Outputs

These instruments consume and produce beads, not data. The only shape changes:

| | Before | After |
| --- | --- | --- |
| Planner's recorded outcome | test bead, or a no-test comment | test bead, gate, review obligation, or a no-verification comment carrying proportionality reasoning |
| Builder-bound review finding | fix bead + summons bead (`agent=omg-test-planner`) | fix bead + regression test bead (`agent=omg-tester`), code findings only |
| Decomposer's seam report | under-verification concerns | under- and over-verification concerns |

No bead metadata field is added, removed, or changed. No dependency-edge
direction changes.

## Preconditions and Assumptions

- **Shipped instruments live under `opencode/` and only there.** This repo
  dogfoods the product by pointing `OPENCODE_CONFIG_DIR` at that directory. Do
  not mirror any of these files into `.opencode/`.
- The review bead's canonical body is stamped at plan time. Epics already
  decomposed keep the body they were stamped with; `ensure-terminal-beads.sh`
  does not replace an existing terminal bead's body. R8 therefore applies to
  epics decomposed after it ships, and no migration is required or attempted.
- No instrument outside the twelve files named here needs to change for this spec.
  Notably the foreman is untouched: routing stays label-only, and R8's
  replacement bead routes by its label like any other.

## Error and Edge Behavior

- **A finding whose artifact class is ambiguous** (a templated file that
  generates code; a Markdown file that *is* the product, as in this repo's agent
  instruments): the acting agent judges from what it observes and records the
  judgment with the finding. No new escalation path is introduced for this.
- **A stack with test tooling but no shipped guide** falls back on universal
  principles and proceeds — unchanged from today. Only the *no tooling at all*
  case changes behavior (R6).
- **A regression test that cannot be written** for a code finding uses the
  existing stuck-test escalation; R8 introduces no new failure path, because the
  bead it mints is an ordinary test bead.

## Non-Goals

Deferred to the mechanism half of the PRD, and explicitly **not** in this spec:

- **Fix-round convergence** (PRD R6) — counting rounds per artifact, the bound of
  two, and the ruling that replaces a third fix. Needs graph traversal and a
  ruling route.
- **Ruling write-back** (PRD R7) — landing a resolution on the bead that gets
  re-dispatched. Needs a metadata or body-rewrite mechanism and touches the
  builder, the planner, and the summons references.
- **The repo-local tooling inventory** (PRD R11) — a new artifact, an onboarding
  step, a resolution order, and several readers.
- **The residual-risk register and build-report cost signals** (PRD R9, R10) —
  these change the `build-report` template and what the report-writer bead
  synthesizes; they are small but they are not instrument language.
- Any change to bead topology, metadata, scripts, or foreman routing.
- Any migration of already-decomposed epics.

## Acceptance Criteria

Each maps to one requirement and is checkable by reading the changed file.

- **AC-1** — `omg-test-planner.md` states the proportionality judgment, and its
  anti-ceremony paragraph rejects test-type taxonomies and numeric scoring while
  permitting reasoned criteria. Neither the judgment nor the restraint is absent.
- **AC-2** — `omg-test-planner.md` names four outcomes, and **no sentence
  anywhere in the file still frames the choice as test-or-nothing.** Read the
  whole file and confirm the property, not the absence of one phrase: a file that
  names four outcomes in one paragraph and calls a no-test decision "a first-class
  outcome" in another has not met this criterion.
- **AC-3** — All three plan-pass references let the planner record a gate or a
  review obligation as a planned outcome, and their recorded decisions carry
  proportionality reasoning rather than a bare menu selection. No reference still
  offers only the mint-or-decline pair. Concern mode carries a resolution for
  each concern type R9 routes to it, including the two new ones.
- **AC-4** — `omg-tester.md` forbids inventing test tooling and restricts
  automated tests to code using conventional ecosystem runners.
- **AC-5** — `omg-tester.md`'s "Do Not Test" list names documentation, runbooks,
  specs, agent instruments, and embedded code fences, and carries the
  prose-should-be-a-script design finding.
- **AC-6** — Neither `omg-tester.md` nor `test-writing/SKILL.md` instructs an
  agent to proceed with test authorship when the stack has no conventional test
  tooling; both route to a different mechanism. The has-tooling-but-no-guide case
  still proceeds.
- **AC-7** — `omg-review/SKILL.md`'s Testing category is bounded by
  proportionality and artifact class, and `omg-reviewer.md` can file
  over-verification as a finding.
- **AC-8** — `review-bead.md`'s builder-bound branch mints a regression test bead
  labeled `agent=omg-tester` in place of the planner summons, restricted to code
  findings, with the same two dependency edges as before. `omg-review/SKILL.md`
  agrees with it. No `agent=omg-test-planner` summons remains on the
  review-finding path.
- **AC-9** — `omg-decompose/SKILL.md`'s seam hunt names over-verification and
  artifact-mechanism mismatch, routed back to the confidence planner, **and its
  pre-existing bullets recognize a gate or a review obligation as covering a spec
  obligation** — so a properly handled behavior is not reported as a gap.
- **AC-10** — `summons-stuck-builder.md` fires on disproportionate verification
  as well as on a wrong or impossible test; its three resolutions name whoever
  escalated rather than assuming a builder; retire handles the
  nothing-yet-authored case; its re-plan branch admits a gate or a review
  obligation; `summons.md`'s triage routes a tester-filed escalation and offers
  no branch R8 retired; and `test-writing/SKILL.md` names the tester's route into
  it.
- **AC-10b** — `summons-stuck-builder.md` uses no placeholder that means a
  different bead depending on the branch, and all six combinations of two
  escalation paths against three resolutions leave every bead in a state the epic
  can progress from — none open with nothing to close it, none waiting on a bead
  that never comes.
- **AC-11** — No file under `.opencode/` is added or modified. No script,
  template, or `bd` command changes.

## Open Questions

Both questions raised while drafting were resolved against the instruments before
this spec was finished. Recorded for the trail.

1. **Does the stuck-test escalation need the disproportionality trigger (PRD
   R8)?** *Resolved: yes — pulled into this spec as R10.* It is language-only, so
   it fits the tier. More decisively, R4 and R6 instruct a tester facing a stack
   with no test tooling to report back, and without R10 nothing named the route;
   the requirement would have dangled. `summons-stuck-builder.md`'s resolutions
   already reason about cost, so only the trigger needed widening.

2. **Does `omg-build-planner` need anything here?** *Resolved: no.*
   `omg-build-planning/references/first-pass.md:31` already states "Where the
   planner recorded a no-test decision for a behavior, its implementation bead
   simply carries no test dependency." A gate or a review obligation is that same
   case — an obligation with no test bead to wire — so the existing behavior
   covers it and no sentence is needed.
