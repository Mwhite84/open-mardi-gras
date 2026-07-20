# Build Mode: `multi_agents`

Multiple beads in parallel, by multiple agents, all with clean, fresh contexts. Dispatch subagents via the `task` tool.

1. Ask what is ready. `bd ready --parent <epic-id> --json`.
2. If the queue is empty, check whether the epic is genuinely done.
  - If it is close-eligible, exit the loop and go follow the directions under "Closing the epic." from this skill.
  - If it is not close-eligible, some child is stranded `in_progress` — recover the orphan by reviewing the docs in this skill at `reference/recovery_path.md`.
3. If the queue is **NOT** empty, for **EVERY** bead that was returned you will fan out and:
  - discover what agent should handle that bead via `bd state <bead-id> agent --json`. That will return the agent name. This name is the only thing that determines routing and a missing name is a defect. If the name is missing, you MUST stop and surfact it.
  - dispatch to that named agent in a brand new subagent session (do not reuse a previous `task_id` from another subagent run). Give the named agent the bead id.
  - Each subagent will run to completion and will return a summary. The returned summary is only for your next-move decisions, not the record of truth.
4. Once **ALL** of the spawned subagents return, loop back to number 1 above.

Notes: You will fan out by making multiple `task` calls in one turn. For a `bd ready --parent <epic-id> --json` wave of N beads, you will spawn N subagents **concurrently**.

**Experimental:** opencode serializes concurrent `edit`s to the same file but does **not** serialize `write`/`apply_patch`, so two workers touching the same file can clobber each other. The guard is the decomposer's dependency wiring — beads that share files must block each other so they never land in the same ready wave. If you see overlapping-file work in one wave, treat it as a decomposition defect and surface it.
