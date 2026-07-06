Throughout:
- `<summons>` is the bead you were handed
- `<fix>` is the fix bead it concerns
- `<review>` is the review bead
- `<epic>` is the parent epic
all readable from the summons bead and its links.

## Situation 1 — plan verification for a fix

Decide what verification the fix needs, wire one of the following, and close the summons in every branch:

- **Design the test before the fix** — when the test should be authored first and the fix made to satisfy it. Mint the test, wire it to block the fix:
  ```bash
  bd create "<test for the fix>" --parent <epic> --no-inherit-labels --silent   # → $TEST
  bd set-state "$TEST" agent=omg-tester --reason "Test bead"
  bd dep add <fix> "$TEST"
  bd close <summons> --reason "Test <TEST> designed to block the fix"
  ```

- **Run the test after the fix** — when the fix comes first and a test then confirms it. Mint the test, wire the fix to block it, and wire the test to block the review so the review cannot close over an unverified fix:
  ```bash
  bd create "<test run after the fix>" --parent <epic> --no-inherit-labels --silent   # → $TEST
  bd set-state "$TEST" agent=omg-tester --reason "Test bead"
  bd dep add "$TEST" <fix>
  bd dep add <review> "$TEST"
  bd close <summons> --reason "Test <TEST> runs after the fix, blocks review"
  ```

- **No test needed** — mint nothing; record the reason and close:
  ```bash
  bd close <summons> --reason "No test: <reason>"
  ```


