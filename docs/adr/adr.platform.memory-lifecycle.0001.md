---
schema_version: 1
id: adr.platform.memory-lifecycle.0001
type: adr
title: "Shipped Memory Is Immutable: Lifecycle, Supersession, and Sourcing"
status: draft
domain: platform
created_at: 2026-06-19T02:33:06Z
updated_at: 2026-06-20T03:05:36Z
hindsight:
  strategy: design-record
  tags:
    - source:authored
    - domain:platform
    - discipline:engineering
    - memory_type:adr
---

# ADR: Shipped Memory Is Immutable — Lifecycle, Supersession, and Sourcing

> Architecture Decision Record. Captures one decision: its context, the options
> weighed, the choice made, and the consequences accepted. An accepted ADR is an
> immutable record — supersede it with a new ADR rather than editing it.

## Status

Draft

## Context

`adr.platform.frontmatter-schema.0001` decided the **frontmatter contract**: a
document's frontmatter is a serialized Hindsight retain call, and the presence of
a `hindsight` block marks the document as memory to be shipped. It deliberately
scoped out everything that happens *after* a document is identified as memory —
how memory is shipped, frozen, changed, and retired. This ADR decides that
pipeline.

The forces that make this decision necessary:

- **Documents flow through a multi-stage authoring process, then become beads.**
  A product manager drafts a spec; an architect reviews it and may produce ADRs;
  the PM revises; an implementation-writer folds the technical detail in; the
  decomposer mints an epic (carrying the spec) and `decision` beads (carrying the
  ADRs), then breaks the epic into child work. Each stage mutates the documents.
  At some point that mutation has to stop, or memory and the documents drift
  apart and there is no single truth.

- **Drift between a document, its bead, and its Hindsight entry is the core
  hazard.** If any of the three can change independently after the others are
  derived from it, the shipping pipeline must reconcile three mutable copies —
  the exact merge problem where bugs live. The whole pipeline becomes tractable
  if, past a defined point, nothing changes in place.

- **Memory can lie in two directions if the freeze point is wrong.** Freeze too
  early (at decomposition / mint) and an epic that was decomposed but whose work
  was never finished ships to memory as completed work — *phantom finished work*.
  Freeze never, and a spec rewritten after shipping leaves Hindsight holding a
  stale version while the tree holds a newer one. The freeze must land exactly at
  the moment content enters memory, not before.

- **Not every memory is a unit of work.** Specs and ADRs are both work (they
  decompose / they are decisions) and memory. But PRDs, high-level designs, and
  vision/mission documents are durable memory that nothing decomposes — they have
  no bead. The pipeline must ship them too, from somewhere other than a bead.

- **The plan and the built reality diverge, and the divergence is lost.** When an
  agent implements a child bead and deviates from its description, it records the
  deviation as a comment on the child (per the `omg-build` runbook). Those
  comments are durable in beads but are too granular and noisy to ship to memory.
  So memory holds the *plan* (the frozen spec/ADRs) and loses the *delta between
  plan and reality*. A future agent reads the spec from memory and believes it is
  what was built.

- **The original `canon` was conceived as a CLI** that would own document
  management, ID minting, validation, and shipping. The frontmatter-schema ADR
  already gutted most of that. What remains needs a clear answer to "is this a
  binary we build, or a runbook an agent follows?"

The binding constraints are **correctness** (memory must never silently
disagree with itself), **abuse of neither direction** (no phantom finished work,
no stale memory), and **minimal machinery** (do not build a tool where a runbook
suffices; ADR-0001 deleted a document-management spine and this ADR must not
re-grow one through a back door).

## Options Considered

1. **Mutable documents with a reconciling shipper.** Let documents, beads, and
   Hindsight entries each change independently; have the shipper diff and merge
   them on every run. Rejected: this is the three-way merge problem. It needs
   change detection, conflict resolution, and a notion of "which copy is
   authoritative right now" that shifts over time. It is the most code and the
   most ways to be subtly wrong.

2. **Freeze at mint (decomposition).** Make a bead immutable the moment it is
   created. Simple, but it ships phantom finished work: an epic decomposed and
   then abandoned would enter memory as a completed plan, and an epic cannot
   accumulate honest working notes between mint and completion because it is
   already frozen. Rejected — the freeze point is too early.

3. **Freeze at ship, with supersession as the only edit path (chosen).** Content
   is mutable up to the moment it ships to Hindsight; shipping is the freeze.
   After that, no in-place edit ever — a change is a new document with a new `id`
   that supersedes the old, the old is retracted from memory, and the new is
   shipped. One law for everything that ships, whether it came from a bead or
   straight from the tree. Chosen: it removes drift by construction (memory only
   ever holds frozen content), it defers the freeze to the honest moment (content
   enters memory only when it is real), and "change = supersede" is a create +
   delete, never a merge.

4. **Ship build-time deviations as raw child comments.** Considered for capturing
   the plan/reality delta. Rejected: it relocates the noise into memory. Memory
   should hold a synthesized account of how the build differed from the plan, at
   the abstraction a future agent needs — not dozens of granular per-child notes
   to reassemble.

## Decision

### 1. Shipped memory is immutable; the freeze is at ship

A document, and the bead that carries it, are **mutable between authoring and
shipping** and **immutable once shipped** to Hindsight. Shipping is the freeze
point — not authoring, not minting the bead.

- An **ADR** or other decision document is decided when it is recorded: its bead
  mints, ships, and closes in close succession.
- An **epic** (carrying a spec) is minted with its memory state `pending` and is
  **shipped only at close**, once the work is actually done. This guarantees
  decomposed-but-abandoned work never enters memory as phantom finished work, and
  lets the epic accumulate honest working notes (comments) between mint and close
  without mutating anything already in memory.

Once shipped, content is never edited in place.

### 2. Change is supersession, never editing

To change shipped memory:

1. Author a **new** document with a **new `id`** and `supersedes: <old-id>` in
   its frontmatter; set `superseded_by: <new-id>` on the old document.
2. Ship the new document (it becomes new memory).
3. **Retract** the old document from Hindsight **by its `id`** (Hindsight
   supports delete-by-`id`), and mark the old bead superseded.

The old bead is **kept, never deleted** — it is the audit record of what was once
true and why it was replaced. Deleting the old entry from Hindsight and shipping
the clean replacement keeps *memory* accurate; keeping the bead keeps *history*
auditable. This is the same supersession discipline an accepted ADR already
follows, extended to beads and to Hindsight.

### 3. The Hindsight state lifecycle rides on one state dimension

A shippable bead carries a single `hindsight` **state dimension**, managed with
`bd set-state` (atomic: it swaps the dimension's label and records an event).
Values:

- `pending` — has a `hindsight` block, not yet shipped. The ship queue.
- `shipped` — retained in Hindsight. The freeze point and steady state.
- `tombstoned` — superseded, awaiting retraction. The retract queue.
- `retracted` — removed from Hindsight; the old bead is closed as superseded but
  retained as the audit record.

No `hindsight` label means the bead is not memory.

A **tree-sourced** document (one with no bead — see §4) cannot carry a bead
label, so it records the same fact with a **frontmatter shipped-marker** the
shipper writes on ship and skips on later runs. The marker is *not* an mtime or
`ingested_at` comparison — file mtime is rewritten by clone, checkout, and copy,
which would re-introduce drift. The marker need only carry enough to retract; the
`id` already in frontmatter is the Hindsight delete key, so a boolean/state value
plus the `id` suffices.

### 4. Bead-ness and ingestion are independent; sourcing is derived

"Becomes a bead" and "ships to Hindsight" are **two independent axes**:

- **Bead-ness** is a *workflow event*: decomposition runs on work documents
  (specs → epics, ADRs → decision beads). It is not a property the author
  declares in frontmatter — frontmatter describes the document, it does not
  control downstream processes. (There is deliberately no `beads.*` gate; adding
  one would re-grow the document-management spine ADR-0001 deleted.)
- **Ingestion** is a *document property*: presence of a `hindsight` block.

The two combine:

| Document | Bead? | Ships to Hindsight? |
|---|---|---|
| Spec | yes (epic) | yes |
| ADR | yes (decision) | yes |
| PRD, HLD, vision, mission | no | yes — from the tree |

So the shipper has **two sources**, and the source is **derived, not
configured** — there is no `type → source` map and no path rule (both would
re-grow the deleted spine):

- A document is **bead-sourced** iff a bead carries its `id`. The bead is the
  frozen authority; its `--metadata` carries the frontmatter and its body carries
  the content.
- Otherwise it is **tree-sourced**: shipped directly from the file in the canon
  tree.

On conflict — the same `id` present both as a bead and in the tree — **the bead
wins**. The bead is the frozen, shipped authority; the tree file is the mutable
working copy that fed it. Tree-sourcing applies only to ids with no bead.

Immutability is across the board: a shipped **tree-sourced** document is frozen
exactly like a bead. Changing it is a supersession (new `id`, `supersedes:`,
retract the old `id`, ship the new), never an in-place edit. One law, two storage
mechanisms for the shipped-marker (bead label vs. frontmatter value).

### 5. Build-time deviations become a build-record document

When build reality diverges from the plan, the divergence is captured as its own
immutable memory rather than by mutating the frozen plan:

- Child-bead deviation comments stay on the child as the raw source.
- At the epic's review bead, the **review agent synthesizes** those deviations
  into a dedicated in-tree **build-record document** — its own `id`, a `hindsight`
  block, and a `produced_for` / `records_build_of` link to the spec it records.
- It ships **tree-sourced** to Hindsight as a separate immutable memory. The plan
  (the frozen spec/epic) and the outcome (the build record) coexist as two linked
  documents; neither overwrites the other.

A build record is written **only when deviations exist.** A "built as specified"
record shipped for every epic would accumulate low-signal noise in memory with
unforeseen retrieval consequences; its absence means "no recorded divergence."

### 6. `canon` is an agent skill plus a deferred poller, not a CLI

What remained of the original `canon` after ADR-0001 was: ship the `pending`
queue, retract the `tombstoned` queue, ship tree-sourced documents, and mint
collision-free ids. Examined directly:

- Shipping and retracting are **`bd` queries plus Hindsight retain/delete
  calls** — an **agent-driven shipping skill**, not a binary. (`bd list --label
  hindsight:pending` to ship; `bd list --label hindsight:tombstoned` to retract.)
- ID minting is the **`next-id.sh`** script in the `doc-templates` skill, which
  scans the canon tree for the prefix and returns the next free counter.

So no general-purpose `canon` CLI is built for the manual workflow. The **only**
genuine future binary is a **headless poller** (e.g. in k3s) for *unattended*
ingest: beads has no event-push (its events are audit records, gates are
poll-based, and `bd hooks` are git hooks), and the Dolt remote is vanilla Dolt
with no beads binary and not a git working tree — so an interactive agent cannot
serve unattended automation. That poller, when wanted, runs against the same
`pending` / `tombstoned` queues. It is explicitly not a git hook and not a forked
Dolt image.

## Consequences

- **Gained: no reconciliation logic, ever.** The shipper only creates and
  deletes; it never diffs or merges three mutable copies. Memory holds only
  frozen content, so it cannot silently disagree with its source.
- **Gained: memory never lies in either direction.** Epics ship at close, so
  decomposed-but-unbuilt work never appears as finished; shipping freezes
  content, so a later rewrite cannot leave memory stale (the rewrite is a new,
  separately-shipped document).
- **Gained: plan and outcome both retained, distinctly.** The frozen spec records
  what was intended; the build record records how reality differed. A future
  agent retrieves both and is not misled into believing the plan is the build.
- **Gained: one law, uniformly applied.** Bead-sourced and tree-sourced memory
  obey the same immutability/supersession rule, differing only in storage
  mechanism. There is no special case to remember.
- **Gained: minimal machinery.** Shipping is a skill, id-minting is a script, and
  only genuinely-unattended automation needs a binary. No CLI re-grows the
  document-management spine.
- **Accepted: a change is heavier than an edit.** Fixing even a typo in shipped
  content means minting a new `id`, superseding, retracting, and re-shipping. This
  is the intended cost — shipped content is *memory*, and casual in-place rewrites
  of memory are exactly what this ADR forbids. The mitigation is that content is
  fully mutable until it ships, so the bar is "be confident before shipping," not
  "never make mistakes."
- **Accepted: the dirty-flip and shipped-marker are disciplines.** A bead changed
  before shipping must be left `pending`, and a superseded one must be
  `tombstoned`; a tree doc must get its marker on ship. `bd set-state` is atomic
  and event-backed, so no wrapper is needed for the bead toggle — but if the
  manual discipline proves fragile, a thin wrapper script is the fallback, not a
  redesign.
- **Accepted: source resolution scans for bead-vs-tree on every ship.** Deriving
  the source (does a bead carry this `id`?) rather than configuring it costs a
  lookup per document, but it never drifts and needs no `type`/path map to
  maintain.
- **Accepted: several supporting artifacts are unbuilt.** The agent-driven
  shipping skill, the build-record template in `doc-templates`, the `omg-review`
  synthesis step, and the deferred k3s poller are named here but not yet written.
  Each is built when its workflow is actually wired.

## Related Documents

- `adr.platform.frontmatter-schema.0001` — the companion decision. That ADR
  defines the frontmatter *contract* (the bank-agnostic half of a retain call; a
  `hindsight` block marks memory); this ADR defines the *pipeline* that acts on it
  (freeze, supersede, source, retract).
- `adr.platform.hindsight-guidance.0001` — designs `hindsight.md`, the per-project
  tagging intent an authoring agent reads to fill the `hindsight` block this
  pipeline ships.
- `.workflow.yaml` — the project connection config (bank id, Hindsight url, token)
  the shipper reads, per the frontmatter-schema ADR's A7. There is no separate
  "sync-config defaults" file: the prior design's default-tags map and
  `type → memory_type` table were removed when the contract became bank-agnostic.
- `README.md` — the platform-docs system this pipeline serves.
- Build-record template / `omg-review` synthesis step (future) — the artifacts
  that implement §5.
