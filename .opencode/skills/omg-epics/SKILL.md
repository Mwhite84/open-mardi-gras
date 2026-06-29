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

## Always create children with `--no-inherit-labels`

Every `bd create … --parent <epic>` in this runbook must include
`--no-inherit-labels`. By default a child inherits its parent's labels, and the
epic carries `hindsight:pending` (it ships at close, see **Epic Lifecycle**), so an
inheriting child silently picks up `hindsight:pending` and pollutes the ship queue
(`bd list --label hindsight:pending`) with work that is not a memory document. A
child's `hindsight` lifecycle is its own. When a child needs its own labels, set
them explicitly alongside the flag: `--no-inherit-labels --labels <a,b>`. This
applies to every child below — build beads, review beads, ADR-related beads, and
the test-planning `x`/`y`/`z` beads alike.

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

## Test-planning wiring

This is the wiring the `omg-test-planner` uses to plan verification over a built
epic and to arm the findings loop. The decomposer mints a **plain** review bead
`R`; the planner, when the operator runs `/omg-test-plan`, both plans the build
graph and rewrites `R`'s body to the canonical block below. The mechanics live
here; the planner's *judgment* lives in its persona.

Names: **`R`** = the epic's review bead; **`x`** = a finding's fix bead
(`agent=omg-builder`); **`y`** = the planner-summons bead
(`agent=omg-test-planner`); **`z`** = a planned test bead (`agent=omg-tester`).

### Summons-bead hard rules

When the reviewer files an epic-scoped build finding against a test-aware `R`, it
files `x` **and** `y` and wires them:

- **`y` is a real child bead** — `bd create … --parent <epic> --no-inherit-labels`,
  **no `--ephemeral`** — `agent=omg-test-planner`, `discovered-from:<R>`. It must be
  real because `bd ready` hides ephemeral beads and the foreman dispatches only
  real beads off the ready queue; an ephemeral `y` would never be surfaced, and
  its fix `x` would block forever. This is the deadlock the whole mechanism
  exists to prevent.
- **`y` blocks `x`**: `bd dep add <x> <y>` — always. The fix cannot be built
  before its verification is planned.
- **`R` depends on `x`**: `bd dep add <R> <x>` — existing reviewer behavior; an
  epic-scoped finding blocks the review bead.

When the foreman later dispatches `y` to the planner, the planner decides what
verification `x` needs and wires one of:

- **Case A — design-before-fix (red/green):** `z` blocks `x` —
  `bd dep add <x> <z>`. The tester writes the *failing* test first; the builder
  then makes it pass.
- **Case B — run-after-fix:** `x` blocks `z` — `bd dep add <z> <x>` — **and**
  `z` blocks `R` — `bd dep add <R> <z>`, so the review cannot close over an
  unverified fix.
- **No test needed:** no `z`; the planner records the reason.

**Mandatory close — in every branch:** the planner closes `y` once the plan
exists (`bd close <y> --reason "<plan or no-test reason>"`). `y` exists only to
summon the planner; a `y` left open blocks `x` forever. This is stated
explicitly because `y` is the first bead whose entire purpose is to be consumed —
an agent must never have to *infer* that it should close `y`.

Every edge above is a forward *blocks* edge (`y → x → R`; `z → x` Case A;
`x → z → R` Case B), so no cycle is introduced; `bd dep add` runs cycle
detection and `bd swarm validate <epic>` confirms acyclicity.

### The canonical test-aware `R` body

When the planner arms the loop, it rewrites `R`'s body to the **exact** block
below — the same content every time, so re-running rewrites to the same body and
never stacks a second copy. The `<!-- omg-test-aware -->` marker is the stable
sentinel that lets the convergence survey cheaply recognize an already-armed
`R`. Reproduce the load-bearing qualifiers **verbatim** — `y` is a **real** bead
with **no `--ephemeral`**, and both `x` and `y` carry `discovered-from:<R>`;
paraphrasing these away reintroduces the deadlock.

```markdown
<!-- omg-test-aware -->
This epic is test-planned. When you file an **epic-scoped build finding**, in
addition to the standard review filing steps, arm the planner before the fix is
built:

1. File the fix bead `x`: `agent=omg-builder`, `--parent <epic> --no-inherit-labels`,
   **with `discovered-from:<R>`** (`<R>` is this review bead's id).
2. File the summons bead `y`, **a real bead — `--parent <epic> --no-inherit-labels`,
   NO `--ephemeral`** — `agent=omg-test-planner`, **with `discovered-from:<R>`**.
3. Wire `y` blocks `x`: `bd dep add <x> <y>`.
4. Wire `R` depends on `x`: `bd dep add <R> <x>`.
5. Reopen `R`: `bd update <R> --status open`.

(Out-of-scope findings are filed the standard way, with no `y` and no
review-bead dependency.)
```

### Same-file `z` sequencing

When the planner mints `z` beads, it inherits the decomposer's "wire
file-sharing beads in sequence" rule (see **Dependencies are the concurrency
guard**). A `z` and its own fix `x` are already serialized by Case A / Case B
edges, but two *different* findings' beads that touch the same files must also be
wired to block each other, so the planner never creates same-file `z` beads in a
parallel ready wave under `multi_agents`.

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
