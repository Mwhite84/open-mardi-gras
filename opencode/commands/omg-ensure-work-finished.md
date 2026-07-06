---
description: follow up command after work to ensure the epic finished — its queue drained, its terminal beads dispatched, and the epic closed
agent: omg-foreman
---

Ensure you followed your previous instructions to completion. By now the epic's
ready queue should be drained and the epic closed.

Diagnose against that:
- If the epic is still **open**, the work is not done. Run `bd ready` with the
  epic id as the parent and continue the dispatch loop — dispatch each ready bead
  to the agent its `agent` label names. If the epic is open but nothing is ready,
  something is in progress or blocked; find out why and resolve it, or close the
  epic if it is eligible.
- The terminal report is the `P` bead's job, not yours. If it has not yet been
  dispatched or closed, it is a ready bead you dispatch by label like any other —
  **never** write the report yourself.

Lean on the `omg-foreman` skill for the loop and crash recovery.
