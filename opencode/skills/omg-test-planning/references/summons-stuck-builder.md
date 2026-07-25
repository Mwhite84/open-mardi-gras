Throughout:
- `<summons>` is the bead you were handed
- `<fix>` is the fix bead it concerns
- `<epic>` is the parent epic
all readable from the summons bead and its links.

## Situation 2 — a builder is stuck on a test you planned

Resolve one of three ways, and close the summons in every branch:

- **Uphold the test** — the test is right; the builder must satisfy it. Comment the reasoning on the fix bead, then close:
  ```bash
  bd comment <fix> "Test upheld: <why the test is correct>."
  bd close <summons> --reason "Test upheld"
  ```

- **Re-plan the test** — the builder is right; author a corrected test in its place and wire it to block the fix:
  ```bash
  bd create "<corrected test>" --parent <epic> --no-inherit-labels --silent   # → $TEST
  bd set-state "$TEST" agent=omg-tester --reason "Re-planned test bead"
  bd dep add <fix> "$TEST"
  bd close <summons> --reason "Re-planned as <TEST>"
  ```

- **Retire the test** — the builder is right, and the behavior is not worth defending: what the test guards costs less to recover from than the defense costs to keep. Only the test-writer touches test code, so mint a removal bead and wire it to block the fix — the suite must stop asserting the retired behavior before the fix closes:
  ```bash
  bd create "Retire test: <what it asserts, and why the defense is not warranted>" --parent <epic> --no-inherit-labels --silent   # → $TEST
  bd set-state "$TEST" agent=omg-tester --reason "Test-retirement bead"
  bd dep add <fix> "$TEST"
  bd close <summons> --reason "Test retired: <why the behavior is not worth defending>"
  ```


