---
description: follow up command after work to ensure the epic finished and shipped properly
agent: omg-foreman
---

Ensure you followed your previous instructions to completion. By now the epic
should be closed, its build report written, and the epic (and report, if it
carries a `hindsight` block) shipped to Hindsight.

Diagnose against that:
- If the epic is still **open**, the work is not done. Run `bd ready` with the
  epic id as the parent and continue the dispatch loop — dispatch each ready bead
  to the agent its `agent` label names. If the epic is open but nothing is ready,
  something is in progress or blocked; find out why and resolve it, or close the
  epic if it is eligible.
- If the epic is **closed but no build report exists**, write it from the child
  bead comments per the `omg-foreman` skill.
- If the epic is **closed and the report is written but nothing shipped**, ship —
  epic first, then the report if it has a `hindsight` block.
- If a **ship failed**, surface the error with the id and response rather than
  working around it.

Lean on the `omg-foreman` skill for the loop, the closeout, and the shipping
order.
