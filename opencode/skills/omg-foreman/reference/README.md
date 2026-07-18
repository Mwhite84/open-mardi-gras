This reference directory holds the instructions for multiple `build_mode`s. 

The `multi_agents.md` mode is experimental and there may be concurrency issues when writing files.

Right now it also waits for all subagents in a wave to return, but that isn't strictly necessary. In a future iteration it may be possible to have the agent re-run `bd ready` after any and every subagent returns. The gotcha there is a clearer description of when things are done. If implemented today the way step 2 is worded, if the first bead to return didn't unblock any additional work, then it would think something was wrong because the epic isn't close-eligible yet, and it would start trying to rescue orphans.

Also in the future I may write a custom tool implementation of `edit`/`write`/`apply_patch` that is concurrent safe.
