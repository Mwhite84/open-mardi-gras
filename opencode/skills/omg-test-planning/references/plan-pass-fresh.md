# Plan pass — fresh mint

You were dispatched by the decomposer with an **epic id** for a fresh mint: this epic has no test beads yet. Survey it and decide, behavior by behavior, what to verify — minting from scratch.

Read the epic to get the spec it carries:

```bash
bd show <epic> --long --json
```

## What to do

1. **Survey the spec's behaviors.** Work from the requirements and acceptance criteria in the epic's spec.

2. **Check what already carries the confidence.** Before you plan anything for a behavior, look for the mechanism the repo already runs — a compiler, type checker, linter, validator, schema check, policy check. Confidence you already have is confidence you do not pay for twice, and a cheaper mechanism that already covers a behavior settles the decision for it.

3. **Weigh each verification against what it prevents.** What would it cost to build, to run, and to maintain for as long as the artifact lives? What would the failures it prevents cost — how likely are they, does such a failure announce itself or fail silently, and can it recur after this epic closes? A verification costing more than the failures it prevents is one you do not plan.

4. **Record the outcome for every behavior.** Four outcomes are open to you and none is a fallback for the others; you plan confidence by the cheapest sufficient means, which is often not a test. Each one records the reasoning from step 3 — what the verification costs against what its absence costs — never a bare menu selection.

   - **An automated test** — the behavior is executable code and a test is the cheapest sufficient means. Mint a test bead and record why:

     ```bash
     TEST=$(bd create "<behavior under test>" --parent <epic> --no-inherit-labels --silent)
     bd set-state "$TEST" agent=omg-tester --reason "Test bead"
     bd comment <epic> "Test for <behavior>: <what the test costs against what its absence would cost>."
     ```

     Mint one test bead per behavior you judge warrants it. `omg-tester` writes the actual test later; you are planning *that it be verified*, not writing the test.

   - **A deterministic gate** — a compiler, type checker, linter, validator, schema check, or policy check catches the failure mechanically. Name the gate and what it must catch:

     ```bash
     bd comment <epic> "Gate for <behavior>: <the gate, and what it catches> — <what it costs against what its absence would cost>."
     ```

   - **A review obligation** — the behavior is verified by reading it against a stated standard rather than by executing anything. Name what must be read and the standard it is read against:

     ```bash
     bd comment <epic> "Review obligation for <behavior>: <what is read, against what standard> — <what it costs against what its absence would cost>."
     ```

   - **No verification** — the behavior warrants none of the three. This is a decision you record, not a gap you apologize for:

     ```bash
     bd comment <epic> "No verification for <behavior>: <what a verification would cost against what its absence would cost>."
     ```

## What you do NOT do here

- **You do not wire your test beads to any implementation bead.** At plan time the implementation beads do not exist yet — the build planner runs after you, reads your test beads, and wires each test to block the code it proves. That wiring is not your job on this pass.
- **You do not author an implementation bead or the review bead.** The only bead you create is a test bead; a gate, a review obligation, and a no-verification decision are recorded on the epic.

## Same-file serialization

If two test beads would touch the same files, wire them in sequence — one blocks the other in a chosen order (`bd dep add <later> <earlier>`), never a mutual block. Two test beads on the same files must not land in one parallel ready wave, because concurrent workers do not serialize writes to a shared file.
