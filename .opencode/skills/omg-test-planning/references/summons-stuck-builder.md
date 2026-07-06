Throughout:
- `<summons>` is the bead you were handed
- `<fix>` is the fix bead it concerns
- `<epic>` is the parent epic
all readable from the summons bead and its links.

## Situation 2 — a builder is stuck on a test you planned

Resolve one of two ways, and close the summons in every branch:

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


