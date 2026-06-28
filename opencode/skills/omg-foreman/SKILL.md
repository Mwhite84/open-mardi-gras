---
name: omg-foreman
description: Runbook for the foreman orchestrating an epic — running the ready queue, dispatching each bead to the agent its label names, driving the build/review loop to a close, then writing the build report and shipping the epic and report to Hindsight. Use when orchestrating an epic's execution end to end.
---

# OMG Foreman Loop

The runbook for taking an epic from its ready queue to shipped memory. You
dispatch the work; you do not do it. The raw `bd` syntax lives in `omg-commands`;
epic-level operations live in `omg-epics`; load them as needed. Shipping uses the
`hindsight-cli` skill's references. This skill is the orchestration on top.

## Inputs the kickoff hands you

The command that starts you supplies this value — do not re-derive it:

- **`build_mode`** — one of `one_agent`, `one_agent_fresh_contexts`,
  `multi_agents`. Governs how you spawn builders (see "Build modes").

## The dispatch loop

Work the epic's ready queue until it drains. The queue carries all ordering and
blocking logic — you do not track done-ness or readiness yourself.

1. **Ask what is ready.** `bd ready --parent <epic-id> --json`.
2. **If the queue is empty, the epic may be done.** Go to "Closing the epic."
3. **For each ready bead, read who works it.** `bd state <bead-id> agent` returns
   the agent name (e.g. `omg-builder`, `omg-reviewer`). This label, set at mint,
   is the *only* thing that decides routing — never the bead's title, type, or
   shape. A bead with no `agent` label is a decomposition defect: stop and
   surface it rather than guessing.
4. **Dispatch each bead to the agent its label names**, in the concurrency shape
   `build_mode` dictates (below). Pass the worker the bead id.
5. **Collect results.** Each worker runs to completion and returns a summary.
   The durable record is the worker's **comments on its bead** — the returned
   summary is for your next-move decisions, not the record of truth.
6. **Loop back to step 1.** Newly-unblocked beads — including findings a reviewer
   just filed — surface on this next pass. You did not orchestrate that; the
   queue did.

You never special-case the review bead. When `bd ready` surfaces it, step 3 reads
its label (`omg-reviewer`) and step 4 dispatches it to the reviewer exactly like
any other bead. The reviewer files findings as new child beads (each stamped with
its own `agent` label) and reopens the review bead; those findings become ready
work on your next pass, get built, and eventually the review bead comes ready
again and you dispatch it again. The build/review/fix/re-review cycle is
**emergent from the queue**, not logic you write.

## Build modes

The mode changes only *how* you spawn workers for ready build beads — not the loop
itself. Dispatch via the Task tool.

- **`one_agent`** — one builder, reused across beads. Spawn a builder for the
  first bead; keep the returned `task_id`. For each subsequent bead, re-invoke the
  **same** builder via that `task_id`, handing it the next bead id. One
  accumulating context does all the build work, sequentially. (The reviewer is
  still spawned fresh when a review bead comes ready — context reuse is for the
  builder line.)
- **`one_agent_fresh_contexts`** — one bead at a time, but a **fresh** builder
  each time (no `task_id` reuse). Sequential, but every bead starts from a clean
  context.
- **`multi_agents`** — fan out. For a ready wave of N build beads, spawn N
  builders **concurrently** (multiple Task calls in one turn), each a fresh
  context working one bead. Collect all results before the next `bd ready` pass.
  **Experimental:** opencode serializes concurrent `edit`s to the same file but
  does **not** serialize `write`/`apply_patch`, so two workers touching the same
  file can clobber each other. The guard is the decomposer's dependency wiring —
  beads that share files must block each other so they never land in the same
  ready wave. If you see overlapping-file work in one wave, treat it as a
  decomposition defect and surface it.

In all modes, dispatch a ready review bead to the reviewer as its own single
invocation; do not fan reviewers out.

## Closing the epic

When `bd ready --parent <epic-id>` returns nothing, the queue has drained.

1. **Confirm there is genuinely no open work** (no open children, no reopened
   review bead). `bd epic close-eligible` closes the epic when its children are
   done. Do not force-close over open work.
2. **Synthesize the build report from the bead comments** — see "The build
   report." This is your authoring step, the one piece of work that is yours.
3. **Ship**, in order — see "Shipping."

Workers own their own bead claim/close; you own only the epic close.

## The build report

Once the epic is closed, write a build report capturing the **delta between the
plan and what was actually built** — the deviations, discovered constraints, and
mid-build decisions the workers recorded.

1. **Gather the raw material from the beads, not your memory.** Read the comments
   on every child bead (`bd comments <bead-id>`). The workers filed their
   deviations and notes there; that is your source.
2. **Write the report** using the `doc-templates` `build-report` template. Give it
   a stable `id` minted with `next-id.sh` as `build-report.<domain>.<topic>.NNNN`,
   `type: build-report`, and `produced_for: <spec-id>` linking it back to the spec
   the epic came from. Place it at the path **computed from that `id`** per the
   `doc-templates` "Placing the document" rule (`<docs_base>/build-report/<id>.md`,
   via the resolver). In a satellite repo the resolver lands this in the **central**
   docs tree — the report is written back into shared docs, not the local repo.
3. **Always write the report; ship it only if it carries something worth
   remembering.** If the build genuinely deviated nowhere — built exactly as
   specified — write the report for the human/audit trail but **omit the
   `hindsight` block**, so it stays in Git and does not add noise to memory. If
   there are real deltas worth recalling later, give it a `hindsight` block (tags
   and strategy by judgment from `hindsight.md`, per `doc-templates`).

## Shipping

Ship with the `hindsight-cli` skill's references. Order is not negotiable: the
report describes the epic, so the epic ships first.

1. **Ship the epic** (the frozen authority for the spec) from its bead, following
   `hindsight-cli` → `reference/ship-bead-from-source.md`. The epic is in the
   `hindsight:pending` ship queue; ship it and advance its state to
   `hindsight=shipped`.
2. **Then ship the build report**, *only if* you gave it a `hindsight` block,
   following `hindsight-cli` → `reference/ship-doc-from-tree.md` (it is
   tree-sourced — it never became a bead).
3. **If a ship fails, stop and surface it** with the id and the response. Do not
   continue to the next ship, and do not work around a failure. A clean halt is
   recoverable; a half-shipped epic is not.

## Failure modes to avoid

- **Doing the work.** You dispatch and you author the report — nothing else. No
  implementing, no reviewing, no fixing.
- **Routing by anything but the label.** Title, type, and shape are not how you
  decide who works a bead. `bd state <id> agent` is.
- **Special-casing the review bead.** It is just a labeled bead; the queue and the
  label handle the whole review loop.
- **Tracking state yourself.** Ask `bd ready`; never keep a private done/next
  list.
- **Reporting from memory.** The report is synthesized from bead comments, the
  durable record — not your recollection.
- **Shipping out of order, or over a failure.** Epic before report; a failed ship
  halts the line.
