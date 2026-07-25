# Plan pass — refinement

You planned this epic's verification on a prior run. Its test beads and no-test decisions already exist; the decomposer is sending you back to reconcile them against the spec as it now stands, not to plan from nothing. The cardinal rule of this pass: **reconcile, never re-mint.** A blind re-run would double-create every test bead.

## Recover what you decided

Read the spec the epic carries, then pull the two records of your prior work — the test beads you minted, and the no-test decisions you recorded as comments on the epic:

```bash
bd show <epic> --long --json     # the spec — your source of truth for what must be verified

# your prior test beads. Closed ones are excluded: bd children lists all
# statuses, and a closed test bead is settled history, not part of the plan —
# a behavior whose only test bead is closed reads as having no test bead.
bd children <epic> --json | jq -r '.[] | select(.status != "closed") | select(.labels[]? == "agent:omg-tester") | "\(.id)\t\(.title)"'

# your prior no-test decisions
bd comments <epic>
```

Hold the current spec in one hand and your prior decisions in the other. Everything below is a comparison between the two.

## Re-evaluate each prior decision against the current spec

- **A test bead whose behavior the spec still has** — is it still the right verification for that behavior? If the behavior changed, adjust or re-title the bead; if it is still correct, leave it untouched (do not recreate it).
- **A test bead whose behavior the spec dropped** — the spec contracted. Close it: `bd close <test> --reason "Spec dropped this behavior"`.
- **A no-test decision whose rationale still holds** — leave it. Do not restate it.
- **A no-test decision whose rationale the spec has invalidated** — the spec raised the stakes on a behavior you once judged safe to skip (it is now higher-risk, or a gate that used to cover it is gone). Mint the test now, exactly as on a fresh mint:

  ```bash
  TEST=$(bd create "<behavior under test>" --parent <epic> --no-inherit-labels --silent)
  bd set-state "$TEST" agent=omg-tester --reason "Test bead"
  ```

## Catch what the spec grew

Walk the current spec's behaviors and find any that have **neither** a test bead **nor** a no-test comment — a behavior added since your last pass. Decide each as if it were fresh: mint a test bead for it (as above), or record a no-test decision for it:

```bash
bd comment <epic> "No test for <behavior>: <reason — covered elsewhere / mechanical / low-risk / a deterministic gate already covers it>."
```

## Re-check same-file serialization

After minting or closing, confirm the same-file rule still holds over the current set of test beads. If two test beads would touch the same files, wire them in sequence — one blocks the other in a chosen order (`bd dep add <later> <earlier>`), never a mutual block. Two test beads on the same files must not land in one parallel ready wave, because concurrent workers do not serialize writes to a shared file.

## What you still do NOT do here

- **You do not wire test beads to implementation beads.** The build planner owns that wiring; a refinement run does not change whose job it is.
- **You do not author implementation beads or the review bead.** You reconcile only test beads and no-test decisions.
