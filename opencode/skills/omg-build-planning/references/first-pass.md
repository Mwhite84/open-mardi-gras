# First pass — plan the epic from scratch

The epic has no implementation beads yet. You are minting the build plan for the first time.

Read the epic to get the spec it carries, and list the test beads the confidence planner already minted:

```bash
bd show <epic> --long --json                          # the spec is in the epic body
bd children <epic> --json | jq -r '.[] | select(.issue_type != "epic") | .id'
```

## 1. Mint one implementation bead per spec obligation

Work from the spec's requirements and acceptance criteria — **not** from the test beads. Every obligation gets an implementation bead, whether or not a test points at it.

```bash
IMPL=$(bd create "<what must be implemented>" --parent <epic> --no-inherit-labels --silent)
bd set-state "$IMPL" agent=omg-builder --reason "Build bead"
```

`--no-inherit-labels` is required on every child: the epic carries `hindsight:pending`, and an inheriting child would pollute the ship queue with work that is not a memory document.

## 2. Wire the test before the code it proves

For each behavior the confidence planner planned a test for, wire that test to **block** the implementation bead — the test is authored first, red until the code satisfies it:

```bash
bd dep add "$IMPL" <test-bead>     # IMPL depends on the test: test blocks IMPL
```

Where the planner recorded a no-test decision for a behavior, its implementation bead simply carries no test dependency.

## 3. Stamp the done-target metadata

Onto each implementation bead, stamp the id(s) of the test bead(s) it must satisfy:

```bash
bd update "$IMPL" --set-metadata "test_beads=<test-id>"                 # one test
bd update "$IMPL" --set-metadata "test_beads=<test-id-1>,<test-id-2>"   # if it folds several
```

A missing stamp does not break the build — the review bead's full-suite run is the backstop — but it costs the implementer its fast focused path, so never skip it. A behavior with no planned test gets no `test_beads` stamp.

## 4. Serialize implementation beads that share files

Two implementation beads that touch the same files must not land in one parallel ready wave — concurrent workers do not serialize writes to a shared file. Wire them in sequence — one blocks the other in a chosen order (`bd dep add <later> <earlier>`), never a mutual block. Apply this even when the beads' logic could otherwise run in parallel.

## 5. Refine what you minted

Your first pass at a plan is rarely your best. Before you finish, review the implementation beads you created — as three passes, each with its own lens, run **in this order**. Make a pass, act on what it surfaces, then make it again; two or three iterations of each is where the real improvements land.

- **Resize first.** Split any bead too large to land cleanly in one focused change; merge any bead too small to stand on its own. A right-sized bead is one an implementer can complete as a single coherent unit of work. Resizing changes the bead set — so whenever you split or merge, immediately rewire the result: re-establish the test-blocks-implementation edges (steps 2), the `test_beads` stamps (step 3), and the same-file serialization (step 4) for every bead you created or altered. Do this before moving on, so the next lens works over a correctly wired graph.
- **Then loosen over-constraint.** With the bead set stable, fight your instinct to over-wire. For each edge, ask whether it protects against a real hazard — a genuine ordering requirement, or two beads touching the same files. If it does neither, drop it: an unnecessary dependency throttles parallelism for nothing. (The two load-bearing edge types named in the skill body are never dropped.)
- **Confirm implementability.** Read each bead as the builder will. Can it be implemented without coming back to ask a question — is the *what*, the *where*, and the acceptance criteria all present? Where a bead is thin, add the missing context now.
