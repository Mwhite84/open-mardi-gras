---
name: architect-code-review
description: Runbook for reviewing source code as an artifact from an architectural standpoint — correctness, failure modes, security, and operability. Read-only: produces findings, never edits code. Use when asked to review, critique, or assess code (not a document).
---

# Architect Code Review

This is the architect's runbook for evaluating **source code** — not documents.
It is intended for the **omg-architect** agent. If you are not the omg-architect,
do not run this yourself — delegate the work to the `omg-architect` as a subagent
via the Task tool, and pass along the code and the user's intent.

This review is **read-only**. The architect never modifies code. You produce
findings; you do not edit, refactor, or fix. There is no refine mode here — that
is the deliberate difference from the architect-docs runbook, which can edit
the documents it reviews. If the user wants changes implemented, say so and let
them route the work to an implementing agent.

You review code from an **architectural standpoint**: structure, correctness,
failure behavior, security, and operability. You are not a linter and not a style
checker. Leave formatting, naming conventions, and micro-style to the tools and
agents that own them, unless they actively obscure correctness.

## Steps

1. **Establish what the code is meant to do.** Review against intent, not against
   an imagined ideal. If the purpose, requirements, or constraints are unclear,
   ask before grading.

2. **Read enough to judge in context.** A function is not correct or incorrect in
   isolation — it is correct relative to its callers, its data, and its failure
   surface. Delegate broad codebase exploration to the explore or general agents
   via the Task tool when you need surrounding context.

3. **Evaluate against the criteria** below.

4. **Report findings**, sorted so priority is unmistakable:
   - **Blocking** — defects that make the code wrong, unsafe, or unfit to ship:
     correctness bugs, security holes, data loss, unhandled failure on a path
     that matters.
   - **Non-blocking** — improvements worth considering that do not block.
   - **Sound** — what is correct and well built. Name it; a review that lists
     only faults misleads.

   For each finding, point to the specific location and explain *why* it is a
   problem — the failure it leads to — not merely that it offends a rule.

## Criteria

- **Correctness.** Does it do what it is meant to do, including at the edges?
  Off-by-one, wrong condition, mishandled empty or null, race, incorrect
  assumption about ordering or atomicity.
- **Failure modes.** What happens when a dependency is down, input is malformed,
  a call times out, or a limit is hit? Unhandled errors, swallowed exceptions,
  partial failure that leaves inconsistent state.
- **Security.** Untrusted input reaching a sensitive sink, missing authz checks,
  secrets in code or logs, injection surfaces, unsafe deserialization.
- **Concurrency and resources.** Shared state without synchronization, leaks of
  connections, file handles, or memory, unbounded growth, deadlock potential.
- **Operability.** Can this be observed and debugged in production? Adequate
  logging at the right level, metrics where they matter, failures that surface
  rather than hide.
- **Structural soundness.** Does the code's structure match its responsibility —
  or is complexity, coupling, or abstraction present that no requirement buys?

## Failure modes to avoid

- **Editing the code.** This skill is read-only. You report; you do not fix.
- **Style-checking instead of reviewing.** Formatting and naming nitpicks are not
  architectural findings. Stay on correctness, failure, security, operability.
- **Blurring severity.** A blocking defect buried among nitpicks reads as a
  nitpick. Keep the tiers separate and ordered.
- **Judging in isolation.** Grading a snippet without the caller, the data, or
  the failure surface that determines whether it is actually correct.
- **Findings without a "why".** "This is wrong" is not a review. State the
  failure it produces so the reader can weigh it.
