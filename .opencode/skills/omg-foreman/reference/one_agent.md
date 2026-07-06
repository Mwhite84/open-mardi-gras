# Build Mode: `ong_agent`

One builder, reused across beads. Dispatch subagents via the `task` tool.

1. Ask what is ready. `bd ready --parent <epic-id> --json`.
2. If the queue is empty, check whether the epic is genuinely done.
  - If it is close-eligible, exit the loop and go follow the directions under "Closing the epic." from this skill.
  - If it is not close-eligible, some child is stranded `in_progress` — recover the orphan by reviewing the docs in this skill at `reference/recovery_path.md`.
3. If the queue is **NOT** empty, select **one** bead that was returned from `bd ready --parent <epic-id> --json` and discover what agent should handle that bead via `bd state <bead-id> agent --json`. That will return the agent name. This name is the only thing that determines routing and a missing name is a defect. If the name is missing, you MUST stop and surface it.
4. Dispatch to that named agent, passing it the bead id.
  - If the agent name is `omg-builder` and this is the first `omg-builder` bead you've come across, you MUST remember the `task_id`.
  - For all subsequent `omg-builder` beads, you MUST reuse the same `task_id`. This is to allow the builder agent to carrier a single, accumulated context of all previous work as it proceeds with new work.
  - For any other named agent (like `omg-reviewer` or `omg-tester`), always use a fresh context. Do NOT reuse `task_id` with any agent other than `omg-builder`.

  The worker will run to completion and will return a summary. The returned summary is only for your next-move decisions, not the record of truth.

5. Return back to step 1.
  - Newly-unblocked beads may surface on this next pass.
