---
name: omg-review
description: Runbook for performing a thorough code review in the OMG workflow and filing a bead for every finding. Covers the review process, the categories to examine, the priority scale, and how to file and close findings. Use when reviewing code changes or working a review bead.
---

# OMG Code Review

The runbook for reviewing code changes and filing a bead for every finding. The
raw `bd` command syntax lives in the `omg-commands` skill — load it too, and use
it for the exact create/close/link flags. This skill is the review-specific
procedure on top of it.

## Process

The foreman hands you a **bead id**, not the work to do. Your bead body is your
work order, exactly as the builder's bead body is its work order (`omg-builder`
steps 2–3: read the full description with `bd show <id>` and do what it says). So
before the standard steps below, **fetch your bead and execute the work order you
find there**: `bd show <id>`, then carry out the work order. Two different beads
come to you by the same `agent=omg-reviewer` label — recognize which you are on:

- The **review bead** — you review the changes and run the findings loop
  (below). Its static body carries the full-suite run and the finding-filing steps
  on top of the standard review procedure; you execute those the same way, no
  differently in kind.
- The **terminal report-writer bead** — a *different* bead, blocked behind the
  review bead. You write the build report and stop (see "The report-writer
  bead").

1. **Identify what changed.** Use `git diff` against the branch point, or
   `bd show <epic-id> --json` to understand the scope of the review.
2. **Read every changed file in full.** Do not skim. A skimmed review misses the
   findings that matter.
3. **Run the full test suite** (when the review bead's body directs you to).
   Infer the runner from the repo's tooling. You run the whole suite *here, at
   the review bead*, each time this review fires — not per implementation bead.
   Read pass/fail and file a finding for each red test, the same as any review
   finding. You need **no** knowledge of test mode, of which tests are this
   epic's planned test beads, or of any test's source to do this — you run a
   command, read the result, and file. Your judgment stays blind to test mode.
4. **File a bead for every finding; its priority sets its wiring.** As you find
   each issue (a red suite test, or a review observation), create a bead typed
   to the finding (`bug` for a defect, `chore` for debt or polish), priority
   from the scale below, a description naming file paths and line numbers, and
   a `discovered-from` link to the review bead.
   Every finding is filed — priority decides whether it blocks this epic:

   - **A red suite test is never below P1.** Red means undiagnosed: you do not
     know why it fails, so you cannot weigh what the failure costs. File it
     blocking and let the fix loop diagnose it — if the test rather than the
     code turns out to be wrong, the builder's escalation paths route it to the
     planner or the PM.
   - **A P0/P1 finding blocks the review.** Stamp an `agent` label — your
     **change-locality judgment** sets it, and the label selects the wiring:
     - **Builder-bound** — the failure should be fixed *in this epic* (a defect
       in the changed code). The finding is a fix bead (`agent=omg-builder`),
       armed with a summons bead (`agent=omg-test-planner`): the summons blocks
       the fix, and the fix blocks the review. This is the ordinary findings
       loop.
     - **PM-bound** — this epic's change reddened a **prior-epic** guarantee.
       The finding is an adjudication bead for the product manager, filed with
       the `file-adjudication.sh` script (the exact call is in the review
       bead's body), which wires the review to wait on the ruling. You file no
       summons and no fix — there is nothing to fix until the PM decides one is
       warranted; the PM's bead carries its own work order.
   - **A P2–P4 finding is filed standalone, outside the epic** — no `--parent`,
     no review-bead dependency; the `discovered-from` link preserves the trail.
     A child bead holds its epic open no matter how it is wired, so a finding
     that should not block must not be a child.

   You **label-and-block** — you do not build either subgraph beyond
   filing-and-wiring the finding. (A finding genuinely unrelated to this epic —
   pre-existing tech debt in untouched code — is filed standalone whatever its
   priority.) The exact `bd` flags and the full wiring for each case are carried
   in the review bead's own body, stamped from the canonical review-bead block at
   plan time.
5. **Close the review bead, or reopen it.**
   - If you filed no blocking findings, close the review bead with a reason
     that states the counts (e.g. "Review complete. Filed 3 standalone
     findings, none blocking.").
   - If you filed blocking findings, the review bead is now blocked and
     cannot close. Set it back to open
     (`bd update <review-bead-id> --status open`), then report what you filed.
     Control returns to the foreman: the findings you filed are now ready work, so
     the foreman dispatches them to builders, and when they are done the review
      bead comes ready again and the foreman dispatches it back to you for a fresh
      pass. You do not invoke the builder yourself — you file, reopen, and report.

## The dispatch-lifecycle contract

Working either bead, you leave it in **exactly one** of two states before you
return: **closed** (the review passed with no blocking findings; or the report
is written) or **reopened-and-blocked-by-a-new-bead** (you filed blocking
findings and reopened the review bead, which the findings now block). Never leave
the bead `in_progress`; never reopen it unblocked. A dispatch is a single turn.

## The report-writer bead

The report-writer bead is a *different* bead from the review bead, blocked behind
it, dispatched to you by the same `agent=omg-reviewer` label once the review
closes. Execute its static body: read every
child bead's comments (`bd comments <id>`), synthesize the build report with the
`doc-templates` `build-report` template, write it to the docs tree at the
resolver-computed path, and **stop**. You perform **no** Hindsight ship, you close
no other bead, you touch no other work — writing the report is the whole job.
Give the report a `hindsight` block — every report ships, even one with nothing
to record: at minimum it records that the spec was built and when the build
completed. Only the user removes the block.

## Categories to examine

Work through each area systematically — a finding can come from any of them:

- **Correctness** — Does the code do what the spec says? Are there logic errors?
- **Security** — Input validation, auth checks, data exposure, injection risks.
- **Performance** — Unnecessary allocations, N+1 queries, missing indexes, hot
  loops.
- **Error handling** — Missing error cases, swallowed errors, unclear messages,
  missing cleanup on failure paths.
- **Refactoring** — Duplication, overly complex logic, poor naming, functions
  doing too many things.
- **Testing** — Missing coverage, untested edge cases, brittle assertions.
- **Documentation** — Missing or outdated comments, unclear interfaces,
  undocumented assumptions.

## Priority scale

Priority measures blast radius — what the failure costs if it reaches
production, weighed against the cost of fixing it now — not how alarming the
code looks.

- **P0** — Security vulnerability, data loss risk, crash in the happy path.
- **P1** — A correctness bug in what this epic promises, or a failure whose
  recovery costs more than the fix. *P1:* a checkout that charges the wrong
  amount; an import that drops rows with no record of what was lost. *Not P1:*
  an error swallowed on a rare path whose recovery is re-running one command —
  that is a P2, however alarming it looks in the code.
- **P2** — Performance issues, missing tests for important paths, poor naming.
- **P3** — Style issues, minor refactoring, documentation gaps.
- **P4** — Nits, suggestions, nice-to-have improvements.

## Failure modes to avoid

These are procedural traps in the filing itself — the disposition behind them
(read in full, don't fix, don't inflate priority) is the reviewer's, not this
runbook's.

- **Findings without location.** Every bead names the file and line so the work
  agent can act without re-hunting.
- **Unfiled findings.** A finding mentioned only in prose is a finding lost. If
  it is worth raising, it is worth a bead.
- **Misfiled findings.** A blocking-grade finding filed standalone lets the
  epic close over a known defect; a below-bar or unrelated finding filed as a
  child holds the epic hostage, because a child bead blocks its epic's closure
  no matter how it is wired. The priority call and the scope call decide the
  filing, so make both deliberately.
- **Closing a blocked review.** If blocking findings exist, the review bead
  goes back to open and the findings get fixed first — a review closed over its
  own blocking findings defeats the gate.
