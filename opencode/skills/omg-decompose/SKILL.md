---
name: omg-decompose
description: The decomposer's runbook for driving an OMG epic's plan phase — dispatching the planners, authoring the review and report-writer beads, and validating the graph. Use when dispatched as omg-decomposer via /omg-decompose, before touching any bead.
---

# Decompose

You have been handed an **epic id** and a **mode** — a fresh mint or a refinement pass (a re-run over an epic you already decomposed). Drive the plan phase over that epic in the fixed order below. The epic carries the spec it was minted from and its ADR beads already exist — work entirely off the epic. Verification planning is standard; the one way out of it is explicit — the mint report carries a **Verification: opted out** line when the repo sets `test: false` in its `.workflow.yaml`, and steps 1 and 3 branch on that line.

Pass the mode through to the planners, whose fresh and refinement procedures differ. Your own terminal-bead procedure does not branch on it: reconcile the graph from what actually exists so an interrupted prior run can resume safely.

## 1. Dispatch the confidence planner

Hand the epic id and your mode to `omg-test-planner` as a subagent, and wait for it to return. It owns the test beads.

**When the mint report says the repo opted out of verification**, do not dispatch the planner at all. Run the deterministic converger instead:

```bash
OMG_CONFIG_DIR="${OPENCODE_CONFIG_DIR:-.opencode}"
[ -x "$OMG_CONFIG_DIR/skills/omg-misc/scripts/ensure-test-opt-out.sh" ] || OMG_CONFIG_DIR=".opencode"
"$OMG_CONFIG_DIR/skills/omg-misc/scripts/ensure-test-opt-out.sh" <epic>
```

It is idempotent: it records the blanket no-test decision once, deletes every test-planning child left from a pass before the repo opted out (dependency edges go with them, so nothing stays blocked by a deleted test), and strips the now-stale `test_beads` stamps from the surviving children. On failure it stops loud — surface the message rather than redoing its graph surgery by hand.

## 2. Dispatch the build planner

Hand the epic id and your mode to `omg-build-planner` as a subagent, and wait for it to return. It owns the implementation beads and wires each to the test that proves it.

## 3. Supervise the plan and send back what does not fit

Both planners have returned. You are accountable for the plan as a whole — so review it at the level only you can see: the **seams between** the two planners' outputs, not the calls inside either one. You do not mint, close, re-wire, or rewrite a bead here; when you find a problem you flag it and send it back to the planner that owns it. Fixing is the SME's job.

Survey the epic's children and the no-test decisions the confidence planner recorded as comments:

```bash
bd children <epic> --json | jq -r '.[] | "\(.id)\t\(.issue_type)\t\(.status)\t\((.labels // []) | join(","))\t\(.title)"'
bd comments <epic>
```

Hunt the cross-slice problems neither planner could catch from its own beads:

- **A spec obligation with an implementation bead but no test and no recorded no-test decision** — a gap between the planners. Verification was neither planned nor consciously declined.
- **An open test bead that blocks no implementation bead** — the test proves a behavior nothing implements, or the build planner missed the wiring. (A closed test bead is settled history, not a seam.)

In an opted-out epic the blanket comment is the recorded no-test decision for every obligation, so the first seam cannot fire; the seam to hunt instead is **any test-planning child at all** — a bead labeled `agent:omg-tester` or `agent:omg-test-planner`, whatever its status. Step 1's converger should have deleted them, so re-run it rather than dispatching anyone.

Group every problem you find by the planner that owns it, then send back — **test planner first, because the build planner's wiring depends on the test set**:

1. **Test-planner concerns** → dispatch `omg-test-planner` in **targeted-concern** mode with the batched list, and wait. Read its report of what it changed (a minted or closed test, or "no change — already satisfied").
2. **Build planner** — two independent triggers, each its own dispatch, in this order when both fire:
   - **The test planner changed the test set** (minted or closed a test) → dispatch `omg-build-planner` in **refinement** mode so it reconciles its wiring against the new tests. This fires on any test-set change even if you found no build concern.
   - **You have named build concerns** → dispatch `omg-build-planner` in **targeted-concern** mode with the batched list, to fix those specific seams.
   - If neither trigger holds, do not dispatch the build planner.

Then **re-review** the settled graph from the top of this step. A fix can open a new seam; loop until a review pass finds nothing. Only then go on.

## 4–5. Ensure and reconcile the terminal beads

Converge the epic onto exactly one review bead and one report-writer bead: the review depends on every work child, the report-writer depends on the review, and nothing depends on the report-writer — it is the last thing to run. The `ensure-terminal-beads.sh` script does this idempotently — run it with the epic id:

```bash
OMG_CONFIG_DIR="${OPENCODE_CONFIG_DIR:-.opencode}"
[ -x "$OMG_CONFIG_DIR/skills/omg-misc/scripts/ensure-terminal-beads.sh" ] || OMG_CONFIG_DIR=".opencode"
"$OMG_CONFIG_DIR/skills/omg-misc/scripts/ensure-terminal-beads.sh" <epic>
```

On success it prints the two terminal bead ids (`review: <id>` / `report: <id>`). On failure it stops loud with a message naming the problem and any bead ids involved — surface it to the user, or fix the named condition (e.g. close a duplicate Review bead) and re-run.

The script never replaces the body of an existing terminal bead during reconciliation: it may carry execution history or deliberate corrections. The canonical body is used when creating a missing bead; the stable title, agent state, and graph position identify and repair an existing one.

## 6. Validate the graph

Run `bd swarm validate <epic>` (confirms no cycles) and `bd dep tree --direction up <epic>` (a visual check — `--direction up` is required to show the epic's full tree). Confirm the shape holds: the review bead depends on every open work child, the report-writer bead depends on the review bead, and nothing depends on the report-writer bead — it is the last thing to run.

Then show the final structure and stop for review.
