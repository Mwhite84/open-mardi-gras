---
description: Wire this repo into the OMG workflow for a given mode (solo|centralized|satellite) and verify the setup
agent: omg-onboarder
---

Onboard this repo into the OMG workflow as: **$1**

`$1` is the repo's role — one of `solo`, `centralized`, or `satellite`. If it is
empty or not one of those, ask me which before proceeding.

Use the `omg-onboard` skill end to end. Work in this order, and do not skip
discovery:

1. **Discover first.** Read any existing `.workflow.yaml`, `.beads/metadata.json`
   and `config.yaml`, and the project `opencode.json` — check **both** the
   worktree-root `opencode.json` and `.opencode/opencode.json`, since opencode
   merges both. Derive everything you can from what is already there; if the on-disk
   `mode` contradicts `$1`, stop and reconcile with me. Ask me only for the genuine
   gaps.
2. **Load the reference for `$1`** and work it: write (or, if you cannot write a
   root file, emit with its destination path) the `.workflow.yaml`, set up beads if
   the mode needs it, and for a satellite the `opencode.json` references and
   external-directory permissions.
3. **Verify the wiring** with the resolver and the mode's verification checks —
   especially, for a satellite, the test write into the central docs tree. Report
   each check as pass or fail with the command you ran.

When done, show me: what you discovered, what you wrote or staged for me to place,
the beads/dolt mode in effect, the verification results, and the immediate
follow-ups. Remind me to restart opencode if you changed config it loads at startup.
