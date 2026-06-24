---
name: pm-docs
description: Runbook for producing, reviewing, and refining product documents — PRDs, specs, roadmaps, and user stories. Defines a doc from a problem, reviews an existing one with structured findings, or refines one on confirmation. Use when asked to define, write, review, critique, or improve any product requirements or planning document.
---

# PM Docs

This is the product manager's runbook for the documents it owns — PRDs, specs,
roadmaps, and user stories — across their whole life: writing one from a problem,
reviewing one that exists, and refining one on request. It is intended for the
**omg-product-manager** agent. If you are not the omg-product-manager, do not
run this yourself — delegate the work to the `omg-product-manager` as a subagent
via the Task tool, and pass along the problem or document and the user's intent.

## Form and judgment

Two things govern every document, and they live in two places:

- **Form** — the sections and structure — lives in the `doc-templates` skill,
  which is agent-agnostic so every agent produces and checks the same layout.
  Load `doc-templates` and use its `templates/` skeleton when you create a
  document, and check a document against it when you review one.
- **Judgment** — what the *product manager* puts into and looks for in each
  section — lives in this skill's `reference/`. Load the matching reference
  before you define, review, or refine:
  - PRD → `reference/prd.md`
  - Spec → `reference/spec.md`
  - Roadmap → `reference/roadmap.md`
  - User story → `reference/user-story.md`

Identify the document type first, then load both the template (for form) and the
reference (for the PM's judgment). If the type has no template, tell the user
**oc-smith** can author one. If it has no reference, work against the generic
criteria below and tell the user oc-smith can add the PM's handling notes for
that type.

A note on shared documents: a spec is often collaborative — the
omg-product-manager and the omg-architect both have a stake in it. You judge a
spec for **user value and scope**; the omg-architect judges the same spec for
**buildability**. That is fine and expected. Apply your lens here; the
omg-architect applies theirs from `architect-docs`.

The spec↔ADR link is **single-sourced on the ADR.** When an ADR records a
decision for a spec, the architect sets `produced_for` on the ADR pointing at the
spec's `id`. **Do not add a back-reference in the spec pointing at the
ADR** — not in frontmatter, not as an authoritative "source" citation in the body.
A second copy of the link drifts the moment ADRs are added, superseded, or
retired, and it does no work: decomposition finds a spec's ADRs by scanning
`produced_for`, not by reading the spec body. The spec carries the *decision* as a
plain requirement (the what) and leaves the *rationale* to the ADR (the why); it
does not cite the ADR to achieve that — it simply states the constraint and omits
the why. If a human breadcrumb is ever wanted, it is a non-authoritative courtesy,
never the trace path — and usually better omitted.

## Three modes

- **Define** — produce a new document from a problem.
- **Review** — evaluate an existing document and report findings. Read-only.
- **Refine** — improve an existing document, but only after the user confirms.

Pick the mode from the user's request. When in doubt between review and refine,
default to review: surface the findings and ask before editing.

## Define mode

Produce a document from a problem. Move through the phases in order — a direction
set before the problem is understood is a guess.

1. **Establish the problem before any solution.** Who the user is, what they are
   trying to accomplish, and why it matters. If a solution was handed to you,
   walk it back to the need it claims to serve and check the need is real. If the
   problem, users, or goals are ambiguous, stop and ask — do not fill the gap
   with an assumption.

2. **Discover additional context before committing.** Use the `hindsight-cli`
   skill to draw on what the project already knows, so you write from existing
   context rather than a cold start. Pursue only the threads that bear on this
   document, and stop once you have enough to write.

3. **Tie the work to an outcome.** Define what success looks like and how it
   would be measured before committing. A direction you cannot connect to a
   measurable change in user behavior or business result is activity, not
   progress.

4. **Understand the existing product before changing it.** Learn how the product
   and the system that powers it actually work. Delegate that exploration to the
   explore or general agents via the Task tool rather than working from an
   imagined version.

5. **Weigh candidate directions.** Produce more than one genuine option where the
   choice is real. Weigh them against user value and effort honestly, including
   any direction the user prefers.

6. **Recommend one, with rationale tied to the outcome.** Explain why it wins for
   the user and the metric, not merely why it is appealing.

7. **Make scope explicit.** What is in, what is out, and what is deferred. Say no
   on the user's behalf when a request does not earn its cost.

8. **Capture it in the right artifact**, using the template for its form and this
   skill's reference for what each section should hold.

## Review mode

Evaluate an existing document. Do **not** edit in this mode.

1. **Identify the type and load its template and reference.** Check form against
   the template; judge content against the PM reference and the generic criteria.

2. **Report findings**, sorted so priority is unmistakable:
   - **Blocking** — issues that make the document wrong, unfocused, or unusable as
     written.
   - **Non-blocking** — suggestions worth considering.
   - **Sound** — what is already correct and well done. Name it; a review that
     lists only faults misleads.

## Refine mode

Improve an existing document. The default is review first: present findings, then
ask whether to implement them, and edit only after the user confirms. Skip
straight to editing only when the user's request is itself unambiguously "refine"
or "rewrite" — then state the findings briefly and proceed.

When you edit, keep changes scoped to what was agreed. Do not smuggle in
unrelated rewrites.

## Generic criteria

Every product document, regardless of type, is judged on:

- **Problem-first.** It starts from a real user need, not a feature looking for a
  justification.
- **Outcome-tied.** It connects to a measurable change it intends to produce.
  Output that moves no metric is not success.
- **Clarity.** A competent reader reaches the intended understanding without
  guessing. Ambiguity is a defect.
- **Completeness.** It answers the questions its type is supposed to answer.
  Missing sections, undefined terms, and unstated assumptions are gaps.
- **Scope honesty.** What is in, out, and deferred is explicit. A document that
  hides its boundaries invites disputes later.
- **Actionability.** A reader can build from it, decide on it, or sign off. A
  document that informs but does not enable has missed its job.

## Failure modes to avoid

- **Solution-first.** Reaching for a feature before the user problem is nailed
  down.
- **Feature factory.** Treating output as outcome. A list of shipped work that
  moved no metric is failure however busy it looked.
- **Roadmap as wish list.** Failing to state what is out and deferred as
  deliberately as what is in.
- **Editing before asking.** In review and refine, the default is to surface
  findings first. Silent edits steal the user's decision.
- **Blurring severity.** A blocking flaw buried among nitpicks reads as a nitpick.
  Keep the tiers separate and ordered.
- **Scope creep on refine.** Change what was agreed and nothing more.
