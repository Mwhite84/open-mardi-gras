# Build Report: <Spec / Epic Name>

> Build report. Records the delta between what an epic's spec planned and what was
> actually built — the deviations, discovered constraints, and decisions made
> during implementation — so memory holds the outcome, not just the plan. Authored
> by the foreman at epic close from the workers' bead comments. Frozen once it
> ships to memory; supersede rather than edit. A report with nothing to record
> stays in Git (no `hindsight` block) rather than adding noise to memory.

## Summary

What the epic set out to build and, in a sentence or two, how closely the build
matched the plan. State plainly whether there were material deviations or it was
built as specified.

## Deviations from the Spec

Each place the implementation departed from what the spec or a bead described:
what was planned, what was done instead, and why. Drawn from the workers' bead
comments — this is the heart of the report.

## Discovered Constraints

Constraints, limitations, or realities the implementation surfaced that the
upstream documents did not anticipate — the kind of thing a future reader of the
spec would otherwise believe was true when it is not.

## Decisions Made During the Build

Choices the workers made mid-build that were not settled upstream, with enough of
the reasoning that they are not relitigated later.

## Discovered Work

Bugs, tech debt, or follow-up filed as beads during the build (in-epic or
standalone), with their bead ids, so the trail from build to follow-up is intact.

## Outcome

The state the epic leaves the system in: what now works, what was deliberately
deferred, and anything a future builder or reviewer should know before touching
this area.
