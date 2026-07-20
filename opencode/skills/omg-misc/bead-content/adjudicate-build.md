This bead asks the product manager to adjudicate a broken promise.

Every `<...>` below is your ruling in your own words; everything else is literal.

## The issue at hand

- Implementation bead: {{BLOCKED_BEAD}}
- Epic: {{EPIC}}
- Failing test: {{SELECTOR}}
- Failure output:

```
{{FAILURE_OUTPUT}}
```

## Your job

The implementation above broke a test from an earlier epic. That test was a
promise — prior work guaranteed a behavior and wrote the test to hold it. Rule on
one question: **does that promise still hold, or has the product moved on?**
Query Hindsight for why the promise was made before ruling — past intent is what
tells load-bearing apart from stale — and do not rule from this bead's contents
alone.

Rule one of three ways.

**The promise stands** — the new code is wrong. Record the correction where the
next builder will read it, then close:

```bash
bd comment {{BLOCKED_BEAD}} "Adjudication: the prior guarantee stands. <what must be preserved, and why>"
bd close {{THIS_BEAD}} --reason "Promise stands: <one-line ruling>"
```

The implementation bead comes ready again carrying your ruling.

**The promise is stale** — the old test asserts behavior the product no longer
wants. Mint the test-update, wire it so the implementation waits on it, then
close:

```bash
TEST_UPDATE="$(bd create "Update stale test: <the promise, in one line>" -t task -p 1 \
  --parent {{EPIC}} --no-inherit-labels \
  --deps discovered-from:{{THIS_BEAD}} \
  -d "Update {{SELECTOR}} to assert the current intent: <what the behavior should now be, and why the old assertion is stale>" \
  --silent)"
bd set-state "$TEST_UPDATE" agent=omg-tester --reason "Test-update bead"
bd dep add {{BLOCKED_BEAD}} "$TEST_UPDATE"
bd close {{THIS_BEAD}} --reason "Promise stale: <why the product moved on>"
```

**Too close to call** — do not guess and do not close. Place a human gate; the
epic pauses cleanly until a person rules, then you resolve as above:

```bash
bd gate create --type=human --blocks {{THIS_BEAD}} --reason "<what you cannot decide, and what a human must answer>"
```

A decided ruling always ends with this bead closed — left open, it blocks the
implementation forever.

**If this bead carries a `RECLAIMED:` comment**, a prior run was interrupted
mid-ruling. Resume it, don't restart it: read this bead's comments and the
implementation bead's comments for a ruling that already landed. If it landed
fully (correction commented, or test-update minted and wired), close this bead
citing it. If it landed partway, finish that ruling's remaining commands above.
Only if no ruling was reached and you cannot reach one yourself do you gate — the
same bar as too close to call. Never rule twice, never mint twice.
