Throughout:
- `<summons>` is the bead you were handed
- `<bead-awaiting-ruling>` is the bead that waits on your decision and re-enters the ready queue when you close the summons — the builder's fix bead when a builder escalated, the tester's own test bead when a tester did
- `<disputed-test-bead>` is the test bead whose verification is in dispute — when a builder escalated it is a *different* bead, already closed, its assertion standing in the suite; when a tester escalated it is the **same bead** as `<bead-awaiting-ruling>`, still open, never authored, nothing of it in the suite
- `<epic>` is the parent epic
all readable from the summons bead and its links.

## Situation 2 — a test you planned is wrong, impossible, or not worth its cost

Two escalations arrive here, and they are the same decision: is this verification still warranted, and in this form?

- **A builder is stuck on a test you planned.** It judges the test wrong or impossible — not merely unmet — and has escalated it back to you.
- **A tester, writing a verification you planned, finds it costs more than it prevents.** The verification's cost to build, to run, and to maintain outweighs the failures it would prevent — including the case where making the artifact testable would mean building test tooling that does not exist, which the tester never does.

Resolve one of three ways, and close the summons in every branch:

- **Uphold the verification** — the verification is right, and whoever escalated must satisfy it. Comment the reasoning on the bead that waits on you, then close the summons; that bead unblocks and comes back to whoever escalated — the builder makes the code meet the test, or the tester writes the verification as planned. `<disputed-test-bead>` needs nothing from you on either path: a builder's is already closed with its assertion standing, and a tester's *is* the bead you just commented, returning to the queue to be written as planned.
  ```bash
  bd comment <bead-awaiting-ruling> "Verification upheld: <why it is correct, and what it protects>."
  bd close <summons> --reason "Verification upheld"
  ```

- **Re-plan the verification** — the escalation is right; plan the correct verification in its place. Both the form it takes and which bead carries it depend on who escalated.

  **A corrected test, and a builder escalated** — `<disputed-test-bead>` is closed and its wrong assertion is in the suite, so the replacement must both carry the corrected verification and strip the one it supersedes; only the test-writer touches test code. Author it and wire the bead waiting on you to block on it:
  ```bash
  bd create "<corrected test>, replacing the assertion <disputed-test-bead> left in the suite" --parent <epic> --no-inherit-labels --silent   # → $TEST
  bd set-state "$TEST" agent=omg-tester --reason "Re-planned test bead"
  bd dep add <bead-awaiting-ruling> "$TEST"
  bd close <summons> --reason "Re-planned as <TEST>"
  ```

  **A corrected test, and a tester escalated** — `<disputed-test-bead>` *is* `<bead-awaiting-ruling>`, and nothing was ever written: there is no assertion to supersede and no bead to replace. Mint nothing. Re-aim the bead you already have, which keeps every edge already wired to it, then close the summons so it re-enters the queue and a tester writes the corrected verification:
  ```bash
  bd update <disputed-test-bead> --title "<corrected test>" --description "<the corrected verification, and why the planned one was wrong>"
  bd comment <disputed-test-bead> "Re-planned in place: <what the escalated verification cost against what the corrected one costs>."
  bd close <summons> --reason "Re-planned in place on <disputed-test-bead>"
  ```
  Never mint a replacement and block `<bead-awaiting-ruling>` on it here: on this path that makes the disputed bead wait on its own replacement, and once the replacement lands the disputed bead unblocks and a tester is dispatched to write the very test you just ruled wrong.

  **A gate or a review obligation instead of a test, and a builder escalated** — record the outcome on the epic; then deal with the assertion `<disputed-test-bead>` left in the suite, which the builder still cannot pass and which the gate or the reading now supersedes. Mint no test bead — mint a removal bead, exactly as retiring does, and wire the bead waiting on you to block on it:
  ```bash
  bd comment <epic> "Re-planned <behavior> as <the gate, or what is read against what standard>: <what the test cost against what it protects>."
  bd create "Retire test: <what <disputed-test-bead> asserts>, now covered by <the gate / the review obligation>" --parent <epic> --no-inherit-labels --silent   # → $REMOVAL
  bd set-state "$REMOVAL" agent=omg-tester --reason "Test-retirement bead"
  bd dep add <bead-awaiting-ruling> "$REMOVAL"
  bd close <summons> --reason "Re-planned as <a gate / a review obligation>"
  ```

  **A gate or a review obligation instead of a test, and a tester escalated** — `<disputed-test-bead>` *is* `<bead-awaiting-ruling>`, nothing was authored, and no tester will ever be sent to write it. Mint nothing, and close that bead yourself with the reasoning: left open it waits on a dispatch that will never come and blocks whatever depends on it forever.
  ```bash
  bd comment <epic> "Re-planned <behavior> as <the gate, or what is read against what standard>: <what the test would have cost against what it protects>."
  bd close <bead-awaiting-ruling> --reason "Re-planned as <a gate / a review obligation>: no test bead stands in its place"
  bd close <summons> --reason "Re-planned as <a gate / a review obligation>"
  ```

- **Retire the verification** — whoever escalated is right, and the behavior is not worth defending: what the verification guards costs less to recover from than the defense costs to keep. How you retire it depends on whether the assertion exists yet.

  **The test is already in the suite** — a builder escalated, so `<disputed-test-bead>` is closed and what it asserted is written. Only the test-writer touches test code, so mint a removal bead and wire the bead waiting on you to block on it — the suite must stop asserting the retired behavior before that bead closes:
  ```bash
  bd create "Retire test: <what <disputed-test-bead> asserts>, <why the defense is not warranted>" --parent <epic> --no-inherit-labels --silent   # → $REMOVAL
  bd set-state "$REMOVAL" agent=omg-tester --reason "Test-retirement bead"
  bd dep add <bead-awaiting-ruling> "$REMOVAL"
  bd close <summons> --reason "Test retired: <why the behavior is not worth defending>"
  ```

  **Nothing has been authored yet** — a tester escalated before writing the verification, so `<disputed-test-bead>` *is* `<bead-awaiting-ruling>` and there is no assertion to strip. Mint no removal bead: record the reasoning on the epic and close that bead with it, then close the summons:
  ```bash
  bd comment <epic> "Verification for <behavior> retired unwritten: <what it would have cost against what it protects>."
  bd close <bead-awaiting-ruling> --reason "Verification retired before authoring: <why the behavior is not worth defending>"
  bd close <summons> --reason "Verification retired before authoring"
  ```

Before your run ends, check both beads against the rule every branch above is built to keep: **nothing is left open that nothing will ever close, and nothing is left waiting on a bead that will never come.** On a builder's escalation `<bead-awaiting-ruling>` stays open and must be either unblocked or blocked only on a bead you just minted; on a tester's escalation it is `<disputed-test-bead>` itself, so it is either unblocked for a tester to write or closed by you — never left open with the verification it carried planned away.


