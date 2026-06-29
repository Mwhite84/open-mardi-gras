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

The foreman hands you a **review bead id**, not the work to do. Your bead body
is your work order, exactly as the builder's bead body is its work order
(`omg-builder` steps 2–3: read the full description with `bd show <id>` and do
what it says). So before the standard steps below, **fetch your review bead and
execute the work order you find there**: `bd show <R>` (the review bead id the
foreman passed), then carry out the standard review steps below **plus any
additional filing steps the bead body names**. The standard procedure is the
default work order; a bead body may carry extra filing steps on top of it, and
you execute those the same way — no differently in kind from the standard steps.

1. **Identify what changed.** Use `git diff` against the branch point, or
   `bd show <epic-id> --json` to understand the scope of the review.
2. **Read every changed file in full.** Do not skim. A skimmed review misses the
   findings that matter.
3. **File a bead for every finding.** As you find each issue, create a bead of
   type `bug` or `chore`, with a priority from the scale below, a description
   that names the file paths and line numbers, and a `discovered-from` link back
   to the review bead. See `omg-commands` for the exact `bd create` flags.
   **Stamp each finding with an `agent` label** (`bd set-state <finding-id>
   agent=omg-builder`) so the foreman can dispatch it when it comes ready — an
   unlabeled finding cannot be routed. Decide where each finding lives:
   - **In the epic's scope** — a defect in the changed code, or something the
     epic cannot honestly ship without: create it as a child of the epic
     (`--parent <epic-id> --no-inherit-labels`, so it does not inherit the epic's
     `hindsight:pending`) and make the review bead depend on it
     (`bd dep add <review-bead-id> <finding-id>`), so the epic cannot close
     over an unfixed finding.
   - **Outside the epic's scope** — pre-existing tech debt or a bug in code the
     epic does not touch: create it standalone, with no parent and no
     review-bead dependency. The `discovered-from` link preserves the trail
     without holding the epic hostage.
4. **Close the review bead, or reopen it.**
   - If you filed no epic-scoped findings, close the review bead with a reason
     that states the count (e.g. "Review complete. Filed N findings, none
     blocking.").
   - If you filed epic-scoped findings, the review bead is now blocked and
     cannot close. Set it back to open
     (`bd update <review-bead-id> --status open`), then report what you filed.
     Control returns to the foreman: the findings you filed are now ready work, so
     the foreman dispatches them to builders, and when they are done the review
     bead comes ready again and the foreman dispatches it back to you for a fresh
     pass. You do not invoke the builder yourself — you file, reopen, and report.

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

- **P0** — Security vulnerability, data loss risk, crash in the happy path.
- **P1** — Correctness bug, missing error handling that causes silent failure.
- **P2** — Performance issue, missing tests for important paths, poor naming.
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
- **Orphaned findings.** Every finding bead carries a `discovered-from` link
  back to the review bead, so the trail from review to work is intact.
- **Misfiled findings.** An epic-scoped finding filed standalone lets the epic
  close over a known defect; an unrelated finding wired to the review bead
  blocks the epic on work that is not its job. The in-scope/out-of-scope call
  decides both, so make it deliberately.
- **Closing a blocked review.** If epic-scoped findings exist, the review bead
  goes back to open and the findings get fixed first — a review closed over its
  own blocking findings defeats the gate.
- **A review bead closed silently.** The closing reason states the finding count
  so the next agent knows the review actually ran.
