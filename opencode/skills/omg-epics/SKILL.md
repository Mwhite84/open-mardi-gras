---
name: omg-epics
description: Epic decomposition, dependency wiring, and DAG validation for beads. Load this skill when creating epics, wiring dependencies between issues, or validating epic structure.
---

# Epics and Dependencies

## Core Concepts

- Epics contain child beads. Children are **parallel by default**.
- Only add blocking deps where ordering truly matters
  (e.g., schema before queries, types before implementations).
- Do NOT over-constrain — unnecessary deps reduce parallelism.

## The `agent` label — who works each bead

Every bead carries an `agent` **state label** naming the agent that works it. The
foreman reads this label (`bd state <id> agent`) to dispatch the bead — it does
**not** infer the worker from the bead's type or title. So you must stamp it at
mint, with `bd set-state` (the state-dimension command — it atomically sets the
single `agent` value, never stacking a second one):

```bash
bd set-state <bead-id> agent=omg-builder  --reason "Build bead"
bd set-state <review-bead-id> agent=omg-reviewer --reason "Review bead"
```

- Child build beads → `agent=omg-builder`.
- The review bead → `agent=omg-reviewer`.
- Findings the reviewer later files are stamped by the reviewer, not here.

A bead with no `agent` label cannot be dispatched — the foreman will stop on it.
Stamp every child you create.

## Dependencies are the concurrency guard

In the experimental `multi_agents` build mode, the foreman fans out one worker per
ready bead **concurrently**, and opencode does not serialize `write`/`apply_patch`
to the same file across workers. So dependency wiring is not only logical
ordering — **it is the guard that keeps two workers off the same files at once.**
Beads that touch overlapping files must block each other so they never land in the
same ready wave. Under-wiring here is not a parallelism inefficiency; in
`multi_agents` it is a correctness risk (clobbered writes). Wire file-sharing
beads in sequence even when their *logic* could run in parallel.

## Dependency Commands

```
bd dep add <dependent> <dependency>    # "dependent" is blocked by "dependency"
bd dep tree <epic-id>                  # Visual dependency graph
bd swarm validate <epic-id>            # Validate DAG structure (no cycles)
bd blocked --json                      # Show all blocked issues
```

The argument order matters: `bd dep add A B` means "A depends on B" (B blocks A).

## Epic Lifecycle

The epic is minted at decomposition, not before — nothing upstream creates a
bead. Read the spec's stable `id` from its frontmatter and use it as the epic's
`spec_id` (per ADR-0001, identity is the document `id`, not the file path).

Like an ADR bead, the epic carries the spec document — so the spec's frontmatter
must be split off the body the same way: stripped from the description, captured
as `--metadata`. Use the same `yq`/`awk` split shown in the **ADR Beads** section
of `omg-commands`; the variables below (`id`, `meta`, and the stripped body) come
from it.

```bash
# Mint epic from spec (spec frontmatter → --metadata; stripped body → description)
awk 'NR==1 && $0=="---"{fm=1; next} fm && $0=="---"{fm=0; body=1; next} body' "$SPEC" \
  | bd create "<Feature>" -t epic -p 1 --spec-id "$id" --metadata "$meta" --body-file - --json

bd list --spec "<spec-id>" --json    # Find epic by spec id
bd ready --parent <epic-id> --json   # Find ready children
bd mol progress <epic-id>            # Completion %, rate, ETA
bd epic close-eligible               # Close epics where all children done
```

The epic is **frozen at ship, not at mint** — and an epic ships at close, once
its work is done. Between mint and ship it is mutable and may accumulate working
notes; the worker can still revise it. Only after it has shipped is its body
frozen: a change to shipped memory is a supersession, not an edit — see
**Immutability and Supersession** in `omg-commands` for the full rule.
(`bd update <epic-id> --body-file=…` exists; using it to re-sync a *shipped* epic
violates that rule.)

After minting the epic, create a `relates-to` ADR bead for each ADR produced for
this spec — see the **ADR Beads** section of `omg-commands` for the scan and the
create command. Do this before wiring children, so the epic carries its decided
context from the start.

## Review Bead Pattern

Every epic should have a final "Code review" bead:
- Blocked by ALL other child beads (so it's reached last).
- Stamped `agent=omg-reviewer` (see "The `agent` label") — the foreman dispatches
  it to the reviewer by that label when it comes ready, exactly like any other
  bead. The review bead does **not** need to tell anyone to invoke the reviewer;
  the label does the routing.
- The reviewer files findings as beads with `discovered-from` links, **stamping
  each finding with its own `agent` label** so the foreman can dispatch it.
  Epic-scoped findings become children of the epic that block the review bead;
  out-of-scope findings are filed standalone.
- The reviewer reopens the review bead when it files epic-scoped findings, so the
  loop continues: those findings become ready work, get built, and the review bead
  comes ready again. The review bead closes only when a pass completes with no
  epic-scoped findings outstanding.

## Validation Checklist

After wiring dependencies, always:
1. `bd swarm validate <epic-id>` — check for cycles and structural issues
2. `bd dep tree <epic-id>` — visually confirm the dependency graph looks right

## Refinement Passes

Once the children, dependencies, and review bead exist, refine the structure in
four passes before treating the decomposition as done:

1. **Description completeness** — can an agent implement each bead without asking
   questions? If not, add the missing context (what, where, constraints,
   acceptance criteria).
2. **Dependency correctness** — any missing ordering constraints? Any
   unnecessary ones throttling parallelism? Fix them.
3. **Scope sizing** — split anything too large to land cleanly; merge anything
   too small to stand alone.
4. **Final polish** — proofread titles, descriptions, and acceptance criteria,
   and confirm the review bead still blocks on every other child.
