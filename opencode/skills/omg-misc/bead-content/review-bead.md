When you execute this review bead, in addition to reading every changed file:

1. **Run the full test suite** (infer the runner from the repo's tooling). Do this
   here, at the review bead, each time this review fires — not per implementation
   bead. Exception: if this repo's `.workflow.yaml` sets `test: false`, the repo
   opts out of verification — run no suite, and note the opt-out in the review.
2. **File a finding for every red test and every review finding.** Each finding is
   a bead with `discovered-from:<R>` (`<R>` is this review bead's id), stamped with
   its own `agent` label, and it **always blocks** `R`. Your change-locality
   judgment sets the label, and the label selects the wiring:

   - **Builder-bound** — the failure should be fixed *in this epic* (a defect in
     the changed code). The finding **is** the fix bead `x`, `agent=omg-builder`,
     `--parent <epic> --no-inherit-labels`, `discovered-from:<R>`. Arm its
     verification before it is built:
     a. File the summons bead `y`, **a real bead — `--parent <epic>
        --no-inherit-labels`, NO `--ephemeral`** — `agent=omg-test-planner`,
        `discovered-from:<R>`.
     b. Wire `y` blocks `x`: `bd dep add <x> <y>`.
     c. Wire `R` depends on `x`: `bd dep add <R> <x>`.

     When the repo opts out of verification (`test: false` in `.workflow.yaml`),
     skip `y` — no verification gets planned for the fix — and apply step c only.

   - **PM-bound** — this epic's change reddened a **prior-epic** guarantee (a
     Mode-2 collision). File an adjudication bead `m`, `agent=omg-product-manager`,
     `--parent <epic> --no-inherit-labels`, `discovered-from:<R>`, and wire **`m`
     blocks `R`**: `bd dep add <R> <m>`. File **no** `y` summons and **no** fix
     `x` — there is no fix until the PM decides one is warranted, so the
     builder-bound hard rules above must **not** be applied to it.

3. **Reopen `R`** if you filed any epic-scoped finding: `bd update <R> --status open`.

(Out-of-scope findings unrelated to this epic are filed standalone, with no
review-bead dependency.)
