---
description: Plan verification over a built epic and arm its findings loop with the test planner
agent: omg-test-planner
---

Plan test verification for epic `$1`.

Run the planner over the epic end to end with the `omg-epics` and `omg-commands`
skills for the mechanics — the Test-planning wiring section of `omg-epics` holds
the summons-bead rules, the Case A / Case B edges, the mandatory `y` close, and
the canonical test-aware review-bead block. In a single run:

1. Survey the epic's build graph, its implementation state, the verification
   that already exists (as `omg-tester` beads and statically in the suite), `R`'s
   body state, and already-planned findings — then converge: plan only unplanned
   work and leave correctly-planned work untouched.
2. For each build bead, record exactly one outcome — a Case A test bead, a
   Case B test bead, or a recorded "no test needed, because…" decision — and
   wire it.
3. Rewrite the review bead `R`'s body to the canonical test-aware block (at most
   once), so future reviewer-filed findings summon the planner before their
   fixes are built.

Report what you planned, what you declined and why, and whether `R` was armed.
