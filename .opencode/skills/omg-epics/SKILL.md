---
name: omg-epics
description: Epic decomposition, dependency wiring, and DAG validation for beads. Load this skill when creating epics, wiring dependencies between issues, or validating epic structure.
---

# Epics and Dependencies

## Core Concepts

- Epics contain child beads. Children are **parallel by default**.
- Only add blocking deps where ordering truly matters (e.g., schema before queries, types before implementations).
- Do NOT over-constrain — unnecessary deps reduce parallelism.

## Always create children with `--no-inherit-labels`

Every `bd create … --parent <epic>` in this runbook must include `--no-inherit-labels`. By default a child inherits its parent's labels, and the epic carries `hindsight:pending` (it ships at close, see **Epic Lifecycle**), so an inheriting child silently picks up `hindsight:pending` and pollutes the ship queue (`bd list --label hindsight:pending`) with work that is not a memory document. A child's `hindsight` lifecycle is its own. When a child needs its own labels, set them explicitly alongside the flag: `--no-inherit-labels --labels <a,b>`. This applies to every child below — build beads, review beads, ADR-related beads, and the verification `x`/`y`/`z`/`w`/`m`/`u` beads alike.

## The `agent` label — who works each bead

Every bead carries an `agent` **state label** naming the agent that works it. The foreman reads this label (`bd state <id> agent`) to dispatch the bead — it does **not** infer the worker from the bead's type or title. So you must stamp it at mint, with `bd set-state` (the state-dimension command — it atomically sets the single `agent` value, never stacking a second one):

```bash
bd set-state <bead-id> agent=omg-builder  --reason "Build bead"
bd set-state <review-bead-id> agent=omg-reviewer --reason "Review bead"
```

- Child build beads → `agent=omg-builder`.
- The review bead → `agent=omg-reviewer`.
- Findings the reviewer later files are stamped by the reviewer, not here.

A bead with no `agent` label cannot be dispatched — the foreman will stop on it. Stamp every child you create.

## Dependencies are the concurrency guard

In the experimental `multi_agents` build mode, the foreman fans out one worker per ready bead **concurrently**, and opencode does not serialize `write`/`apply_patch` to the same file across workers. So dependency wiring is not only logical ordering — **it is the guard that keeps two workers off the same files at once.** Beads that touch overlapping files must block each other so they never land in the same ready wave. Under-wiring here is not a parallelism inefficiency; in `multi_agents` it is a correctness risk (clobbered writes). Wire file-sharing beads in sequence even when their *logic* could run in parallel.

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

The epic is **frozen at ship, not at mint** — and an epic ships at close, once its work is done. Between mint and ship it is mutable and may accumulate working notes; the worker can still revise it. Only after it has shipped is its body frozen: a change to shipped memory is a supersession, not an edit — see **Immutability and Supersession** in `omg-commands` for the full rule. (`bd update <epic-id> --body-file=…` exists; using it to re-sync a *shipped* epic violates that rule.)

After minting the epic, create a `relates-to` ADR bead for each ADR produced for this spec — see the **ADR Beads** section of `omg-commands` for the scan and the create command. Do this before wiring children, so the epic carries its decided context from the start.

## The plan-phase sequence

The plan-time orchestrator (`omg-decomposer`) drives the whole plan phase in this fixed order, as ordinary work — it dispatches the two planners as subagents (via the Task tool) and authors the two static beads itself. Ordering is guaranteed because each subagent dispatch returns before the next; there is no plan-time queue. Verification planning is standard and not optional — it always runs.

1. **Mint the epic** from the spec (see **Epic Lifecycle**), and its `relates-to` ADR beads (see **ADR Beads** in `omg-commands`).

2. **Dispatch the confidence planner** (`omg-test-planner`) as a subagent, handing it the epic id. It mints `z` test beads (`agent=omg-tester`) for the behaviors it judges warrant verification and records no-test decisions for the rest. It returns before the next step. It authors no build bead and does not touch `R`.

3. **Dispatch the build planner** (`omg-build-planner`) as a subagent, handing it the epic id. Running *after* step 2, the test beads already exist. It mints one implementation bead per spec requirement/AC (completeness from the **spec**, not from the test beads), wires **`z` blocks `impl`** for each planned test (`bd dep add <impl> <z>` — the default test-before-code edge), and stamps the **hop-1 `test_beads`** metadata onto each implementation bead (see **Bead metadata** in `omg-commands`).

4. **Author the review bead `R` once**, from the static canonical block below, stamped `agent=omg-reviewer`, blocked by every other **work** child. The orchestrator writes it; no planner touches it. There is exactly one author — no sentinel, no convergence detection.

5. **Mint the terminal report-writer bead `P`**, from the static `P` block below, stamped `agent=omg-reviewer`, `--parent <epic> --no-inherit-labels`, wired **`R` blocks `P` / `P` depends on `R`** (`bd dep add <P> <R>`). `P` is the last child to come ready; minting it here moves the epic's terminal work onto the graph.

6. **Validate** (`bd swarm validate`, `bd dep tree`) and run the refinement passes.

**The terminal carve-out on "R blocked by all children."** Step 4's rule is "`R` blocked by all other **work** children" — `P` is the exception. `P` depends on `R` (step 5), so `R` must **not** be wired to depend on `P`; doing both would create a cycle. When you validate, confirm `R` depends on every work child and `P` depends on `R`, and nothing depends on `P`.

## Review Bead Pattern

`R` is authored once (plan-phase step 4) from **The static review-bead block** below, which carries its full work order; the label routes it to the reviewer when it comes ready (see "The `agent` label"). What the block does not carry is the **reopen loop**: the reviewer reopens `R` when it files epic-scoped findings (`bd update <R> --status open`), so those findings become ready work, get resolved, and `R` comes ready again — `R` closes only when a pass completes with no epic-scoped findings outstanding.

## Verification wiring

This is the mechanics of the verification workflow: the plan-time default edge, the static review-bead and report-writer blocks, the findings loop, the build-time escape hatch, and the review-time Mode-2 wiring. The *judgment* lives in the planners' and PM's personas; the *wiring* lives here, and its load-bearing qualifiers must be reproduced **verbatim** — paraphrasing them away is a defect.

Dependency-direction convention (used throughout): "**A blocks B**" means B waits on A, wired **`bd dep add <B> <A>`** (blocked bead first, blocker second) = "B depends on A". Every edge below is a **forward** blocks-edge (later work → earlier work), so no cycle is introduced; `bd dep add` runs cycle detection and `bd swarm validate <epic>` confirms acyclicity.

Names: **`R`** = the review bead; **`P`** = the terminal report-writer bead; **`z`/`z′`** = a planned / re-planned test bead (`agent=omg-tester`); **`impl`** = an implementation bead (`agent=omg-builder`); **`x`** = a finding's fix bead (`agent=omg-builder`); **`y`** = a summons bead (`agent=omg-test-planner`); **`w₁`** = a build-time Mode-1 escape bead (`agent=omg-test-planner`); **`w₂`** = a build-time Mode-2 escape bead (`agent=omg-product-manager`); **`m`** = a review-time Mode-2 adjudication bead (`agent=omg-product-manager`); **`x_m`/`y_m`** = a PM-minted fix and its verification summons; **`u`** = a test-update bead (`agent=omg-tester`).

### The plan-time default edge and hop-1 metadata (build planner)

For each behavior the confidence planner planned a `z` for, the build planner wires **`z` blocks `impl`** (`bd dep add <impl> <z>`) — the test is authored before the code, red until the implementation satisfies it. It also stamps the **hop-1 `test_beads`** metadata onto each implementation bead (the id(s) of the test bead(s) that bead must satisfy — see **Bead metadata** in `omg-commands`). A behavior recorded no-test still gets its `impl` bead (completeness from the spec), with no test dependency.

### The static review-bead block (authored once by the orchestrator)

The orchestrator authors `R`'s body from the **exact** block below (once — see plan-phase step 4). Reproduce the load-bearing qualifiers verbatim: the full-suite run fires **at the review bead each time the review fires** (never per implementation bead); a red-suite finding **always** blocks `R`; the finding's `agent` label selects one of **two distinct wirings**; `y` is a **real** bead with **no `--ephemeral`**; beads carry `--no-inherit-labels` and `discovered-from:<R>`.

```markdown
When you execute this review bead, in addition to reading every changed file:

1. **Run the full test suite** (infer the runner from the repo's tooling). Do this here, at the review bead, each time this review fires — not per implementation bead.

2. **File a finding for every red test and every review finding.** Each finding is a bead with `discovered-from:<R>` (`<R>` is this review bead's id), stamped with its own `agent` label, and it **always blocks** `R`. Your change-locality judgment sets the label, and the label selects the wiring:

   - **Builder-bound** — the failure should be fixed *in this epic* (a defect in the changed code). The finding **is** the fix bead `x`, `agent=omg-builder`, `--parent <epic> --no-inherit-labels`, `discovered-from:<R>`. Arm its verification before it is built:

     a. File the summons bead `y`, **a real bead — `--parent <epic> --no-inherit-labels`, NO `--ephemeral`** — `agent=omg-test-planner`, `discovered-from:<R>`.
     b. Wire `y` blocks `x`: `bd dep add <x> <y>`.
     c. Wire `R` depends on `x`: `bd dep add <R> <x>`.

   - **PM-bound** — this epic's change reddened a **prior-epic** guarantee (a
     Mode-2 collision). File an adjudication bead `m`, `agent=omg-product-manager`,
     `--parent <epic> --no-inherit-labels`, `discovered-from:<R>`, and wire **`m`
     blocks `R`**: `bd dep add <R> <m>`. File **no** `y` summons and **no** fix
     `x` — there is no fix until the PM decides one is warranted, so the
     builder-bound hard rules above must **not** be applied to it.

3. **Reopen `R`** if you filed any epic-scoped finding: `bd update <R> --status open`.

(Out-of-scope findings unrelated to this epic are filed standalone, with no
review-bead dependency.)

```

### The static report-writer (`P`) block

`P`'s body is the **exact** block below, authored once by the orchestrator. `P` writes the report and **stops** — it performs no Hindsight ship. Shipping to durable memory left the automated flow entirely; it is a separate, deliberately human-invoked act.

```markdown
This is the terminal report-writer bead for the epic. When you execute it:

1. **Read every child bead's comments** (`bd comments <id>`) — the workers' deviations, discoveries, decisions, and any Mode-2 adjudications recorded there. This is your source; do not report from memory.

2. **Synthesize the build report** — the delta between plan and what was built — using the `doc-templates` `build-report` template. Mint its `id` with `next-id.sh` as `build-report.<domain>.<topic>.NNNN`, `type: build-report`, and `produced_for: <spec-id>`.

3. **Write it to the docs tree** at the resolver-computed path (`<docs_base>/build-report/<id>.md`). Give it a `hindsight` block **iff** the build carried something worth remembering (deltas worth recalling); otherwise omit the block so it stays in Git without adding memory noise.

4. **Stop.** Do not ship to Hindsight, do not close the epic, do not touch any other bead. Writing the report is the whole job; shipping is a separate human-invoked command.

```

### The summons handoff (findings loop)

When the foreman dispatches `y` to the confidence planner, it decides what verification the fix `x` needs, wires one of the following, and **closes `y` in every branch** (`bd close <y> --reason "<plan or no-test reason>"`) — a `y` left open blocks `x` forever, the one deadlock this guards:

- **Case A — design-before-fix:** `z` blocks `x` (`bd dep add <x> <z>`). The test-writer writes the failing test first; the builder then makes it pass.

- **Case B — run-after-fix:** `x` blocks `z` (`bd dep add <z> <x>`) **and** `z` blocks `R` (`bd dep add <R> <z>`), so the review cannot close over an unverified fix.

- **No test needed:** no `z`; the planner records the reason.

### The build-time escape hatch (`w₁` / `w₂`) and its mandatory reset

When a builder is genuinely stuck on a focused test (wrong or impossible, not merely unmet), it files an escape bead and **resets its own pre-claimed `x`**:

- `w₁`/`w₂` are **real** beads — `--parent <epic> --no-inherit-labels`, **no `--ephemeral`** — `discovered-from:<x>`. `w₁` → `agent=omg-test-planner` (Mode 1), `w₂` → `agent=omg-product-manager` (Mode 2).

- Wire the escape bead to block `x`: `bd dep add <x> <w₁-or-w₂>`.

- **Mandatory reset of the pre-claimed `x`:** `bd update <x> --status open --assignee ""`. The builder had claimed `x` (`in_progress`); `bd ready` excludes `in_progress` beads, so without the reset `x` never re-enters `bd ready` after the escape bead closes, and the epic wedges. This is the `w`-analogue of `y`'s mandatory-close — a single omitted step wedges the graph.

- **Mandatory close** of `w₁` (by the planner) and `w₂` (by the PM) in every decidable branch.

**Mode-1 (`w₁`) resolution — confidence planner:** uphold the test (comment on `x`, close `w₁`) or re-plan it (mint `z′`, wire `z′` blocks `x`, close `w₁`).

**Mode-2 (`w₂`) resolution — PM:** kick-back (comment the correction on `x`, close `w₂`) or test-update (mint `u` `agent=omg-tester`, wire `u` blocks `x`, close `w₂`).

### The review-time Mode-2 adjudication (`m`) — PM, no open `x`

When the reviewer files a PM-bound finding `m` (a prior-guarantee break at review time, when the epic's work has closed and there is **no open `x`**), the foreman dispatches `m` to the PM, which resolves one of three ways, each keeping `R` blocked until the resolution lands:

- **Kick-back → mint fix + its summons.** Mint `x_m` (`agent=omg-builder`, `--parent <epic> --no-inherit-labels`, `discovered-from:<m>`) **and** its verification summons `y_m` (`agent=omg-test-planner`, real, non-ephemeral, `discovered-from:<m>`); wire `y_m` blocks `x_m` (`bd dep add <x_m> <y_m>`) and `x_m` blocks `R` (`bd dep add <R> <x_m>`); close `m`. A **PM-minted fix is still a fix, and its verification is planned before it is built** — this is not the one path that escapes verification planning.

- **Test-update → mint `u` blocking `R`.** Mint `u` (`agent=omg-tester`, `discovered-from:<m>`) targeting the stale prior test, wire **`u` blocks `R`** (`bd dep add <R> <u>`) — **not** `u` blocks `x`, because there is no `x`; close `m`.

- **Cannot decide → human gate on `m`.** Do **not** close `m`. Place a human gate: `bd gate create --type=human --blocks <m> --reason "…"`. The gate hides `m` from `bd ready` while `m` still blocks `R`, so the epic pauses cleanly. When the human resolves the gate, `m` returns to `bd ready` and the PM follows kick-back or test-update above.

### Recovery on a reclaimed `w₂` / `m`

If the PM is dispatched onto a `w₂` or `m` bead carrying a **reclamation comment** (a marker like `RECLAIMED:` — a prior PM run was interrupted mid-adjudication and the foreman handed it over fresh), first check whether the ruling was **already recorded** — the correction commented on `x`/the `m` bead, or the fix/test-update beads (`x_m`/`y_m`/`u`) already minted. If the adjudication already landed, close the summons; do **not** re-adjudicate and do **not** double-mint. Otherwise resume the partial work and resolve it to a clean terminal state (closed, or held by a human gate).

### Human gate, not human label (both topologies)

On the PM's cannot-decide branch — build-time (`w₂`) or review-time (`m`) — the pause is a **human gate** (`bd gate create --type=human --blocks <w₂>` / `--blocks <m>`), **never** a `human` *label*. A label alone leaves the bead dispatchable, so the foreman would re-dispatch it endlessly; only the gate removes it from the ready queue until a human resolves it.

### Every verification bead is dispatchable — no foreman special-casing

Every verification and escape-hatch bead (`z`/`z′`/`u`/`y`/`w₁`/`w₂`/`m`/`x_m`/`y_m`) carries its `agent` label, so the foreman routes it by label like all other work — verification work is not special-cased. All are **real** beads with **no `--ephemeral`** (`bd ready` hides ephemeral beads; a hidden summons would block its fix forever).

### Same-file `z` sequencing

Two serialization rules, both stated as **serialization** — one bead blocks the other in a chosen order, **never** a mutual block (which is a cycle `bd dep add` refuses):

- **Plan-time inheritance:** the build planner inherits the decomposer's file-sharing discipline (see **Dependencies are the concurrency guard**) for the `z` beads it wires — any two `z` beads that touch the same files are serialized, never minted into one parallel ready wave.

- **Findings-loop rule:** when two findings' beads touch the same files, wire them in sequence — one blocks the other — so they do not surface in one parallel ready wave. A `z` and its own fix `x` are already serialized by the Case A / Case B edges.

## Validation Checklist

After wiring dependencies, always:
1. `bd swarm validate <epic-id>` — check for cycles and structural issues
2. `bd dep tree <epic-id>` — visually confirm the dependency graph looks right

## Refinement Passes

Once the children, dependencies, and review bead exist, refine the structure in
four passes before treating the decomposition as done:

1. **Description completeness** — can an agent implement each bead without asking questions? If not, add the missing context (what, where, constraints, acceptance criteria).

2. **Dependency correctness** — any missing ordering constraints? Any unnecessary ones throttling parallelism? Fix them.

3. **Scope sizing** — split anything too large to land cleanly; merge anything too small to stand alone.

4. **Final polish** — proofread titles, descriptions, and acceptance criteria, and confirm the graph still satisfies the terminal carve-out (see the plan-phase sequence): `R` blocks on every other **work** child, `P` depends on `R`, nothing depends on `P`.
