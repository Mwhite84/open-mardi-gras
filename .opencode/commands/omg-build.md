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

Do not send a user-facing response until the epic is closed or an attempted next action has exposed a blocker you cannot recover from, such as a human gate, missing `agent` label, denied permission, or unrecoverable tool failure. A turn boundary by itself is never such a blocker. At that point, report what happened: beads built, findings the reviewer raised and how they resolved.
