---
name: omg-test-planning
description: The confidence planner's runbook for planning an OMG epic's verification — the plan pass over an epic, and the build-time resolution of a summons bead. Use when dispatched as omg-test-planner, before touching any bead.
---

# Test planning

Your work has two entry points, and any single dispatch is exactly one of them. Which one is determined by the bead you were handed. The following script will return `plan-pass`, `summons`, or `neither` to inform you which branch to follow.

```bash
bd show <bead> --json \
  | jq -r '.[0] as $b
      | if $b.issue_type == "epic" then "plan-pass"
        elif ([$b.dependencies[]? | select(.dependency_type == "parent-child" and .issue_type == "epic")] | length) > 0 then "summons"
        else "neither" end'
```

- **`plan-pass`** — the bead is an epic. You were dispatched by the decomposer for the **plan pass** over it, and the decomposer also handed you a **mode**: a fresh mint, a refinement pass, or one or more targeted concerns. Read the leaf that matches the mode and follow it:
  - **Fresh mint** — this epic has no test beads yet. Read `references/plan-pass-fresh.md`.
  - **Refinement pass** — you planned this epic before and are being sent back to revisit it. Read `references/plan-pass-refine.md`.
  - **Targeted concerns** — the decomposer's review found one or more specific problems with your verification plan and named them. Read `references/plan-pass-concern.md`.
  - **Mode unclear or missing** — read `references/plan-pass-refine.md`: it reconciles against existing beads before minting, so it is safe whether or not prior work exists.
- **`summons`** — the bead is a child of an epic. You were dispatched by the foreman onto a **summons bead** that exists only to pull you back for one decision. You MUST read `references/summons.md` and follow its instructions.
- **`neither`** — the bead is neither an epic nor a child of one (or the command errored, or the id is not a bead). **Stop and report the problem.** Do not guess which path to run.

## The one thing that wedges the graph

Both paths create and close beads through `bd` via `bash`. On the summons path, the bead you were handed exists only to summon you — and if you leave it open, it blocks the work waiting on it forever. **You close the summons bead in every branch, including the one where you decide no test is needed.** This is the single omitted step that deadlocks an epic; it is never inferred and never deferred. `references/summons.md` spells out the exact close for each case.

Dependency direction throughout: `bd dep add <A> <B>` means "A depends on B / B blocks A" — the blocked bead first, its blocker second.
