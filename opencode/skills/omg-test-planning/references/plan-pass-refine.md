# Plan pass — refinement

You planned this epic's verification on a prior run. Its test beads and its recorded decisions already exist; the decomposer is sending you back to reconcile them against the spec as it now stands, not to plan from nothing. The cardinal rule of this pass: **reconcile, never re-mint.** A blind re-run would double-create every test bead.

## Recover what you decided

Read the spec the epic carries, then pull the two records of your prior work — the test beads you minted, and the decisions you recorded as comments on the epic:

```bash
bd show <epic> --long --json     # the spec — your source of truth for what must be verified

# your prior test beads
bd children <epic> --json | jq -r '.[] | select(.labels[]? == "agent:omg-tester") | "\(.id)\t\(.title)"'

# your prior recorded decisions — gates, review obligations, no-verification calls
bd comments <epic>
```

Hold the current spec in one hand and your prior decisions in the other. Everything below is a comparison between the two.

## Re-evaluate each prior decision against the current spec

- **A test bead whose behavior the spec still has** — is it still the right verification for that behavior? If the behavior changed, adjust or re-title the bead; if it is still correct, leave it untouched (do not recreate it).
- **A test bead whose behavior the spec dropped** — the spec contracted. Close it: `bd close <test> --reason "Spec dropped this behavior"`.
- **A recorded decision whose rationale still holds** — leave it. Do not restate it.
- **A recorded decision whose rationale the spec has invalidated** — the spec raised the stakes on a behavior you once judged safe to skip (it is now higher-risk, or a gate that used to cover it is gone). Plan it now, exactly as on a fresh mint: weigh what a verification would cost against what the failures it prevents would cost, check whether a cheaper mechanism already covers it, and take the cheapest sufficient means. When that means is a test, mint it:

  ```bash
  TEST=$(bd create "<behavior under test>" --parent <epic> --no-inherit-labels --silent)
  bd set-state "$TEST" agent=omg-tester --reason "Test bead"
  bd comment <epic> "Test for <behavior>: <what the test costs against what its absence would cost>."
  ```

  When it is a **deterministic gate** or a **review obligation**, mint nothing and record it on the epic instead — each is a planned outcome in its own right, not a way of declining:

  ```bash
  bd comment <epic> "Gate for <behavior>: <the gate, and what it catches> — <what it costs against what its absence would cost>."
  bd comment <epic> "Review obligation for <behavior>: <what is read, against what standard> — <what it costs against what its absence would cost>."
  ```

## Catch what the spec grew

Walk the current spec's behaviors and find any that have **neither** a test bead **nor** a recorded decision — a behavior added since your last pass. Decide each as if it were fresh, over the same four outcomes and by the same weighing: mint a test bead for it (as above) once you have checked that no cheaper mechanism already covers it, or record a gate, a review obligation, or a no-verification decision on the epic:

```bash
bd comment <epic> "No verification for <behavior>: <what a verification would cost against what its absence would cost>."
```

## Re-check same-file serialization

After minting or closing, confirm the same-file rule still holds over the current set of test beads. If two test beads would touch the same files, wire them in sequence — one blocks the other in a chosen order (`bd dep add <later> <earlier>`), never a mutual block. Two test beads on the same files must not land in one parallel ready wave, because concurrent workers do not serialize writes to a shared file.

## What you still do NOT do here

- **You do not wire test beads to implementation beads.** The build planner owns that wiring; a refinement run does not change whose job it is.
- **You do not author implementation beads or the review bead.** You reconcile only test beads and the decisions you recorded on the epic.
