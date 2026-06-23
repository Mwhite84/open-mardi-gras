---
name: omg-builder
description: Runbook for building a single bead in the OMG workflow — claiming it, implementing what it asks, filing discovered work, commenting what was done, and closing it. Use when implementing a bead the foreman handed you.
---

# OMG Build Procedure

The runbook for building one bead the foreman handed you. You own this bead's
lifecycle from claim to close; the foreman owns dispatch and the epic. The raw
`bd` syntax lives in `omg-commands` — load it for the exact claim/comment/close/
discovered-work flags. For dependency operations, load `omg-epics`. This skill is
the per-bead procedure on top of them.

The foreman hands you a **bead id** and the **dolt mode** (`server` or
`embedded`). Both shape what follows.

## The procedure

1. **Claim it before you touch code.** `bd update <id> --claim` (atomic: assignee
   + in_progress). Claiming is what keeps two workers from colliding on one bead.
2. **Read the full description.** `bd show <id>`. Understand exactly what the bead
   asks before writing anything.
3. **Implement what the description says** — no more, no less.
4. **File discovered work immediately.** If you find a bug, tech debt, or other
   work the bead did not name, create a bead for it now. See "Filing Discovered
   Work" in `omg-commands` for the format, type/priority guidance, and the rule
   for whether it goes inside the epic (child + review-bead dependency) or outside
   it (standalone). Note its id — it belongs in your closing comment.
5. **Comment what happened, for the build report.** Before you close, record on
   the bead anything the foreman will need when it writes the epic's build report
   from these comments — your session will be gone by then, so the bead is the
   only durable record:
   - **Deviations** — any departure from what the bead asked: a different
     approach, a constraint that forced a change, a piece deliberately left out.
   - **Discoveries** — a constraint or reality you hit that the bead/spec did not
     anticipate.
   - **Decisions** — a choice you made that was not settled upstream, with the
     reasoning.
   - **Discovered work** — the ids of any beads you filed in step 4.
   `bd comment <id> "<what changed/was found/was decided and why>"`. If the build
   went exactly as described with nothing notable, a brief "built as specified"
   comment is enough — do not invent deltas.
6. **Close with a reason that says what you did.**
   `bd close <id> --reason "..." --json`. The close reason is the *what*; the
   step-5 comment is the *why it differs / what was learned*.
7. **Sync per the dolt mode.** In **`server`** mode, your `bd` writes already
   landed on the server — do **nothing** else (no `bd dolt commit/push/pull`; push
   errors in server mode). In **`embedded`** mode, follow the project's sync
   discipline. See the foreman skill's `reference/dolt-sync.md` if unsure.
8. **Report back to the foreman** with a short summary of what you did, so it can
   decide the next move. The durable record is your bead comment (step 5); this
   return is the convenience copy.

## Failure modes to avoid

- **Working unclaimed.** Claim before you code, so two workers never collide on
  one bead.
- **Reviewing your own work.** Review belongs to the reviewer, dispatched
  separately by the foreman. You build and record; you do not grade yourself.
- **Scope drift.** Implement what the bead describes; new work becomes a new bead,
  not a quietly expanded current one.
- **A thin record.** The foreman writes the build report from your comments. A
  deviation, discovery, or decision you leave only in your head is lost when your
  session ends — comment it before you close.
- **Silent deviation.** A bead closed with work that differs from its description
  and no comment saying so leaves a record that lies.
- **Discovered work left in prose.** A concern you only mention is a concern lost.
  If it is worth raising, it is worth a bead, filed the moment you see it.
- **Closing without a reason.** The close reason is the record of what happened;
  an empty one erases the trail.
- **Running forbidden sync.** In `server` mode, never `bd dolt commit/push/pull` —
  it is wrong and push errors.
- **Untracked work.** Everything runs through beads. No TodoWrite, no markdown
  TODO lists.
