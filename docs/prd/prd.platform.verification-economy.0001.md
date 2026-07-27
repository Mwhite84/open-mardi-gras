---
schema_version: 1
id: prd.platform.verification-economy.0001
type: prd
title: "Verification Economy in the OMG Delivery Workflow"
status: draft
domain: platform
created_at: 2026-07-26T03:59:09Z
updated_at: 2026-07-27T00:10:00Z
hindsight:
  strategy: spec-or-adr
  tags:
    - source:authored
    - domain:platform
    - discipline:product
    - memory_type:prd
---

# Verification Economy in the OMG Delivery Workflow — PRD

> Product Requirements Document. Defines the problem, who it is for, and what
> success looks like — not how it is built.
>
> **Status: draft.** Awaiting the architect's buildability pass and a design doc.

## Relationship to `prd.platform.test-planning.0002`

This PRD **amends** `prd.platform.test-planning.0002`; it does not supersede it.
0002 solved *verification ownership* — who decides what to verify, who writes the
test, and in what order — and that solution holds. This document addresses a
dimension 0002 named as a goal and never instrumented: *what verification costs,
and whether it is worth its price*.

Amendment rather than supersession is deliberate. 0002 carries eighteen
requirements, most of them about ownership, the dispatch lifecycle contract,
crash recovery, and the memory-shipping boundary — all unchanged and working.
Restating them to change four things would introduce drift for no gain, and
would itself be an instance of the disproportionate ceremony this document
exists to stop.

**What this PRD changes in 0002:**

1. **Narrows the anti-rubric Non-Goal.** 0002 rejects "test taxonomy, type enum,
   or risk/cost scoring rubric," inherited from 0001. That rejection is correct
   for *test-type taxonomies* (unit/integration/e2e enums) and for *numeric
   scoring*, and both remain rejected here. It was never aimed at decision
   criteria, and as written it forbids the guidance the confidence judgment
   needs. Decision criteria and an expanded evidence vocabulary are now in scope.
2. **Expands the confidence planner's vocabulary** beyond 0002 R3's "test bead or
   recorded no-test decision" (see R2 below).
3. **Retires the review-finding summons** that 0002 R11/R15 established, replacing
   it with a default rather than a per-finding dispatch (see R5 below).
4. **Adds convergence** to 0002's termination property (see R6 below).

**What this PRD leaves standing in 0002:** the three-way plan-time split; the
test-first ordering (R2); the confidence planner's exclusive franchise over
discretionary verification scope (R3); the two writing agents (R5); the two-hop
done-target metadata chain (R7); the focused-per-bead / full-suite-at-review
split (R8); the foreman's routing invariant (R9); the escape hatch for a wrong
planned test and the product-manager adjudication path for a broken prior
guarantee (both R13); the dispatch lifecycle contract (R17); crash recovery
(R18); and the memory-shipping boundary (R16).
Verification remains non-optional (R12) — the "skip verification" opt-out that
0002 deferred stays deferred, and this document argues it should stay dead.

## Problem

The OMG workflow plans verification for every epic, and it has no notion of what
that verification costs. `prd.platform.test-planning.0002` states economy as
Goal 5 — "*Verification stays economical. The point is justified confidence per
test, never count or coverage*" — then implements it in no requirement and
measures it in none of its twelve success metrics. An epic can violate that goal
without tripping a single published signal.

The result is not a theoretical risk. Two dogfooding runs produced it:

- **A Terraform epic** decomposed to roughly fifteen beads and grew to 117. The
  deliverable was ~220 lines of Terraform across six files. What grew around it
  was an 897-line operations runbook and 7,843 lines of Python across seventeen
  test files, roughly seventy-five of the beads orbiting a single runbook section
  and its rollback semantics. The failure it was defending against — a state-only
  removal on a four-resource private estate — recovers with one `terraform
  import`. The loop had not converged when a human stopped it.

- **A repo-wide verification opt-out**, built afterward to escape the first
  failure, removed planning but not the work: nine implementation beads shipped a
  credential leak, a silent query-parameter erasure, and a key-injectivity
  collision feeding an exactly-once gate. All three surfaced only because agents
  improvised unrequested manual probes, leaving no repeatable artifact behind.

These look like opposite failures and share one cause. The workflow can reason
about the cost of a *failure* — the priority scale weighs blast radius
explicitly — and cannot reason about the cost of the *verification*. Asked "does
this behavior warrant verification?", an honest planner answers yes for nearly
every behavior, because in isolation nearly every behavior does. Nothing ever
asks "is this verification worth its weight?", and that is the only question that
bounds the first one.

Four specific harms follow:

- **The evidence vocabulary is binary.** The confidence planner may plan a test or
  decline one. It cannot plan a cheaper mechanism — a compiler, a linter, a
  validator, a policy check, a reading. Faced with an artifact that warrants
  confidence and no test framework to reach for, an agent instructed not to stall
  builds one. That is the 7,843 lines: not weak judgment, missing vocabulary.

- **Nothing states what may be tested.** No document or instrument defines the
  legitimate object of an automated test. Acceptance criteria over a prose
  runbook become test targets, and prose has unbounded surface: every fix adds
  sentences, and every sentence is new material for the next verification pass.

- **The findings loop terminates without converging.** 0002 requires no deadlock,
  no leaked beads, and no unbounded retry, and the Terraform epic satisfied all
  three at every step while running seventy-five beads deep. Each individual step
  terminated. The sequence never converged, because every P0/P1 finding
  mandatorily minted a fix plus a verification-planning dispatch, and each fix
  created fresh surface for the next pass.

- **Decisions are recorded where they are made, not where they are read.** A
  no-verification decision is recorded on the epic; a summons resolution is
  recorded on the summons. Both are consumed by an agent reading its own bead,
  which still says what it said before. A builder that escalates, receives a
  ruling, and is re-dispatched reads an unchanged bead and escalates again. The
  same decision was independently re-derived five times in one epic.

### Why now

- The failure has occurred twice, in different directions, with a fix attempt in
  between that made it worse. The next occurrence is a matter of running another
  epic.
- The correction attempted first — a repo-wide opt-out — is now known to trade a
  visible failure for a silent one, and the branch carrying it has been abandoned.
  This document is the alternative, and it needs to exist before the opt-out is
  reached for again.
- The instruments this repo ships are Markdown. An epic run against this repo
  today meets the same trapdoor that produced the runbook cascade, with the same
  vocabulary and the same absent rule.

## Target Users

The direct users are the **maintainers running the OMG delivery workflow on their
own repos** — the same audience as `prd.platform.test-planning.0001` and `.0002`.
Specifically, the maintainer who points the workflow at a repo that is *not* a
conventional application codebase: infrastructure-as-code, configuration,
documentation, or agent instruments. That maintainer is where both failures
occurred, and a rule tuned only for application code will keep failing them.

The indirect beneficiaries are **the humans who must decide whether to trust a
finished epic.** Today a closed epic reports what was verified and not what was
deliberately left unverified, so a well-judged decline and an oversight are
indistinguishable after the fact.

This PRD does **not** target teams wanting a coverage product, a CI integration,
or a testing-maturity framework.

## Goals

1. **Verification cost is proportionate to the risk it retires.** The judgment
   weighs what the verification costs to build and maintain against what its
   absence would cost, and both sides of that comparison are stated. A
   verification that costs more than the failure it prevents is not planned.

2. **The evidence mechanism fits the artifact.** Confidence is produced by the
   cheapest sufficient means available for the thing in hand — which is often not
   an automated test. The workflow can express a gate or a reading as
   deliberately as it expresses a test.

3. **Automated tests are written only where the ecosystem already supports them.**
   The absence of a test framework for an artifact is a signal to choose a
   different mechanism, never a licence to build one.

4. **The findings loop converges.** Repeated verification passes over the same
   artifact trend toward zero findings, within a bounded number of correction
   rounds. Termination without convergence is not success.

5. **A decision, once made, is not re-derived.** A ruling reaches the agent whose
   work it governs, so no agent re-decides a settled question and no loop
   re-enters on an unchanged bead.

6. **Declined verification is auditable.** Everything the workflow chose not to
   verify is recorded as an accepted risk, so an escaped defect can be classified
   as a risk knowingly taken or a risk never considered.

## Non-Goals

- **Not reintroducing a verification opt-out.** The repo-wide "skip verification"
  mode remains deferred and unbuilt. It addressed this problem by removing the
  judgment rather than informing it, and it is now known to relocate verification
  into unrepeatable manual work. Proportionality subsumes its use case and, unlike
  the flag, leaves a record.
- **Not changing verification ownership, phasing, or test-first ordering.** 0002's
  split, its plan-then-build inversion, and its test-before-implementation
  ordering are unchanged. Tests are still planned and authored before the code
  they verify, including for fixes.
- **Not building a test-type taxonomy or a numeric scoring rubric.** Rejected in
  0001, reaffirmed in 0002, and still rejected. The judgment reasons in prose
  against stated criteria; it does not compute a score, assign a tier, or select
  from an enum of test kinds.
- **Not a per-repo verification policy.** The repo-local inventory (R11) records
  which mechanisms *exist*; nothing configures which decisions get *made*. There
  is no config key or file that decides, on the workflow's behalf, what will or
  will not be verified, and no setting that suppresses the proportionality
  judgment. The distinction is load-bearing: a descriptive inventory that goes
  stale yields imperfect context, while a normative policy that goes stale yields
  a silent, invisible failure — which is exactly how the abandoned opt-out
  behaved.
- **Not a coverage, CI, or merge-gating feature.** No thresholds, no wiring, no
  gates on merge.
- **Not re-deriving the convergence proof here.** Stating the property is this
  document's job; proving the mechanism achieves it belongs to the design doc.
- **Not solving disproportionate *implementation* scope.** The 897-line runbook
  was itself out of proportion to a 220-line deliverable, and this document does
  not address how implementation scope is bounded. It is named in Deferred.

## Success Metrics

Signals observable in the beads graph, the build report, and the shipped
artifacts. Each is chosen so that at least one of the two dogfooding failures
would have tripped it.

- **Verification cost is stated and proportionate.** The build report carries the
  size of the verification artifacts against the size of the deliverable they
  verify. *Signal:* a ratio a reader can see. *Would have caught:* 7,843 lines of
  Python against 220 lines of Terraform.
- **No invented test methodology.** *Signal:* every automated test in a shipped
  epic runs under a test runner the ecosystem already provides; no epic ships a
  bespoke harness, executor, or assertion framework authored to make an artifact
  testable.
- **No automated test targets a non-code artifact.** *Signal:* no test bead's
  subject is prose, documentation, a runbook, or a code fence within one.
- **The loop converges.** *Signal:* no artifact in an epic enters a third fix
  round; one that would produces an explicit ruling on the artifact instead of
  another fix. *Would have caught:* seventy-five beads of successive corrections
  to one runbook section, at roughly the sixth.
- **No decision is re-derived.** *Signal:* no bead re-escalates a question already
  ruled on, and no dispatch independently re-reaches a ruling that already exists
  on unchanged inputs. (A deliberate refinement pass reconsidering a decision
  because the spec moved is the system working, not a violation.)
- **Every epic ships a residual-risk register.** *Signal:* the build report lists
  what was deliberately left unverified and why, and the list is complete against
  the spec's obligations. *Would have caught:* the opt-out epic, which recorded
  nothing while three real defects shipped.
- **An escaped defect is classifiable.** *Signal:* for any defect found after an
  epic closes, the register answers whether that risk was knowingly accepted or
  never considered — the first indicates a threshold to tune, the second a gap in
  the judgment.
- **Findings-driven fixes still carry verification.** *Signal:* every code fix
  arising from a blocking finding has a regression test authored before the fix,
  observed failing, and no fix path escapes verification. This is 0002 R11's
  guarantee, preserved under the cheaper mechanism.

## Requirements

At the level of capability; the mechanism is the design doc's territory.

1. **Proportionality is a required, recorded judgment.** For every verification
   the workflow plans or declines, the judgment weighs the cost of the
   verification — to build, to run, and to maintain — against the cost of the
   failure it would catch, and records both sides. The failure side is not a
   single incident: it accounts for how likely the failure is, how much damage it
   does, whether it announces itself or fails silently, and whether it can recur
   after the epic closes. A verification that costs more than the failures it
   would prevent over the artifact's life is not planned, and the reasoning is
   recorded rather than left implicit. This is the question the workflow currently
   never asks, and it is the bound on every other judgment here.

2. **The confidence planner's vocabulary expands from two options to four.** It
   may plan an **automated test**, a **deterministic gate** (a compiler, type
   checker, linter, validator, schema check, or policy check that mechanically
   proves a property), a **review obligation** (a reading against a stated
   standard, for artifacts no gate or test can judge), or a **recorded
   no-verification decision**. Each is a first-class outcome; none is a fallback
   or an apology. This expands 0002 R3's binary vocabulary and does not disturb
   its franchise: the planner remains the sole owner of discretionary verification
   scope.

3. **Automated tests target code, and use only the ecosystem's own testing tools.**
   An automated test may be planned only for executable code, and only using the
   test framework and runner that the language and framework community already
   provides and conventionally uses. **The workflow never invents a testing
   methodology, harness, executor, or assertion framework.** Where no
   conventional test tooling exists for an artifact, that absence is a signal to
   choose a different mechanism under R2 — never a problem to solve by building
   one. This holds even where an ecosystem's tooling exists but its real cost is
   disproportionate: tooling that verifies by provisioning live infrastructure is
   available for infrastructure-as-code, and its cost makes deterministic gates
   the default there, with tests reserved for a genuinely complex reusable module.

4. **Non-code artifacts get evidence fitted to what they are.** Declarative and
   configuration artifacts are verified by deterministic gates. Prose — runbooks,
   documentation, specifications, agent instruments — is verified by review
   obligation, optionally alongside a cheap existing gate where one applies (a
   linter, a link checker); what prose never gets is an **automated test of its
   meaning**, including tests over its embedded code fences. Where a prose
   procedure's correctness is load-bearing
   enough to warrant executable verification, that is a signal the procedure
   should be a script — a design finding to raise, not a reason to test the prose.
   A prose artifact's verification loop is the review-and-fix cycle itself; it
   requires no additional artifact to prove a reading occurred.

5. **A blocking code finding carries a regression obligation by default; the
   review-finding summons is retired.** When a finding blocks the epic and its
   subject is code, a regression test is minted with the fix at filing time and
   authored before the fix, so it is observed failing against the reproducible
   defect — the only evidence that a regression test catches anything. No separate
   verification-planning dispatch is spent deciding whether to test it: the
   blocking-priority judgment already weighed blast radius against fix cost, and
   re-deciding it from less context is the loop's principal amplifier. When the
   subject is **not** code, R4 governs and no test is minted. This preserves
   0002 R11's guarantee that findings-driven work does not escape verification,
   and strengthens it from a per-finding judgment to a default.

6. **The findings loop converges: repeated fix rounds on one artifact force a
   ruling.** Each time a blocking finding sends work back to material the epic has
   already produced, that is a **fix round** against the artifact that produced
   it, attributable through the discovered-from trail back to the original work
   bead. Rounds accumulate **per artifact**, and successive findings need not be
   related to one another — the signal being detected is *this artifact keeps
   generating work*, not *this fix keeps breaking*. **When an artifact would enter
   a third fix round, the workflow does not mint that fix.** It produces an
   explicit ruling on whether the artifact itself is wrong, because an artifact
   that has already required two rounds of correction is evidence about the
   artifact rather than about the latest finding. The ruling may permit the work
   to continue; what it may not do is happen by default. Past the bound, further
   findings against that artifact are filed outside the epic regardless of
   priority.

   The count is **mechanical and requires no attribution judgment**. Deliberately
   so: a rule asking an agent whether one finding descends from another would
   drift toward "unrelated" — the reading that removes the bound and lets work
   continue — and an uninstrumented judgment is the failure this whole document
   exists to correct. The ruling's routing is the design doc's to specify; the
   bound and the property — convergence, not merely termination — are required
   here.

7. **A ruling reaches the bead it governs.** When any agent resolves a question
   another agent's bead depends on, the resolution is recorded on the bead that
   will be re-dispatched, not only on the bead where the question was raised or on
   the epic. An agent picking up re-dispatched work reads the ruling as part of
   reading its own work order. 0002 R7 already establishes this pattern for
   done-target selectors; this generalizes it from selectors to decisions, and it
   is what stops an agent from re-escalating a settled question against an
   unchanged bead.

8. **Disproportionate verification is escapable at build time.** An agent that
   discovers, while writing a planned verification, that the verification costs
   more than the failure it prevents has a route back to the confidence planner,
   which may uphold, re-plan under a cheaper mechanism (R2), or retire the
   verification. This is the same escape the stuck-builder path already provides
   for a wrong or impossible test, widened from "the test cannot be satisfied" to
   "the test is not worth its price." Plan-time proportionality (R1) is a
   judgment made without the artifact in hand; this is the correction available
   once the real cost is visible.

9. **Every epic produces a residual-risk register.** The verification the workflow
   declined — under R1, R2, R4, R6, or R8 — is recorded as accepted risk: what was
   not verified, and why. The register is complete against the spec's obligations,
   is carried into the build report, and is the artifact that makes a decline
   auditable. A recorded accepted risk that later bites is a threshold to tune; an
   escaped defect absent from the register is a gap in the judgment. Without the
   register the two are indistinguishable, which is the state today.

10. **Verification cost is visible in the build report.** The report states the
    size of the verification artifacts against the size of the deliverable, and
    the fix-round counts that approached or reached R6's bound. Neither is a
    threshold or a gate — they are the signals that let a human see a runaway
    while it is running rather than after 117 beads.

11. **A repo declares its verification tooling in a durable, repo-local
    inventory.** A repo carries a file, at its root and visible to humans, that
    records which verification mechanisms exist in it: the test frameworks and
    runners actually in use, the deterministic gates available, and the stacks
    present that have no conventional test tooling at all. Onboarding creates it;
    every agent that plans, writes, or reviews verification reads it. Three
    properties make it safe:
    - **Descriptive, not normative.** It records what mechanisms are *available*,
      never what an agent should *decide*. An inventory that names no test runner
      for a stack is a fact about the repo, and must not be readable as
      permission to skip verification — R2's other mechanisms still apply, and an
      inventory must never become an opt-out under another name.
    - **Advisory to a judgment that still runs.** The proportionality call (R1)
      and the mechanism choice (R2, R3) are still made and still recorded. A
      stale inventory therefore degrades to imperfect context rather than to a
      silent policy — which is the specific way a configured verification mode
      failed before.
    - **Repo-local, and authoritative over shipped guidance.** It lives outside
      the framework's own instruments, because shipped guidance is replaced when
      the framework updates and repo-specific facts must survive that. Where it
      and a shipped stack guide overlap on tooling, the repo's inventory wins.
      Shipped guides keep their own job: the craft of writing a good test in a
      given language, which is genuinely generic.

## Scope

### In

- Proportionality as a required, recorded judgment on every verification decision.
- The four-option evidence vocabulary: test, deterministic gate, review
  obligation, recorded no-verification decision.
- The code-only rule for automated tests, and the prohibition on inventing test
  tooling.
- Artifact-fitted evidence for declarative artifacts and prose, including the
  prose-needing-execution design finding.
- Regression-by-default on blocking code findings, and retirement of the
  review-finding summons.
- Per-artifact fix-round bounding, and the artifact ruling that replaces a third
  fix.
- Ruling write-back onto the re-dispatched bead.
- Widening the build-time escape from "impossible test" to "disproportionate
  verification."
- The residual-risk register, and its inclusion in the build report.
- Verification-cost and fix-round reporting.
- The repo-local verification tooling inventory, its creation at onboarding, and
  its precedence over shipped stack guidance.
- Narrowing 0002's anti-rubric Non-Goal to test-type taxonomies and numeric
  scoring.

### Out

- Any verification opt-out mode, repo-wide or per-epic.
- Changes to verification ownership, the plan-time split, or test-first ordering.
- Test-type taxonomies, numeric scoring, coverage thresholds, CI or merge gating.
- Per-repo verification *policy* — any setting that decides what will or will not
  be verified, or that suppresses the proportionality judgment. The R11 inventory
  is descriptive and is in scope; a normative policy is not.
- Changes to the foreman's routing invariant.
- The convergence proof itself.

### Deferred (named, not built)

- **Bounding disproportionate implementation scope.** The 897-line runbook was out
  of proportion to its deliverable before any verification was planned against it.
  This document bounds verification cost only; implementation proportionality is a
  separate problem with a different owner and likely its own PRD.
- **Retrofitting the register to closed epics.** The residual-risk register applies
  going forward; reconstructing one for an already-shipped epic is not in scope.
- **Cross-epic verification confidence.** Unchanged from 0002's deferral.
- **A `test:` or verification-mode configuration key in `.workflow.yaml`.** Named
  here explicitly because the abandoned opt-out wrote one, and any residue of it
  should be removed rather than left dormant for rediscovery.

## Open Questions

1. **Does this PRD amend or supersede `prd.platform.test-planning.0002`?** Drafted
   as an amendment, for the reasons stated at the top. The document schema has a
   `supersedes` field and no `amends` field, so the relationship is currently
   carried in prose. Confirm the relationship, and decide whether the schema
   should gain an `amends` field or whether amendment should be expressed some
   other way. This affects how decomposition and the docs→Hindsight sync treat
   two live PRDs in one lineage.

2. **Where does the artifact-class judgment live?** R3 and R4 require knowing
   whether an artifact is code, declarative, or prose. For most artifacts this is
   obvious from the file and its ecosystem; the boundary cases are real (a
   templated config that generates code; a Markdown file that *is* the product, as
   in this repo's agent instruments). Whether this needs stating beyond "judge it
   from what you observe" is a design question.

3. **How is the loop bounded, and at what value?** *Resolved:* by counting **fix
   rounds per artifact**, traced through discovered-from to the originating work
   bead, with the ruling replacing a third round. An earlier draft counted depth
   along a causal chain of related findings; that was rejected because successive
   findings against one artifact are frequently *unrelated to each other* — a
   verify pass re-reading a long runbook keeps surfacing fresh, independent
   problems — so a chain-depth counter reads zero while the artifact grinds on.
   It was also rejected for requiring an attribution judgment ("does this finding
   descend from that fix?") that would predictably drift toward the permissive
   answer. The remaining open point: whether the bound of two is uniform, or
   tighter for prose, whose surface grows with every fix. Note R4 already damps
   the prose case by denying it test beads, which may make a uniform bound
   sufficient.

4. **Who rules when an artifact reaches the bound?** R6 requires an explicit
   ruling on the artifact rather than another fix. The product manager holds
   product intent and already adjudicates broken-prior-guarantee collisions under
   0002 R13, which makes it the natural holder — but "is this artifact wrong?"
   may be an architectural judgment instead. Unresolved.

5. **How do the non-test outcomes of R2 get discharged, and where are they
   recorded so the record survives?** R2 widened what the confidence planner may
   *say* without widening what the system *does* about it, and the gap is
   load-bearing rather than cosmetic. Of the four outcomes, only the automated
   test has an executor: it mints a bead, the bead is dispatched, and it closes.
   A **deterministic gate** and a **review obligation** each produce a comment on
   the epic and nothing else. Nothing mints a bead to run the gate, nothing
   confirms at review that it ran, nothing confirms it exists at all; the review
   bead runs the test suite, which need not include a validator or a linter. The
   danger is not that these outcomes do nothing — it is that they **claim**
   something. "Gate for X: `terraform validate` catches it" reads as coverage, and
   unjustified confidence is precisely what the confidence planner exists to
   prevent.

   Two properties of the current recording make this worse than "unenforced," and
   both were found by diagramming the workflow rather than by reading any single
   instrument:

   - **The record is written where nothing downstream reads it.** These decisions
     are comments on the *epic*. The report-writer bead reads "every *child*
     bead's comments," and the epic is not its own child. So a gate or review
     obligation chosen at plan time is read once, by the decomposer's own
     re-review pass, and then by nothing — not the reviewer, not the build report.
   - **That makes them unauditable, not merely unenforced.** R9 requires a
     residual-risk register that is complete against the spec's obligations. Two
     of the four outcomes currently leave no trace any downstream reader can
     assemble a register from, so R9 cannot be satisfied on top of this recording
     scheme. This is a constraint on the design, not a preference.

   The options are real and they trade off differently: mint a bead for a gate the
   way a test gets one, which buys enforcement at the cost of a dispatch for
   something no agent needs to *decide*; have the review bead read the epic's
   recorded obligations and discharge them, which adds no dispatch because the
   reviewer is already running but widens the reviewer's job; move the record onto
   an artifact the report writer already reads, which fixes auditability without
   touching enforcement; or accept the outcomes as recorded-but-unenforced and
   change the comment's wording so no reader mistakes a plan for coverage.

   This subsumes the narrower question this entry previously asked — whether a
   review obligation that finds nothing should leave a record distinguishable from
   the reviewer's ordinary pass. It is the same problem seen from the reporting
   end, and answering the general question answers it.

   **Whose defect this is:** mine, in R2. Naming that matters, because it is the
   same failure this PRD was written to correct — the prior PRD made economy a
   goal, implemented it in no requirement, measured it with no metric, and it
   evaporated. R2 widened a vocabulary and specified no discharge for three
   quarters of it.

6. **How is the R11 inventory named, shaped, and kept honest?** Its location
   (repo root), its authorship (onboarding), and its precedence over shipped
   guidance are settled. Open: the filename and format; how much onboarding can
   derive by inspecting the repo versus must ask the human; and whether anything
   detects that it has gone stale. The last matters most — a repo whose tooling
   changed and whose inventory did not is the failure mode this requirement is
   most exposed to, mitigated but not eliminated by R11's advisory framing.

7. **Should the residual-risk register ship to Hindsight?** It is the durable
   record of what the project knowingly chose not to verify, which is exactly the
   kind of context a future epic's planner would benefit from. It is also
   potentially large and repo-specific. Reconcile against
   `adr.platform.memory-lifecycle.0001` and the memory-shipping boundary of
   0002 R16.

## Related Documents

- `omg_flowchart.md` (repo root) — a descriptive map of what the instruments
  actually do, drawn after the Tier 1 changes shipped. Open Question 5's recording
  problem was found there rather than in any instrument: it is visible only when
  the plan phase's outcomes and the report writer's inputs are drawn on the same
  page. It also records that nothing bounds the review-fix cycle, which is R6.
- `prd.platform.test-planning.0002` — **amended by this PRD.** Owns verification
  ownership, phasing, the dispatch lifecycle contract, crash recovery, and the
  memory-shipping boundary. This document narrows its anti-rubric Non-Goal,
  expands its R3 vocabulary, retires the review-finding summons of its R11/R15,
  and adds convergence to its termination property.
- `prd.platform.test-planning.0001` — superseded by 0002; the origin of the
  anti-rubric Non-Goal this PRD narrows.
- `design.platform.test-planning.0002` / `spec.platform.test-planning.0002` — the
  design and build contract this amendment will require counterparts to.
- `omg-test-planner` agent + `omg-test-planning` skill — the confidence planner:
  gains the proportionality judgment (R1), the expanded vocabulary (R2), and the
  widened build-time escape (R8); its "no scoring rubric, no risk matrix"
  self-description needs reconciling against R1's criteria.
- `omg-tester` agent + `test-writing` skill — the sole test author: gains the
  code-only rule and the prohibition on inventing test tooling (R3). Its current
  "if no guide fits your stack, you do not stall" instruction is the direct source
  of the invented-harness failure and must be reconciled with R3.
- `omg-reviewer` agent + `omg-review` skill — mints the regression obligation
  directly (R5); its Testing category needs bounding by R1 and R4; carries the
  cost and fix-round signals into the build report (R10).
- `omg-onboarder` agent + `omg-onboard` skill — creates the repo-local
  verification tooling inventory (R11) as part of wiring a repo, alongside the
  `hindsight.md` guidance file it already establishes; the inventory follows that
  file's shape — repo-root, human-visible, author-maintained, surviving framework
  updates.
- `omg-builder` agent + skill — reads rulings from its own bead under R7; unchanged
  otherwise.
- `omg-decompose` skill — supervises the plan for the mirror of the gap it already
  hunts: verification planned out of proportion, not only verification missing.
- `doc-templates` `build-report` template — gains the residual-risk register (R9)
  and the cost signals (R10).
