---
name: omg-foreman
description: Runbook for the foreman orchestrating an epic — running the ready queue, dispatching each bead to the agent its label names, and recovering crash-stranded beads. Use when orchestrating an epic's execution end to end.
---

# OMG Foreman Loop

The runbook for draining an epic's ready queue to completion. You dispatch the work; you do not do it.

- The raw `bd` syntax lives in the `omg-commands` skill
- Epic-level operations live in `omg-epics` skill
- This `omg-foreman` skill is the orchestration on top

## Run start: scan for orphans before dispatching anything

**Before** you dispatch anything on a fresh run, scan for orphaned beads left `in_progress` by a prior interrupted run:

```
bd list --parent <epic> --status in_progress --json
```

Because you have not dispatched any beads yet this run, any `in_progress` child is **orphaned by definition** — it can only be a leftover from a prior run that crashed or was killed. You need to recover any orphans before you do anything else. When you need to recover orphans you must review the docs in this skill at `reference/recovery_path.md`

## The dispatch loop

Work the epic's ready queue until it drains. The queue carries all ordering and blocking logic — you do not track done-ness or readiness yourself.

You loop until the epic closes or you are demonstrably unable to perform the next required action. A human gate, a missing `agent` label, a denied permission, or an unrecoverable tool or platform failure can prevent that action. Inability must be evidenced by a failed or forbidden next action, not inferred from how long the turn feels or from a desire to report progress.

The assistant turn is not a workflow boundary. A non-empty ready queue is an absolute bar to sending a response or otherwise yielding control to the user. If you can call `bd ready` or dispatch another worker, do so in the same turn. "I cannot continue in this turn," "resume on the next turn," and similar statements are not valid halts without an actual failed or forbidden next action.

To understand the dispatch loop, you need to read the relevant details based on the **build mode**. You can find the details in the reference directory of this skill at `reference/<build mode>.md`

## Closing the epic

The epic has no closing ceremony. The terminal work to finish things up is wired into the bead graph and dispatched like all other work.

When `bd ready --parent <epic-id> --json` returns no beads, the epic may be done. Running `bd epic close-eligible --json` will close the epic if its children are done. It will return a json response with the list of epics closed and the total count.

### Drain-time scan

Ensure that the json response includes the epic id in the response. Otherwise you may have agents that failed to close beads. This is the second detection point (the run-start orphan scan is the first). You can verify if there are beads that need to be recovered with the command you used above:

```
bd list --parent <epic> --status in_progress --json
```

If there are any beads returned then review the doc in this skill at `reference/recovery_path.md`. Only load that file when you need to recover `in_progress` beads.

## Failure modes to avoid

- **Treating the turn boundary as a stop.** If `bd ready --parent <epic> --json` returns a bead, dispatch it in the same turn. Do not announce an inability to continue unless attempting the next required action exposed a real blocker.
- **Reading a worker's summary as a stop signal.** A worker that reports failure, blocked work, or "remaining findings" has not ended the epic; its summary is not the record of truth. You re-consult `bd ready` and trust the graph — the block, if real, will show there. "You do not push past failure" means you do not paper over a failed dispatch, not that you halt because a worker's prose sounded unfinished.
- **Doing the work.** You dispatch — nothing else. No implementing, reviewing, fixing, authoring the report, or shipping.
- **Routing by anything but the label.** Title, type, and shape are not how you decide who works a bead. `bd state <id> agent` is.
- **Re-dispatching a twice-failed bead.** One automatic retry, then human-gate. Read the `RECLAIMED:` marker before recovering; a bead already marked and again `in_progress` gets gated, not re-dispatched.
- **Treating a drain-time strand as a halt or an orphan.** It is neither — it goes through the same recovery path; only the diagnostic note differs.
- **Special-casing the review bead.** It is just a labeled bead; the queue and the label handle the whole review loop.
- **Tracking state yourself.** Ask `bd ready`; never keep a private done/next list.
