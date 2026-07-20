When you execute this review bead, in addition to reading every changed file:

1. **Run the full test suite** (infer the runner from the repo's tooling). Do this
   here, at the review bead, each time this review fires — not per implementation
   bead.
2. **File a finding for every red test and every review finding.** Each finding is
   a bead with `discovered-from:<this-review-bead>` (your own bead's id), stamped
   with its own `agent` label, and it **always blocks** this review bead. Your
   change-locality judgment sets the label, and the label selects the wiring:

   - **Builder-bound** — the failure should be fixed *in this epic* (a defect in
     the changed code). The finding **is** the fix bead: `agent=omg-builder`,
     `--parent <epic> --no-inherit-labels`, `discovered-from:<this-review-bead>`.
     Arm its verification before it is built:
     a. File a summons bead for the confidence planner — **a real bead,
        `--parent <epic> --no-inherit-labels`, NO `--ephemeral`** —
        `agent=omg-test-planner`, `discovered-from:<this-review-bead>`.
     b. Wire the summons to block the fix: `bd dep add <fix> <summons>`.
     c. Wire the fix to block this review bead:
                 `bd dep add <this-review-bead> <fix>`.

   - **PM-bound** — this epic's change reddened a **prior-epic** guarantee. File
     it with the adjudication script, which assembles the adjudication bead for
     the product manager from its canonical body, wires this review bead to wait
     on the ruling, and sets this review bead back to open. Pipe the failing
     run's output in on stdin:

     ```bash
     OMG_CONFIG_DIR="${OPENCODE_CONFIG_DIR:-.opencode}"
     [ -x "$OMG_CONFIG_DIR/skills/omg-misc/scripts/file-adjudication.sh" ] || OMG_CONFIG_DIR=".opencode"
     "$OMG_CONFIG_DIR/skills/omg-misc/scripts/file-adjudication.sh" review <epic> <this-review-bead> <failing-test-selector> <<'EOF'
     <the failing run's output>
     EOF
     ```

     File **no** summons and **no** fix bead yourself — there is no fix until
     the PM decides one is warranted, so the builder-bound hard rules above must
     **not** be applied to it.

3. **Reopen this review bead** if you filed any epic-scoped finding:
   `bd update <this-review-bead> --status open`.

(Out-of-scope findings unrelated to this epic are filed standalone, with no
review-bead dependency.)
