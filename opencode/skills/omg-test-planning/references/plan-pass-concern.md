# Plan pass — targeted concerns

The decomposer reviewed the whole plan, found one or more problems with the verification you planned, and sent them to you in words. Your job is those named problems — not a re-plan. The plan is otherwise sound; touch only what the concerns implicate, and leave everything else exactly as it is. Work through each concern the decomposer listed; resolve every one before you report back.

## Understand the concerns

Each concern is a supervisor's observation at the level of the whole plan — a behavior that looks unverified with no recorded reason, or a test that looks like it covers nothing real. Each is a question for you, the SME who decides *what gets verified and why*. The decomposer flagged the smell; you decide the resolution.

The concerns you receive are always about the **existence and rationale of tests** — never about wiring a test to an implementation bead. That wiring is the build planner's job and is not yours to touch, on this pass or any other.

Ground each concern against the spec and the current beads before you act:

```bash
bd show <epic> --long --json                                              # the spec, to check a behavior
bd children <epic> --json | jq -r '.[] | "\(.id)\t\((.labels // []) | join(","))\t\(.title)"'   # the current beads
bd comments <epic>                                                        # your prior no-test decisions
```

## Resolve them, and nothing else

Act on each concern with the smallest correct change:

- **A behavior is verified by nothing and no reason is recorded** — decide it now. Either mint the test:

  ```bash
  TEST=$(bd create "<behavior under test>" --parent <epic> --no-inherit-labels --silent)
  bd set-state "$TEST" agent=omg-tester --reason "Test bead"
  ```

  or record the deliberate no-test decision as a comment on the epic:

  ```bash
  bd comment <epic> "No test for <behavior>: <reason — covered elsewhere / mechanical / low-risk / a deterministic gate already covers it>."
  ```

- **A test bead covers a behavior the spec does not have** — the behavior was dropped or the test was mis-aimed. Close it: `bd close <test> --reason "<behavior> is not in the spec"`.

- **A test bead is aimed at the wrong behavior** — re-title or replace it so it verifies the behavior the spec actually names.

If, on inspection, a concern names something already handled — a behavior you consciously declined to test, with the reason already recorded — report that for it rather than inventing a change. Do not mint a duplicate.

## Same-file serialization

If a concern led you to mint a test bead that touches files another test bead touches, wire them in sequence — one blocks the other in a chosen order (`bd dep add <later> <earlier>`), never a mutual block. Two test beads on the same files must not land in one parallel ready wave, because concurrent workers do not serialize writes to a shared file.

## Report back

Report what you changed and why, concern by concern — a minted test, a closed test, a recorded no-test decision, or "already satisfied." The decomposer reads this to decide whether the build planner must reconcile against a changed test set.
