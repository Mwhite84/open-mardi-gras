Throughout:
- `<summons>` is the bead you were handed
- `<fix>` is the fix bead it concerns
- `<behavior>` is what that fix restores or corrects — the subject of whatever you record
- `<review>` is the review bead
- `<epic>` is the parent epic
all readable from the summons bead and its links.

## Situation 1 — plan verification for a fix

The product manager adjudicated a broken promise, ruled that the prior guarantee still stands, and minted `<fix>` to honor it. You decide by what means that fix is verified.

Before you choose, look for the mechanism the repo already runs — a compiler, type checker, linter, validator, schema check, policy check. Confidence you already have is confidence you do not pay for twice. Then weigh whatever you would plan against what it prevents: what it costs to build, to run, and to maintain for as long as the artifact lives, against how likely the failures it catches are, whether such a failure announces itself or fails silently, and whether it can recur after this epic closes.

Four outcomes are open to you and none is a fallback for the others. Record the one you choose as a comment on `<epic>` carrying that reasoning — never a bare label — because the decomposer's survey reads `bd comments <epic>`, not close reasons, and a decision recorded only on the summons is one it will report as an unverified obligation. Close the summons in every branch.

- **An automated test** — the fix is executable code and a test is the cheapest sufficient means. Two orderings are open to you, and choosing between them is about when the assertion must exist, not about mechanism.

  **Designed before the fix** — when the test should be authored first and the fix made to satisfy it. Mint the test, wire it to block the fix, and record it:
  ```bash
  bd create "<test for the fix>" --parent <epic> --no-inherit-labels --silent   # → $TEST
  bd set-state "$TEST" agent=omg-tester --reason "Test bead"
  bd dep add <fix> "$TEST"
  bd comment <epic> "Test for <behavior>: authored before the fix — <what the test costs against what its absence would cost>."
  bd close <summons> --reason "Test <TEST> designed to block the fix"
  ```
  End state: `$TEST` is ready and dispatches to a tester; `<fix>` waits only on it and unblocks when it closes; `<review>` waits on `<fix>` as the adjudication already wired it.

  **Run after the fix** — when the fix comes first and a test then confirms it. Mint the test, wire the fix to block it, wire the test to block the review so the review cannot close over an unverified fix, and record it:
  ```bash
  bd create "<test run after the fix>" --parent <epic> --no-inherit-labels --silent   # → $TEST
  bd set-state "$TEST" agent=omg-tester --reason "Test bead"
  bd dep add "$TEST" <fix>
  bd dep add <review> "$TEST"
  bd comment <epic> "Test for <behavior>: run after the fix — <what the test costs against what its absence would cost>."
  bd close <summons> --reason "Test <TEST> runs after the fix, blocks review"
  ```
  End state: `<fix>` is ready, `$TEST` unblocks when it closes, and `<review>` unblocks when `$TEST` closes — every bead waits on one that will come.

- **A deterministic gate** — a compiler, type checker, linter, validator, schema check, or policy check already catches the failure mechanically once the fix lands. Mint no test bead, and wire nothing: the gate runs on its own, and `<review>` already waits on `<fix>` from the adjudication that raised this summons. Name the gate and what it must catch:
  ```bash
  bd comment <epic> "Gate for <behavior>: <the gate, and what it catches> — <what it costs against what its absence would cost>."
  bd close <summons> --reason "Gate: <the gate, and what it catches>"
  ```
  End state: no bead is added and no edge changes; `<fix>` is ready and `<review>` follows it.

- **A review obligation** — the fix is verified by reading it against a stated standard rather than by executing anything. Mint no test bead, and wire nothing here either: `<review>` already waits on `<fix>`, so the reading is already ordered after the code it reads. Name what must be read and the standard it is read against, so the reviewer inherits an obligation and not a hint:
  ```bash
  bd comment <epic> "Review obligation for <behavior>: <what is read, against what standard> — <what it costs against what its absence would cost>."
  bd close <summons> --reason "Review obligation: <what is read, against what standard>"
  ```
  End state: no bead is added and no edge changes; `<fix>` is ready, and `<review>` carries the obligation when it comes.

- **No verification** — the fix warrants none of the three: what its failure would cost to recover from is less than any defense costs to keep. This is a decision you record, not a gap you apologize for. Mint nothing and wire nothing:
  ```bash
  bd comment <epic> "No verification for <behavior>: <what a verification would cost against what its absence would cost>."
  bd close <summons> --reason "No verification: <why the fix is not worth defending>"
  ```
  End state: no bead is added and no edge changes; `<fix>` is ready and `<review>` follows it, and the decomposer reads the decision on `<epic>` rather than reporting a gap.

Before your run ends, check the rule every branch above is built to keep: **nothing is left open that nothing will ever close, and nothing is left waiting on a bead that will never come.** Only the two test branches add a bead or an edge, and each wires `$TEST` to an agent that will be dispatched; the other three leave the graph exactly as the adjudication left it. In all five, `<summons>` is closed.


