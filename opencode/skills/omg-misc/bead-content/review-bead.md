When you execute this review bead, in addition to reading every changed file:

1. **Run the full test suite** (infer the runner from the repo's tooling). Do this
   here, at the review bead, each time this review fires — not per implementation
   bead.
2. **File a bead for every finding; its priority sets its wiring.** Each finding
   is a bead typed to what you found (`bug` for a defect, `chore` for debt or
   polish), with `discovered-from:<this-review-bead>` (your own bead's id) and
   a priority from the `omg-review` skill's scale. A red suite test is never
   below P1 — red means undiagnosed, so you cannot weigh what it costs; the fix
   loop diagnoses it, not you.

   **A P0/P1 finding blocks this review bead.** Stamp its `agent` label; your
   change-locality judgment sets it, and the label selects the wiring:

   - **Builder-bound** — the failure should be fixed *in this epic* (a defect in
     the changed code). The finding **is** the fix bead, and when its subject is
     code it is armed with a regression test authored *before* the fix, so the
     test is observed failing against the reproducible defect:

     ```bash
     FIX=$(bd create "<the defect, and where>" --type <bug|chore> --priority <0|1> \
       --parent <epic> --no-inherit-labels --deps discovered-from:<this-review-bead> --silent)
     bd set-state "$FIX" agent=omg-builder --reason "Fix bead"

     # Only when the finding's subject is code:
     TEST=$(bd create "<the defect this test must catch>" \
       --parent <epic> --no-inherit-labels --deps discovered-from:<this-review-bead> --silent)
     bd set-state "$TEST" agent=omg-tester --reason "Regression test bead"
     bd dep add "$FIX" "$TEST"

     bd dep add <this-review-bead> "$FIX"
     ```

     **When the subject is prose or a declarative artifact**, skip the test bead
     entirely — the fix and this review's next pass are the verification.

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

     File **no** fix bead and **no** regression test bead yourself — there is no
     fix until the PM decides one is warranted, so the builder-bound hard rules
     above must **not** be applied to it.

   **A P2–P4 finding is filed standalone, outside the epic** — no `--parent`, no
   review-bead dependency, no `agent` label, since nothing in this epic dispatches
   it; the `discovered-from` link preserves the trail:

   ```bash
   bd create "<the finding, and where>" --type <bug|chore> --priority <2|3|4> \
     --deps discovered-from:<this-review-bead> --silent
   ```

   A child bead holds this epic open no matter how it is wired, so a finding that
   should not block must not be a child.

3. **Reopen this review bead** if you filed any blocking finding:
   `bd update <this-review-bead> --status open`.

(Findings genuinely unrelated to this epic are filed standalone whatever their
priority.)
