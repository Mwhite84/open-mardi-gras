# Refinement pass — revisit a plan you already built

You planned this epic on a prior run. Its implementation beads already exist; you are being sent back to improve them with a fresh eye, not to rebuild from nothing. The cardinal rule of this pass: **reconcile, never re-mint.** A blind re-run would double-create every bead.

## Recover what you built

Read the spec the epic carries, then pull the two sets of children you will reason over — the implementation beads you minted, and the test beads the confidence planner minted:

```bash
bd show <epic> --long --json     # the spec — your source of truth for what must be built

# your prior implementation beads
bd children <epic> --json | jq -r '.[] | select(.labels[]? == "agent:omg-builder") | "\(.id)\t\(.title)"'

# the test beads — what your implementation beads should be wired to. Closed
# ones are excluded: bd children lists all statuses, and a closed test bead is
# settled history, not a planned test to wire against.
bd children <epic> --json | jq -r '.[] | select(.status != "closed") | select(.labels[]? == "agent:omg-tester") | .id'
```

Hold the spec in one hand and your existing beads in the other. Everything below is a comparison between the two, not a fresh mint.

## Reconcile against the spec

- **A spec obligation with no implementation bead** — you missed it, or the spec grew. Mint one now (`bd create … --parent <epic> --no-inherit-labels --silent`, then `bd set-state <impl> agent=omg-builder`).
- **An implementation bead whose obligation the spec no longer has** — the spec shrank. Close it as no-longer-needed (`bd close <impl> --reason "Spec dropped this obligation"`) and remove edges that pointed at it.
- **An obligation already covered by a bead that is still correct** — leave it untouched. Do not recreate it, do not restate it.

## Reconcile the wiring and metadata

For the beads that remain:

- **A test the confidence planner planned but no implementation bead is wired to** — add the edge: `bd dep add <impl> <test-bead>` (the test blocks the implementation).
- **A `test_beads` stamp that is missing or stale.** Each implementation bead carries a `test_beads` metadata field holding the id(s) of the test bead(s) it must satisfy — the done-target the implementer reads to find its focused test without opening a test file. Set it on the *implementation* bead, valued with the *test* bead's id (comma-separated if several): `bd update <impl> --set-metadata "test_beads=<test-id>"`. A bead with no planned test carries no such stamp, and a stamp naming a test bead that is closed or no longer exists is stale — remove it (`bd update <impl> --unset-metadata test_beads`), or a builder will chase a done-target that resolves to nothing.
- **Two implementation beads that touch the same files but are not serialized** — wire one to block the other (`bd dep add <later> <earlier>`), so concurrent workers never clobber a shared file.

## Refine with fresh eyes

This is the payoff of a second look. Run each lens over the current bead set, a couple of iterations each, **in this order**:

- **Resize first.** Split a bead that has grown too large to land cleanly; merge two that are each too small to stand alone. Resizing changes the bead set — so whenever you split or merge, immediately rewire the result: re-establish the test-blocks-implementation edge, the `test_beads` stamp, and any same-file serialization for every bead you created or altered (see **Reconcile the wiring and metadata** above). Do this before moving on, so the next lens works over a correctly wired graph.
- **Then loosen over-constraint.** With the bead set stable, this is the most common thing a refinement catches: a dependency that throttles parallelism without protecting a real hazard. For each edge, ask whether it guards a genuine ordering requirement or two beads sharing files. If neither, drop it. (The two load-bearing edge types named in the skill body are never dropped.)
- **Confirm implementability.** Read each bead as the builder will. If it cannot be implemented without a clarifying question, add the missing *what*, *where*, or acceptance criteria.
