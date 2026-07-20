# Build Mode: `one_agent_fresh_contexts`

One bead at a time, with a **fresh** subagent context each time. Sequential, but every bead starts from a clean context. Dispatch subagents via the `task` tool.

1. Ask what is ready. `bd ready --parent <epic-id> --json`.
2. If the queue is empty, check whether the epic is genuinely done.
  - If it is close-eligible, exit the loop and go follow the directions under "Closing the epic." from this skill.
  - If it is not close-eligible, some child is stranded `in_progress` — recover the orphan by reviewing the docs in this skill at `reference/recovery_path.md`.
3. If the queue is **NOT** empty, select **one** bead that was returned from `bd ready --parent <epic-id> --json` and discover what agent should handle that bead via `bd state <bead-id> agent --json`. That will return the agent name. This name is the only thing that determines routing and a missing name is a defect. If the name is missing, you MUST stop and surface it.
4. Dispatch to that named agent in a brand new subagent session (do not reuse a previous `task_id` from another subagent run). Give the named agent the bead id.

The worker will run to completion and will return a summary. The returned summary is only for your next-move decisions, not the record of truth.

5. Return back to step 1.
  - Newly-unblocked beads may surface on this next pass.
