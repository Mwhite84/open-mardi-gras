---
name: omg-builder
description: Runbook for building a single bead in the OMG workflow — claiming it, implementing what it asks, filing discovered work, commenting what was done, and closing it. Use when implementing a bead the foreman handed you.
---

# OMG Build Procedure

The runbook for building one bead the foreman handed you. You own this bead's
lifecycle from claim to close; the foreman owns dispatch and the epic. The raw
`bd` syntax lives in `omg-commands` — load it for the exact claim/comment/close/
discovered-work flags. This skill is the per-bead procedure on top of it.

The foreman hands you a **bead id**. That is your bead to build, claim to close.

## The procedure

1. **Claim it before you touch code.** `bd update <id> --claim` (atomic: assignee
   + in_progress). Claiming is what keeps two workers from colliding on one bead.
2. **Read the full description.** `bd show <id>`. Understand exactly what the bead
   asks before writing anything.
3. **Resolve your focused done-target from bead metadata — never from test source.**
   Read your own bead's `test_beads` reference, then query each referenced test
   bead's `run_selector`, and note those selectors — that is the exact focused test
   your bead must make pass. Do this through `bd` metadata only (see the **Bead
   metadata** section of `omg-commands`); you do **not** open a test file. If your
   bead carries no `test_beads` reference, it has no focused target — build to the
   description and rely on the review-bead full-suite run as the backstop.
4. **Implement what the description says** — no more, no less. You write only
   implementation; you author, alter, and read no test.
5. **Run only your focused target, and iterate red → green.** Run *only* the
   `run_selector`(s) resolved in step 3 — not the whole suite (the full suite runs
   once at the review bead, not per bead). A red focused test is the normal build
   step: read the output and iterate until it is green. Escalate only if the test
   is genuinely wrong or impossible (see "The escape hatch").
6. **File discovered work immediately.** If you find a bug, tech debt, or other
   work the bead did not name, create a bead for it now. See "Filing Discovered
   Work" in `omg-commands` for the format, type/priority guidance, and the rule
   for whether it goes inside the epic (child + review-bead dependency) or outside
   it (standalone). Note its id — it belongs in your closing comment.
7. **Comment what happened, for the build report.** Before you close, record on
   the bead anything the report-writer will need when it writes the epic's build
   report from these comments — your session will be gone by then, so the bead is
   the only durable record:
   - **Deviations** — any departure from what the bead asked: a different
     approach, a constraint that forced a change, a piece deliberately left out.
   - **Discoveries** — a constraint or reality you hit that the bead/spec did not
     anticipate.
   - **Decisions** — a choice you made that was not settled upstream, with the
     reasoning.
   - **Discovered work** — the ids of any beads you filed in step 6.
   `bd comment <id> "<what changed/was found/was decided and why>"`. If the build
   went exactly as described with nothing notable, a brief "built as specified"
   comment is enough — do not invent deltas.
8. **Close with a reason that says what you did.**
   `bd close <id> --reason "..." --json`. The close reason is the *what*; the
   step-7 comment is the *why it differs / what was learned*.
9. **Report back to the foreman** with a short summary of what you did, so it can
   decide the next move. The durable record is your bead comment (step 7); this
   return is the convenience copy.

## The escape hatch: a genuinely stuck test

A focused test that is *wrong or impossible to satisfy* — not merely unmet — is
the one case you do not iterate on. You **never** edit the test, force it green, or
close the bead silently. Instead you escalate, and escalating has a **mandatory,
non-negotiable shape** because your bead is already claimed (`in_progress`) and
`bd ready` hides `in_progress` beads: skip any step and the epic wedges.

**Classify the failure by run output, never by reading the test.** Match the
failing test's selector (as the runner reports it) against this epic's planned
test beads' `run_selector`s (visible via `bd dep tree --direction up <epic>` and
the test beads' metadata):

- **A wrong planned test** — the failing test is one of *this epic's* planned
  tests (its selector is in those `run_selector`s) and it is wrong or
  impossible. Escalate to the confidence planner.
- **A broken promise** — the failing test is *outside* this epic's planned set: a
  pre-existing test from an earlier epic that your change broke. Escalate to the
  product manager.

**A wrong planned test — file the escalation yourself, all four steps in order:**

1. **File the summons bead** for the confidence planner:
   `agent=omg-test-planner`, `--parent <epic> --no-inherit-labels`,
   `discovered-from:<your-bead>`.
2. **Wire the summons to block your bead:** `bd dep add <your-bead> <summons>` —
   your fix waits on the resolution.
3. **Reset your own bead to the ready queue — mandatory:**
   `bd update <your-bead> --status open --assignee ""`. You had *claimed* it
   (`in_progress`); `bd ready` excludes `in_progress` beads, so without this
   reset your bead never re-enters `bd ready` after the summons closes, and the
   epic wedges. `--status open` is what `bd ready` keys on; clearing the assignee
   keeps a reset-but-still-assigned bead from re-importing a milder version of
   the wedge.
4. **Stop.** Do not touch the test, do not keep hacking at the code. The foreman
   dispatches your summons to the planner, which resolves and closes it; your
   bead, now `open` and unblocked, re-enters `bd ready` and the foreman
   re-dispatches it to a builder with the resolution in hand.

**A broken promise — run the adjudication script and stop.** The script
assembles the adjudication bead for the product manager from its canonical body,
wires your bead to wait on the ruling, and resets your bead to the ready queue —
every mandatory graph step in one call. Pipe the failing run's output in on
stdin:

```bash
OMG_CONFIG_DIR="${OPENCODE_CONFIG_DIR:-.opencode}"
[ -x "$OMG_CONFIG_DIR/skills/omg-misc/scripts/file-adjudication.sh" ] || OMG_CONFIG_DIR=".opencode"
"$OMG_CONFIG_DIR/skills/omg-misc/scripts/file-adjudication.sh" build <epic> <your-bead> <failing-test-selector> <<'EOF'
<the failing run's output>
EOF
```

Note the printed adjudication bead id, then **stop** — do not touch the test, do
not keep hacking at the code. The foreman dispatches the adjudication to the PM;
once the ruling lands, your bead re-enters `bd ready` and the foreman
re-dispatches it to a builder with the ruling in hand.

This is not a special one-off — it is the **dispatch-lifecycle contract** applied
to a pre-claimed bead: every bead you are dispatched, you leave **closed** (done)
or **reopened-and-blocked-by-a-new-bead** (the escape hatch), never `in_progress`,
never reopened-unblocked. A dispatch is a single turn.

## Recovery: picking up a reclaimed bead

If your bead carries a **reclamation comment** (a marker like `RECLAIMED:` — a
prior worker was interrupted mid-bead and the foreman handed it to you fresh),
first check whether the implementation is **already complete** — the prior worker
may have finished the code but died before closing. If it is done, close the bead.
Otherwise pick up the partial work and continue to a clean terminal state (close,
or the escape hatch's reopen-and-block).

## Failure modes to avoid

- **Working unclaimed.** Claim before you code, so two workers never collide on
  one bead.
- **Reviewing your own work.** Review belongs to the reviewer, dispatched
  separately by the foreman. You build and record; you do not grade yourself.
- **Scope drift.** Implement what the bead describes; new work becomes a new bead,
  not a quietly expanded current one.
- **Authoring or editing a test.** You write only implementation. A missing test
  is discovered work you file for the planner's franchise; a wrong test is an
  escape-hatch escalation. Never write, alter, or force-green a test.
- **Reading test source to find your done-target.** Resolve the focused target
  through bead metadata (`test_beads` → `run_selector`) only — never by opening a
  test file — so your bead still works once the test-directory read-deny lands.
- **Running the whole suite per bead.** You run only your focused target; the full
  suite runs once at the review bead, not once per implementation bead.
- **Escalating without the reset.** Step 3 of the wrong-planned-test escalation
  is mandatory (on the broken-promise path the adjudication script performs the
  reset for you); the epic wedges without it.
- **A thin record.** The report-writer bead writes the build report from your
  comments. A deviation, discovery, or decision you leave only in your head is lost
  when your session ends — comment it before you close.
- **Silent deviation.** A bead closed with work that differs from its description
  and no comment saying so leaves a record that lies.
- **Discovered work left in prose.** A concern you only mention is a concern lost.
  If it is worth raising, it is worth a bead, filed the moment you see it.
- **Closing without a reason.** The close reason is the record of what happened;
  an empty one erases the trail.
- **Untracked work.** Everything runs through beads. No TodoWrite, no markdown
  TODO lists.
