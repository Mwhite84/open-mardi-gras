---
schema_version: 1
id:            # mint with next-id.sh — never hand-pick (see Minting the `id`)
type: build-report
title:         # human title
status: draft
domain:        # the id's second dotted segment
created_at:    # date -u +"%Y-%m-%dT%H:%M:%SZ" — the real instant, UTC
updated_at:    # refresh on every edit, UTC
produced_for:  # the spec id this report records the build of
hindsight:     # present ⇒ this doc ships to memory; only the user removes this block
  strategy:    # optional bank retain strategy per hindsight.md — delete this line for the bank default
  tags:        # key:value list, chosen by judgment from hindsight.md
---

# Build Report: <Spec / Epic Name>

> Build report. Records the delta between what an epic's spec planned and what was
> actually built — the deviations, discovered constraints, and decisions made
> during implementation — so memory holds the outcome, not just the plan. Authored
> by the foreman at epic close from the workers' bead comments. Frozen once it
> ships to memory; supersede rather than edit. Even a report with nothing to
> record ships: at minimum it records that the spec was built and when the
> build completed.

## Summary

What the epic set out to build and, in a sentence or two, how closely the build
matched the plan. State plainly whether there were material deviations or it was
built as specified, and when the build completed — a real UTC timestamp per the
frontmatter conventions, not a guess.

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
