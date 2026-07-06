---
name: omg-decompose
description: The decomposer's runbook for driving an OMG epic's plan phase — dispatching the planners, authoring the review and report-writer beads, and validating the graph. Use when dispatched as omg-decomposer via /omg-decompose, before touching any bead.
---

# Decompose

You have been handed an **epic id** and a **mode** — a fresh mint or a refinement pass (a re-run over an epic you already decomposed). Drive the plan phase over that epic in the fixed order below. The epic carries the spec it was minted from and its ADR beads already exist — work entirely off the epic. Verification planning is standard and non-optional.

Steps 1, 2, 3, and 6 are the same in either mode. The review and report-writer beads (steps 4–5) are where fresh and refinement diverge — a fresh pass creates them; a refinement pass finds and reconciles them so nothing is duplicated. When you reach step 4, read the one reference that matches your mode and follow it for steps 4 and 5:

- **Fresh mint** → `references/fresh.md`
- **Refinement pass** → `references/refinement.md`

## 1. Dispatch the confidence planner

Hand the epic id and your mode to `omg-test-planner` as a subagent, and wait for it to return. It owns the test beads.

## 2. Dispatch the build planner

Hand the epic id and your mode to `omg-build-planner` as a subagent, and wait for it to return. It owns the implementation beads and wires each to the test that proves it.

## 3. Supervise the plan and send back what does not fit

Both planners have returned. You are accountable for the plan as a whole — so review it at the level only you can see: the **seams between** the two planners' outputs, not the calls inside either one. You do not mint, close, re-wire, or rewrite a bead here; when you find a problem you flag it and send it back to the planner that owns it. Fixing is the SME's job.

Survey the epic's children and the no-test decisions the confidence planner recorded as comments:

```bash
bd children <epic> --json | jq -r '.[] | "\(.id)\t\(.issue_type)\t\((.labels // []) | join(","))\t\(.title)"'
bd comments <epic>
```

Hunt the cross-slice problems neither planner could catch from its own beads:

- **A spec obligation with an implementation bead but no test and no recorded no-test decision** — a gap between the planners. Verification was neither planned nor consciously declined.
- **A test bead that blocks no implementation bead** — the test proves a behavior nothing implements, or the build planner missed the wiring.

Group every problem you find by the planner that owns it, then send back — **test planner first, because the build planner's wiring depends on the test set**:

1. **Test-planner concerns** → dispatch `omg-test-planner` in **targeted-concern** mode with the batched list, and wait. Read its report of what it changed (a minted or closed test, or "no change — already satisfied").
2. **Build planner** — two independent triggers, each its own dispatch, in this order when both fire:
   - **The test planner changed the test set** (minted or closed a test) → dispatch `omg-build-planner` in **refinement** mode so it reconciles its wiring against the new tests. This fires on any test-set change even if you found no build concern.
   - **You have named build concerns** → dispatch `omg-build-planner` in **targeted-concern** mode with the batched list, to fix those specific seams.
   - If neither trigger holds, do not dispatch the build planner.

Then **re-review** the settled graph from the top of this step. A fix can open a new seam; loop until a review pass finds nothing. Only then go on.

## 4–5. Author or reconcile the review and report-writer beads

Read the reference for your mode (above) and follow it. It handles the review bead and the report-writer bead — creating them on a fresh pass, finding and reconciling them on a refinement pass.

## 6. Validate the graph

Run `bd swarm validate <epic>` (confirms no cycles) and `bd dep tree <epic>` (a visual check). Confirm the shape holds: the review bead depends on every open work child, the report-writer bead depends on the review bead, and nothing depends on the report-writer bead — it is the last thing to run.

Then show the final structure and stop for review.
