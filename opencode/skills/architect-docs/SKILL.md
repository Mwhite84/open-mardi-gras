---
name: architect-docs
description: Runbook for producing, reviewing, and refining architecture documents — design docs, ADRs, and specs. Designs a doc from a problem, reviews an existing one with structured findings, or refines one on confirmation. Use when asked to design, architect, propose, review, critique, or improve any architecture or design document.
---

# Architect Docs

This is the architect's runbook for the documents it owns — design docs, ADRs,
and specs — across their whole life: writing one from a problem, reviewing one
that exists, and refining one on request. It is intended for the
**omg-architect** agent. If you are not the omg-architect, do not run this
yourself — delegate the work to the `omg-architect` as a subagent via the Task
tool, and pass along the problem or document and the user's intent.

This skill covers design documents only. For evaluating source code, use the
architect-code-review runbook instead.

## Form and judgment

Two things govern every document, and they live in two places:

- **Form** — the sections and structure — lives in the `doc-templates` skill,
  which is agent-agnostic so every agent produces and checks the same layout.
  Load `doc-templates` and use its `templates/` skeleton when you create a
  document, and check a document against it when you review one.
- **Judgment** — what the *architect* puts into and looks for in each section —
  lives in this skill's `reference/`. Load the matching reference before you
  design, review, or refine:
  - ADR → `reference/adr.md`
  - Spec → `reference/spec.md`
  - Design doc → `reference/design-doc.md`

Identify the document type first, then load both the template (for form) and the
reference (for the architect's judgment). If the type has no template, tell the
user **oc-smith** can author one. If it has no reference, work against the
generic criteria below and tell the user oc-smith can add the architect's
handling notes for that type.

## Three modes

The three modes:

- **Design** — produce a new document from a problem.
- **Review** — evaluate an existing document and report findings. Read-only.
- **Refine** — improve an existing document, but only after the user confirms.

Pick the mode from the user's request. When in doubt between review and refine,
default to review: surface the findings and ask before editing.

## Design mode

Produce a document from a problem. Move through the phases in order — a design
proposed before the problem is understood is a guess.

1. **Establish the problem before any solution.** What must be achieved, for
   whom, and why now. State requirements, constraints, and success criteria
   explicitly. If any are ambiguous or unstated, stop and ask — do not fill the
   gap with an assumption.

2. **Name the binding constraints.** Of correctness, failure modes, scale,
   security, operability, maintainability, and cost, say which dominate *this*
   problem. The dominant constraints drive the design.

3. **Understand the existing system before changing it.** If the design touches
   code or systems that exist, learn how they actually work first. Delegate that
   exploration to the explore or general agents via the Task tool rather than
   designing against an imagined system.

4. **Enumerate candidate approaches.** Produce more than one genuine option. A
   single approach is an assertion, not a decision. Strawmen built only to be
   knocked down do not count.

5. **Weigh tradeoffs honestly.** For each approach, state what it gains and gives
   up against the binding constraints. Apply equal rigor to the option you expect
   to win, the one you expect to lose, and any the user prefers.

6. **Recommend one, with rationale.** Choose, and explain why it wins here. The
   reader should follow the reasoning from constraints to choice without trusting
   you on faith.

7. **Make scope explicit.** What is in, out, and deferred.

8. **Capture it in the right artifact**, using its template for form and its
   reference for the architect's judgment: a single decision and its
   consequences → ADR; a precise definition of what must be built → spec; a
   whole proposed approach with alternatives → design doc.

## Review mode

Evaluate an existing document. Do **not** edit in this mode.

1. **Identify the type and load its template and reference.** Check form against
   the template; judge content against the architect reference, not an imagined
   standard.

2. **Evaluate** against the type's template, its reference, and the generic
   criteria below.

3. **Report findings**, sorted so priority is unmistakable:
   - **Blocking** — issues that make the document wrong, unsafe, or unusable as
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

Every document, regardless of type, is judged on:

- **Clarity** — a competent reader reaches the intended understanding without
  guessing. Ambiguity is a defect.
- **Completeness** — it answers the questions its type is supposed to answer.
  Missing sections, undefined terms, and unstated assumptions are gaps.
- **Sound reasoning** — claims are supported, tradeoffs are named rather than
  asserted, and the conclusion follows from what precedes it.
- **Consistency** — it does not contradict itself, and terminology is used the
  same way throughout.
- **Scope honesty** — what is in, out, and deferred is explicit. A document that
  hides its boundaries invites disputes later.
- **Actionability** — a reader can do something with it: build it, decide on it,
  or sign off. A document that informs but does not enable has missed its job.

## Failure modes to avoid

- **Solution-first.** Reaching for a design before the problem and its
  constraints are nailed down.
- **One option.** Presenting a single approach as inevitable, or surrounding the
  favored one with strawmen.
- **Editing before asking.** In review and refine, the default is to surface
  findings first. Silent edits steal the user's decision.
- **Blurring severity.** A blocking flaw buried among nitpicks reads as a
  nitpick. Keep the tiers separate and ordered.
- **Grading in a vacuum.** Read the reference file before judging against an
  imagined standard.
- **Scope creep on refine.** Change what was agreed and nothing more.
