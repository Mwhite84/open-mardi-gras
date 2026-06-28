---
schema_version: 1
id: adr.platform.beads-sync-ownership.0001
type: adr
title: "Beads Sync Discipline Is Owned by the BeadsPlugin, Not by Agent or Skill Instructions"
status: accepted
domain: platform
produced_for: spec.platform.test-planning.0001
created_at: 2026-06-28T00:06:29Z
updated_at: 2026-06-28T00:11:32Z
hindsight:
  strategy: spec-or-adr
  tags:
    - source:authored
    - domain:platform
    - discipline:engineering
    - memory_type:adr
---

# ADR: Beads Sync Discipline Is Owned by the BeadsPlugin, Not by Agent or Skill Instructions

> Architecture Decision Record. Captures one decision: its context, the options
> weighed, the choice made, and the consequences accepted. An ADR is frozen once
> it ships to memory — supersede a shipped ADR with a new one rather than editing
> it. Before it ships, it is a working file and is refined in place; marking it
> Accepted does not freeze it.

## Status

Accepted

## Context

OMG agents track all work in **beads** (the `bd` issue tracker, Dolt-backed).
Across that workflow, two distinct kinds of instruction get mixed together in
the agent and skill Markdown:

- **Task semantics** — *what work to do*: find ready work (`bd ready`), read a
  bead (`bd show <id>`), wire dependencies (`bd dep add`), close a bead
  (`bd close <id> --reason …`). This is intrinsic to the job and the same in
  every deployment.
- **Sync discipline** — *how beads state is persisted and propagated*: the
  `bd dolt commit` / `bd dolt push` / `bd dolt pull` sequence that follows a
  write, and when each is allowed. This is **not** a property of the task. It is
  a property of how beads is *deployed*.

Beads has two deployment modes, and the repo must serve both:

- **`embedded`** — a local file-backed Dolt in `.beads/`. Writes are local until
  pushed; the worker is expected to follow a commit/push discipline at sync
  points. This is the zero-setup default — what most users of the published
  plugin will run.
- **`server`** — beads talks to a remote Dolt **server** (the configuration the
  repo owner uses, set up via `bd init --server …`). Every `bd` write lands on
  the server immediately. Here `bd dolt push` is not a no-op — it **actively
  errors**, because it tries to reach a git remote the server-mode setup does not
  have.

**The concrete trigger.** Skill and agent instructions today hard-code the
mode-specific sync sequence into task steps. For example, the `omg-builder`
skill's close step is followed by step 7, *"Sync per the dolt mode … In
`server` mode … no `bd dolt commit/push/pull`; … In `embedded` mode, follow the
project's sync discipline,"* and lists *"Running forbidden sync"* as a failure
mode. The `omg-commands` skill carries a whole **Sync** section enumerating
`bd dolt pull/commit/push` and warning that in `server` mode "these are wrong …
`bd dolt push` actively errors." The `omg-decompose.md` command runs
`bd dolt commit && bd dolt push` after approval. Each of these embeds the
deployment decision in a place that has no business holding it, and each must
re-derive the mode (`jq -r '.dolt_mode' .beads/metadata.json`) and branch on it.
The result is duplication across every instrument and a standing bug: an
instruction to `bd dolt push` after a write is simply *wrong* in server mode.

**The plugin already participates in sync.** The Open Mardi Gras opencode
plugin's TypeScript `BeadsPlugin` already takes part in keeping beads state
synced and in informing agents of deployment-specific beads guidance. This ADR
formalizes the existing direction: the plugin, not the instruments, is the place
that owns this. *How* the plugin does it is the plugin's own concern and out of
scope here (see Scope Boundary).

The principle that resolves the trigger follows directly: **sync discipline is a
deployment property, not a task property.** The plugin is already the single,
mode-aware place that owns deployment-specific beads behavior. The mode-specific
sync instructions scattered across skills are duplicating — and contradicting, in
server mode — guidance that belongs with that owner.

The binding constraints here are **correctness** (an instrument must not tell an
agent to run a command that errors in the deployment it is running in) and
**maintainability** (one mode-aware place to state sync discipline, instead of N
instruments each re-deriving and re-branching on the mode). Scale, cost, and
performance are secondary.

This ADR was produced for `spec.platform.test-planning.0001`, whose
`omg-test-planner` instrument is the first instrument written after this
decision and the first to follow it from birth.

## Options Considered

### Option A — Keep sync discipline in skills, with explicit per-mode branches (status quo)

Each instrument continues to read `dolt_mode` and branch: in `embedded`, run the
commit/push discipline; in `server`, run nothing. This is what exists today.

- **Gains.** No plugin dependency for correctness; an instrument read in
  isolation shows its full sync behavior; nothing new to build.
- **Costs.** The deployment decision is **duplicated** into every instrument that
  writes beads, and every one must re-derive the mode and branch on it. That
  duplication is the exact source of the server-push bug: the moment one
  instrument's branch is wrong or omitted (a future instrument forgets the
  `server` guard), it instructs a forbidden push. Adding a third deployment mode,
  or changing the discipline, means editing every instrument. Deployment
  knowledge lives in the wrong layer — task instructions — and drifts.

### Option B — Pass `dolt_mode` as an input each agent branches on

Formalize the status quo: the command reads `dolt_mode` and passes it down (as
`omg-build.md` and `omg-foreman` already do), and each agent is responsible for
branching on it correctly.

- **Gains.** The mode is read once at the entry point rather than by every agent
  independently; it is explicit data flowing through the workflow.
- **Costs.** Every agent still **re-implements the same decision** — "given mode
  X, run sequence Y" — from the same passed-in fact. The branch logic, and the
  knowledge of *which* commands are forbidden in *which* mode, is replicated in
  each agent's instructions. This moves *where the mode is read* but not *where
  the sync decision lives*: it is still deployment knowledge embedded in the task
  layer, just plumbed rather than re-detected. The server-push class of bug
  remains one forgotten branch away.

### Option C — The plugin owns sync discipline (chosen)

Make the `BeadsPlugin` the single owner of how beads state is persisted and
propagated, and of informing agents of any deployment-specific sync steps. Skills
and agents carry only task semantics; they stop spelling out the trailing
`bd dolt` sequence after a write. The plugin already participates in sync, so this
formalizes an existing direction rather than inventing a new mechanism. *How* the
plugin discharges this ownership is its own concern and not fixed by this ADR.

- **Gains.** The mode-aware sync decision lives in exactly **one** place. New
  instruments are mode-agnostic by construction and cannot reintroduce the
  server-push bug, because they never name a `bd dolt` sync command at all. A
  change to the discipline, or a new deployment mode, is a change inside that one
  owner, not a sweep across every instrument.
- **Costs.** Correctness of an agent's sync behavior now depends on the plugin
  being present and its guidance being right; an agent run without the plugin gets
  no sync guidance. These are weighed in Consequences.

## Decision

**The `BeadsPlugin` is the single owner of beads sync discipline. Agent and skill
instructions own task semantics only.** Concretely:

1. **Task semantics → agent/skill instructions.** Where a kick-off command is
   needed, the skill names the specific command (`bd ready`, `bd show <id>`,
   `bd dep add <a> <b>`, etc.). For an action like closing a bead, the skill says
   *"close the bead"* — the task — and does **not** spell out any trailing
   `bd dolt commit` / `bd dolt push` / `bd dolt pull` sequence.

2. **Sync discipline → the plugin.** The persistence and propagation of beads
   state that follow a write, and their mode-awareness, are owned by the plugin —
   including informing the agent of any sync steps it must take. An instruction of
   the form *"after closing, also `bd dolt push`"* no longer lives in any skill or
   agent.

3. **The rule future instruments follow:** an instrument **does not hardcode
   `bd dolt` sync commands and does not branch on `dolt_mode` for sync; sync is
   plugin-owned.** An instrument is written to be **mode-agnostic** — it carries
   no `server` vs. `embedded` sync branch, and it relies on the plugin to make
   sync correct for whatever deployment it runs in. This rule serves **both**
   embedded and server mode; the decision pins neither.

This decision **records ownership** — that the plugin, not the instruments, owns
sync discipline. *How* the plugin discharges that ownership is an implementation
detail beneath this boundary and is deliberately left open; it may change without
revisiting this decision.

## Consequences

### What changes

- **Skills shed their trailing sync instructions.** The mode-specific sync steps
  and "forbidden sync" warnings in instruments such as `omg-builder`,
  `omg-commands`, and `omg-decompose` become redundant with the plugin-owned,
  PRIME-injected guidance. Their removal is **consequent future work named here,
  not executed by this ADR** (see Scope Boundary).
- **The plugin becomes the authoritative source** of mode-aware sync guidance,
  formalizing the direction it already embodies.
- **New instruments are born clean.** The upcoming `omg-test-planner`
  (`spec.platform.test-planning.0001`, instrument I1) is the first instrument
  written under this rule from birth: it carries task semantics only and is
  mode-agnostic. This directly retires the spec's defect in which **R1.7** says
  the planner "never runs `bd dolt commit/push/pull` (forbidden in server mode)"
  and a Precondition asserts "Beads runs in server mode here" — both of which
  wrongly pin server mode. Under this decision the correct requirement is: *the
  planner carries task semantics only and relies on the plugin-injected sync
  discipline; it is mode-agnostic and does not hardcode `bd dolt` sync commands.*
  The spec may cite this ADR as the rationale for dropping that mode pin. (The PM
  owns that spec edit; this ADR does not edit the spec.)

### What this enables

- **Mode-agnostic instruments.** An instrument written once runs correctly in
  embedded and server deployments without a per-mode branch, so it cannot carry
  the server-push bug.
- **One place to fix mode bugs.** A change to the sync discipline, or a new
  deployment mode, is a change to the injected guidance — not a sweep across
  every instrument.

### Costs, risks, and new constraints accepted

- **A workflow-wide skill migration is now implied.** Existing instruments still
  carry the old per-mode sync instructions. They must be migrated to shed them.
  This is **future work this ADR creates but does not perform**; until it is
  done, the duplication persists in those legacy instruments.
- **Correctness is coupled to the plugin's guidance being right.** With the sync
  decision centralized, an agent's persistence behavior is only as correct as the
  guidance the plugin provides. Wrong or stale guidance misguides every agent at
  once — the flip side of having one place to fix is having one place to break.
- **The plugin must be present and working for full sync correctness.** Because
  sync discipline no longer lives in the instruments, an environment without the
  plugin (disabled, or a harness that does not load it) leaves agents with task
  semantics but no persistence guidance. In `server` mode this is benign (writes
  land immediately and there is nothing for the agent to do); in `embedded` mode
  it means local writes may not be propagated. The decision accepts a dependency
  on the plugin being present for full sync correctness in embedded deployments.
  Whatever the plugin's current implementation reliability — including any
  spawn-time or harness-integration issues — that is the plugin's concern to keep
  healthy, not a property of this decision; but the dependency is real and is
  named here.

## Scope Boundary

This ADR **records the ownership decision** and makes the `omg-test-planner`
born-clean under it. It does **not** execute the workflow-wide refactor that
strips the old per-mode sync instructions from existing skills and commands
(`omg-builder`, `omg-commands`, `omg-decompose`, the `omg-foreman` sync
reference, and others). That migration is named here as consequent future work
and must be planned and tracked separately. **This ADR is not a license to
rewrite every skill now.**

## Related Documents

- `spec.platform.test-planning.0001` — the spec this ADR was produced for; its
  `omg-test-planner` is the first instrument born under this decision, and its
  R1.7 / server-mode Precondition are the defects this decision lets the PM
  correct.
- `src/plugins/beads.ts` — the `BeadsPlugin` this ADR names as the owner of sync
  discipline. Its implementation is its own concern and may change without
  revisiting this decision.
- `opencode/skills/omg-builder/SKILL.md`, `opencode/skills/omg-commands/SKILL.md`,
  `opencode/commands/omg-decompose.md`, `opencode/skills/omg-foreman/reference/dolt-sync.md`
  — the instruments that today embed the per-mode sync discipline this decision
  retires from the task layer.
