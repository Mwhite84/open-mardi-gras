---
description: Run an epic end to end — dispatch its ready queue by label, drive the build/review loop, recover crash-stranded beads, and close the epic. The terminal report is a dispatched bead; nothing ships.
agent: omg-foreman
then: /omg-ensure-work-finished
---

Your epic id for this work is:
**epic id**: `$1`

Your build mode for this epic will be:
**build mode**: !`yq -r '.build.mode // "one_agent"' .workflow.yaml 2>/dev/null || echo one_agent`

Use your `omg-foreman` skill to iterate over the epic. Follow the directions there on how to proceed.

Report what you completed: beads built, findings the reviewer raised and how they resolved.
