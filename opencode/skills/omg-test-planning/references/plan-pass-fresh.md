# Plan pass — fresh mint

You were dispatched by the decomposer with an **epic id** for a fresh mint: this epic has no test beads yet. Survey it and decide, behavior by behavior, what to verify — minting from scratch.

Read the epic to get the spec it carries:

```bash
bd show <epic> --long --json
```

## What to do

1. **Survey the spec's behaviors.** Work from the requirements and acceptance criteria in the epic's spec.

2. **For each behavior that warrants independent verification, mint a test bead:**

   ```bash
   TEST=$(bd create "<behavior under test>" --parent <epic> --no-inherit-labels --silent)
   bd set-state "$TEST" agent=omg-tester --reason "Test bead"
   ```

   Mint one test bead per behavior you judge warrants it. `omg-tester` writes the actual test later; you are planning *that it be verified*, not writing the test.

3. **For each behavior you decline to test, record the reason** — a no-test decision is a first-class outcome, not a gap. Record it as a comment on the epic:

   ```bash
   bd comment <epic> "No test for <behavior>: <reason — covered elsewhere / mechanical / low-risk / a deterministic gate already covers it>."
   ```

## What you do NOT do here

- **You do not wire your test beads to any implementation bead.** At plan time the implementation beads do not exist yet — the build planner runs after you, reads your test beads, and wires each test to block the code it proves. That wiring is not your job on this pass.
- **You do not author an implementation bead or the review bead.** You create only test beads and record no-test decisions.

## Same-file serialization

If two test beads would touch the same files, wire them in sequence — one blocks the other in a chosen order (`bd dep add <later> <earlier>`), never a mutual block. Two test beads on the same files must not land in one parallel ready wave, because concurrent workers do not serialize writes to a shared file.
