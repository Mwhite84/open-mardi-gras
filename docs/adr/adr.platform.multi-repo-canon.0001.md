---
schema_version: 1
id: adr.platform.multi-repo-canon.0001
type: adr
title: "Multi-Repo Canon: A Mode-Keyed Workflow Seam for Centralized Docs Across Satellite Repos"
status: draft
domain: platform
created_at: 2026-06-22T03:42:10Z
updated_at: 2026-06-27T22:54:49Z
hindsight:
  strategy: design-record
  tags:
    - source:authored
    - domain:platform
    - discipline:engineering
    - memory_type:adr
---

# ADR: Multi-Repo Canon — A Mode-Keyed Workflow Seam for Centralized Docs Across Satellite Repos

> Architecture Decision Record. Captures one decision: its context, the options
> weighed, the choice made, and the consequences accepted. An ADR is frozen once
> it ships to memory — supersede a shipped ADR with a new one rather than editing
> it. Before it ships it is a working file, refined in place.

## Status

Draft

## Context

The OMG family (the `omg-*` agents, commands, and skills) plus its helpers
(Hindsight tooling, beads) was built and proven in a **single repository**, where
the documents it produces, the code it builds, the bead database it tracks work
in, and the memory bank it ships to all sit in one tree. The goal now is to run
the same family **across a platform of many repositories** — a monolith, an
infrastructure repo, a parser library, and so on — while keeping all
durable documents (specs, ADRs, build reports, PRDs, journey maps) in **one
centralized docs repository** that every code repo can read from and write back
into. A single repo must keep working unchanged; the multi-repo arrangement is
the new capability layered on top.

The motivation is concrete. Specs and ADRs authored for one repo routinely need
to reference platform-wide documents (a PRD, a user-journey map) authored for the
platform as a whole. Memory is only valuable if it is *shared*: an agent working
the monolith should recall decisions made anywhere on the platform. And the
documents themselves are the durable record — they should live together, under
one identity scheme, not scattered one-per-code-repo where cross-reference and
collision-free identity become impossible.

### What already makes this tractable

Three prior decisions mean the family is closer to multi-repo-ready than a naive
audit would suggest, and the design leans on all three:

- **Identity is the `id`, not the path** (`adr.platform.frontmatter-schema.0001`,
  ADR-0001). Cross-document references are by dotted `id`
  (`spec.notifications.foo.0001`), which is location-independent. A satellite
  repo's spec can reference a centrally-authored PRD by `id` without caring where
  either file physically lives.
- **Paths and the bank are read from config, never hardcoded.** Commands and
  skills resolve `directories.specs`, `directories.build_reports`,
  `hindsight.bank`, and `hindsight.url` from `.workflow.yaml` at invocation. The
  config file is the single seam where "where does this repo's work live" is
  decided.
- **Shipping is already two-sourced.** The foreman ships beads from
  `bd show` (`ship-bead-from-source`) and tree documents from frontmatter
  (`ship-doc-from-tree`). Work tracking being per-repo while memory is
  per-platform is therefore already anticipated by the shipping design.

### The binding constraints

Of the usual forces, three dominate this decision and the rest are secondary:

- **Correctness of document identity.** Across many repos that all mint ids into
  one shared tree, ids must not collide. A collision is silent corruption —
  two different documents claiming one identity in memory. This is the single
  highest-stakes constraint.
- **Operability at install time.** Each new repo must be wired up by a human
  (root config files are outside the agents' edit scope), with several
  interlocking settings — paths, references, permissions, bead init. A wrong or
  missing setting **fails quietly** (ids collide, ships fail, reports land in the
  wrong tree, the minter can't reach the shared tree). Setup is the most likely
  place this breaks, so it must be made deterministic and verifiable.
- **Maintainability of the seam.** The arrangement must not duplicate
  authoritative facts (the bank connection, the docs-tree root) across repos in a
  way that drifts. One source of truth per fact, inheritable, inspectable.

Scale and cost are non-binding: the platform is a handful of repos with one
human attendant, not a fleet. Security reduces to the existing
external-directory permission model. Failure modes reduce to the install-time
operability constraint above.

### The seam, located precisely

Two opencode mechanisms carry the cross-repo relationship, and they are distinct:

- **`references`** (in `opencode.json`) is the **read** channel: it makes the
  centralized docs repo available to a satellite as named, `@`-addressable
  supporting context, and auto-allows reads of that tree.
- **`external_directory`** (a *permission*, not a directory list) is the
  **write** gate: it governs whether tools may touch paths outside the project
  boundary. A reference grants read-allow; **writing the build report back into
  the central tree does not come for free** — it needs `external_directory`
  (and `edit`) allowed on that path. The same `external_directory` permission
  also governs `bash` reaching the central tree, so the id-minter reading the
  shared tree depends on it too.

`.workflow.yaml` is where the repo declares *what it is* in this arrangement;
`opencode.json` references and permissions are the plumbing that lets the
declared relationship function. Both name the same central path, for different
reasons.

## Options Considered

### How to represent a satellite's relationship to the center

1. **Per-repo full config, no inheritance.** Each repo's `.workflow.yaml`
   restates everything, including the Hindsight connection (`url`, `bank`,
   token). Rejected: it duplicates the platform-singleton connection facts across
   every repo, so a bank or URL change means editing every satellite — the exact
   drift the maintainability constraint forbids.

2. **A generic YAML merge / `inherit` directive.** A satellite deep-merges a
   named set of blocks from the central `.workflow.yaml` (`inherit.from`,
   `inherit.keys: [hindsight]`), later-overrides-earlier. `yq` supports the
   merge. Rejected as too implicit: a generic merge makes "what is my effective
   config?" non-obvious — a reader must mentally run the merge — and it *allows* a
   satellite to override the bank locally, which we have already decided never
   makes sense for this family. The mechanism permits the very thing the
   constraint forbids.

3. **A `mode` role declaration** (`solo` | `centralized` | `satellite`) that
   *encodes the constraint as a rule* (chosen). The repo declares its role; the
   role determines whether it defines its own Hindsight connection or inherits the
   center's. A satellite **must not** define a `hindsight` block — inheriting the
   one shared bank is what "satellite" *means* — so a satellite that sets one is a
   detectable config error rather than a silently-honored wrong override. One key
   disambiguates the repo's whole behavior: connection source, docs-tree root,
   onboarding branch, and how every downstream consumer resolves config. **Chosen.**

### How a repo names where its documents live

The original directory config carried one key per document type
(`directories.specs`, `directories.decisions`, `directories.build_reports`). Two
defects follow from that shape, and both bear on binding constraints.

1. **One config key per document type (the original shape).** Rejected. It
   couples the config surface to the *template catalog*: `doc-templates` already
   defines seven types and a PM can justify more, so every new type is a config
   migration across every repo. It also offers no structural guarantee that a
   separately-named scan root and write base agree — they can be set to
   contradictory values, the exact silent-misconfiguration the operability
   constraint warns against.

2. **A single docs-location key, with internal structure derived by convention**
   (chosen). A repo specifies exactly **one** docs base. The subfolder a document
   lands in is computed from its `id` — the first dotted segment is the type
   (`adr.platform.… → adr/`), which the id grammar already guarantees (ADR-0001:
   `<type>.<domain>.<topic>.<NNNN>`). So one key serves all current and future
   types with zero per-type config, and every repo's tree has an identical
   internal shape. This is only sound *because* ADR-0001 already made the `id`,
   not the path, the identity — directory layout is therefore free to be pure
   human-facing organization. **Chosen.**

### How the id-minter finds the tree to scan, without a contradictable root

The `next-id.sh` minter must scan the **whole shared docs tree** so ids are
collision-free platform-wide. Today it discovers the tree by walking *up* from
`$PWD` to the first ancestor containing `docs/`.

1. **Keep walk-up discovery.** Rejected: in a satellite the shared tree is *off
   to the side* as an external directory, not an ancestor. Walk-up finds nothing
   (fails) or, worse, finds a stray local `docs/` and mints an id that is
   locally-unique but **collides platform-wide** — silent corruption, the
   highest-stakes failure named in the constraints.

2. **An independently-configured scan root** (e.g. a `directories.docs_root` key
   set alongside the write base). Rejected on the same ground as the per-type
   keys: two independently-set paths can disagree. A root and a base that
   contradict each other reintroduce the silent-misconfiguration the single-key
   model exists to remove.

3. **Derive the root; never specify it** (chosen). The scan root is **defined as
   the parent of the docs base** — there is no independent root key anywhere in
   the system. This one invariant ("root is the parent of the base; root is never
   specified, only derived") makes the config non-contradictory *by construction*:
   a base and a root cannot disagree because there is only one value. The minter
   reads the derived root, fails loud if it cannot resolve it, and scans
   recursively. **Chosen.** (This supersedes the just-landed `directories.docs_root`
   *key* — see "Sequencing"; the minter's read-from-resolved-source-and-scan
   behavior is retained, only the *source* of the root changes from a literal key
   to a derivation.)

### How `hindsight.md` is located

The tagging-intent `hindsight.md` (`adr.platform.hindsight-guidance.0001`) is
read by the `doc-templates` skill mid-task — sometimes via a command (where the
`!`shell trick could inject a path), sometimes by an agent that loaded the skill
directly (where it cannot). A single, context-independent resolution is needed.

1. **The `!`shell-injection trick in the command.** Rejected as insufficient: it
   only covers the command-initiated path and leaves the agent-initiated path
   uncovered.

2. **A multi-tier search (local → referenced → ask).** Workable but
   nondeterministic and chatty.

3. **A resolver script that reads the resolved guidance path from
   `.workflow.yaml`** (chosen). The skill calls a small script that returns the
   path (resolving local vs. central via `mode`); deterministic, works regardless
   of how the skill was reached, and degrades to ask-and-emit only when the key is
   genuinely absent. **Chosen.**

### Whether to require an onboarding instrument

Standing up a satellite means a human sets, by hand, several interlocking
settings whose individual failures are silent. The options were to document the
steps in prose, or to build an instrument that performs and verifies them.

1. **Prose-only onboarding doc.** Rejected: a checklist of silently-failing
   settings is exactly the operability hazard the constraints name. A human will
   miss one and discover it at first real use, not at setup.

2. **A `/omg-onboard <mode>` command → onboarding skill that discovers,
   proposes, writes-or-emits, and verifies** (chosen). It turns a coherent design
   into an adoptable one and catches the silent install failures at setup.
   **Chosen.**

## Decision

Adopt a **centralized-docs / satellite-repo topology**, seamed by a
**`mode`-keyed `.workflow.yaml`**. The pieces below are mechanisms of this one
decision, not independent decisions.

### 1. Repo topology and roles

All durable documents — regardless of which repo's agents authored them — live in
**one centralized docs repository**. Code repos ("satellites") read from it and
write their documents back into it. The centralized repo holds the shared docs
tree and is itself a participant (it authors platform-wide documents).

`.workflow.yaml` carries a top-level **`mode`** declaring the repo's role:

- **`solo`** — one repo holds code, docs, beads, and config together (the
  original single-repo arrangement, unchanged). Defines its own `hindsight`
  block.
- **`centralized`** — the docs hub. Holds the shared docs tree under per-repo
  subtrees plus a platform-wide subtree; authors platform documents; has **no
  beads** (it builds nothing). Defines its own `hindsight` block.
- **`satellite`** — a code repo. Builds, decomposes, and tracks work in its own
  local beads database; writes its documents into the central tree; **must not
  define a `hindsight` block** — it inherits the one shared bank from the central
  repo named in `central_repo`.

### 2. One docs-location key; structure derived by convention

A repo names where its documents live with **exactly one** docs-location value —
never a write base *and* a separate scan root, so the two can never disagree. Two
rules derive everything else:

- **Root is the parent of the base, and is never specified.** The minter's scan
  root — the tree it checks for id collisions — is *defined as* the parent
  directory of the docs base. There is no independent root key. This single
  invariant is what makes the config non-contradictory by construction.
- **The subfolder is the document's type, computed from its `id`.** A document is
  written to `<base>/<type>/<id>.md`, where `<type>` is the first dotted segment
  of the `id` the agent already minted (`adr.platform.multi-repo-canon.0001` →
  `<base>/adr/adr.platform.multi-repo-canon.0001.md`). The id grammar
  (`<type>.<domain>.<topic>.<NNNN>`, ADR-0001) guarantees that segment exists.
  Placement is mechanical, never chosen, so no per-type config exists and every
  repo's tree has an identical internal shape. Adding a new document type adds
  zero config.

**Sibling layout, one shared root.** Under the shared root, each participating
repo's documents live in a single named sibling directory: the centralized repo's
docs in its base (e.g. `platform/`), each satellite's in a sibling named for that
satellite (e.g. `monolith/`, `terraform/`). All siblings share the one root, so
every id across the platform lives in one collision space and the minter scanning
the root sees every repo's ids at once.

**Key names.** The single docs-location key is **`docs_base`** in every mode (the
`solo`/`centralized` repo's own base; the field a satellite reads from its
`central_repo`). A satellite's own sibling folder is **`name`**. These two are
kept *distinct* deliberately — `docs_base` is a path, `name` is a bare folder
segment composed under a root the satellite never names — so the user-facing
config never invites someone to write a path where a name belongs. The onboarding
instrument writes these; a human rarely types them by hand.

### 3. How each mode names its docs location

- **`solo` and `centralized`** specify their own docs **base**, a path within the
  repo; the scan root is its parent. `base: platform` ⇒ root `.`, docs at
  `platform/<type>/`. `base: a/b/platform` ⇒ root `a/b`, docs at
  `a/b/platform/<type>/`. (`solo` is the degenerate case — its own center with no
  satellites; `centralized` is the hub that has satellites and also authors
  platform-wide docs. They interpret the key identically.)

- **`satellite`** specifies **no path into the tree.** It carries only:
  - **`central_repo`** — the centralized repo's location (a path relative to the
    satellite, an absolute path, or an opencode reference), which must resolve to
    the directory holding that repo's `.workflow.yaml`. If it cannot resolve, the
    satellite **fails loud** — it never falls back to a local docs tree, because a
    fallback would silently re-create a divergent root.
  - **`name`** — the satellite's own sibling-folder name under the shared root
    (e.g. `monolith`).

  All tree structure is then read from `central_repo`'s `.workflow.yaml`, the sole
  authority for the tree's shape: the shared root is the parent of the central
  repo's base, and the satellite's documents go under `<root>/<name>/<type>/`.
  Because the satellite names no root-bearing path — only which central repo and
  its own folder name — it cannot derive a root different from the center's.

`central_repo` (and `name`) in `.workflow.yaml` is the **authoritative source** of
the relationship; the matching `references` / `external_directory` entries in
`opencode.json` are the permission plumbing and must agree with it.

#### The unifying invariant

Exactly one repo — the centralized one (or a solo repo acting as its own center) —
defines the docs tree's shape, via its single base key. The root is the parent of
that base and is never independently specified. Every satellite names only which
central repo it belongs to and its own folder name, carrying no path into the
tree. Therefore every participant computes the **same** shared root from the same
single authority, and id-collision-freedom holds across repos, not merely within
each.

Two guards considered for satellite `name` are deliberately **dropped as
unnecessary** under single-human-attended sessions: rejecting a slash in the name
(a nested `monolith/sub` is still under the shared root, and the recursive scan
finds it — nesting is harmless) and rejecting upward `..` escape (it takes
adversarial intent, is immediately visible in the path, and is outside the threat
model). `<root>/<name>` plus a recursive scan needs no name validation.

### 4. One shared bank, by design

When running multi-repo, **everything ships to a single memory bank.** Shared
memory across all repos is the entire purpose of the arrangement; multiple banks
would defeat it. This is the design center of the OMG family. A use case that
genuinely needs bank separation is *outside* this family's design center and is
the province of `hindsight-architecture`, with the per-bank mapping hand-wired by
the owner. The `mode` rule enforces the single-bank assumption: only non-satellite
roles may declare a bank, and a satellite inherits it.

### 5. Config resolution is `mode`-aware and single-sourced

A small **resolver helper** is the single place that, given `mode`, produces the
repo's *effective* config — both the connection and the docs paths:

- **The Hindsight connection.** For `satellite`, it pulls the `hindsight` block
  from `central_repo`'s `.workflow.yaml` and **rejects** a locally-defined
  `hindsight` block as an error; for `solo`/`centralized`, it reads the local
  block.
- **The docs paths.** It computes the scan root and the per-type write base from
  the single docs-location key: for `solo`/`centralized` the base is local and the
  root is its parent; for `satellite` it reads `central_repo`'s base, derives the
  shared root as that base's parent, and composes the satellite's base as
  `<root>/<name>`.

Every consumer calls the resolver rather than reading directory or `hindsight`
keys raw, so the inheritance, the single-bank rule, and the root-is-parent-of-base
derivation all live in exactly one place and cannot drift across call sites.

### 6. Identity is minted against the shared tree

`next-id.sh` scans the **resolver-derived root** (the parent of the docs base) —
the shared central tree for satellites and the centralized repo, the local tree
for solo — and fails loud if it cannot resolve the root rather than guessing. The
recursive scan over one shared root is what keeps ids collision-free across the
whole platform. The minter's read-from-a-resolved-source-and-scan behavior is
unchanged from the prior work item; only the *source* of the root changes — from a
literal `directories.docs_root` key to the derivation (see "Sequencing").

### 7. `hindsight.md` is resolved by script, not by search

The `doc-templates` skill locates `hindsight.md` through a resolver-backed script
that returns the guidance path deterministically (central for satellites, local
otherwise), falling back to asking the owner and emitting a snippet only when the
path is genuinely unconfigured.

### 8. Onboarding is an instrument, not a checklist

A `/omg-onboard <solo|centralized|satellite>` wrapper command routes to an
onboarding skill that, for the given mode: discovers what it can (a satellite
reads `central_repo`'s config to derive bank, paths, references, and permissions),
proposes the config, **attempts the writes and — if refused — falls back to
writing the proposed files to a temp location with placement instructions** (the
graceful-degradation path; the agent needs no knowledge of its own permission
state, since opencode's default `ask` surfaces refusals at runtime), and
**verifies** the result. A satellite onboarding **never mutates the central
repo.**

Verification confirms, per mode, the things that otherwise fail silently at first
use: that the minter resolves and reaches the shared tree (proving read/bash
across the external-directory boundary), that a test write into the docs subtree
succeeds (proving the external-directory **write** grant — the single most likely
first-run break), that the resolver yields a complete effective config, that
`hindsight.md` resolves, that the bank URL is reachable, and (satellite) that
`bd ready` works.

### 9. `doc-templates` places documents by the type-derived convention

The skill that mints and writes a document places it at `<base>/<type>/<id>.md`,
deriving `<type>` from the `id`'s first dotted segment and `<base>` from the
resolver. This is **new placement logic**: today the invoking command passes a
literal directory, and that path disappears — the skill computes placement from
the id and the resolved base instead. This is what makes the single docs-location
key sufficient for every document type.

### 10. The `canon` name is retired

`canon` was the working name of a CLI that this design — and ADR-0001 before it —
eliminated in favor of agent-driven shipping and the `next-id.sh` script. The name
now denotes nothing that exists and is a hazard: an agent may act on a dead
reference. All references to `canon`-the-CLI and the ambiguous "canon tree" are
removed; the docs tree is named by its single docs-base key, and its root is the
derived parent of that base. The bank tag *value* `source:canon` — which had
leaked into `hindsight.md` and was teaching agents to stamp it — was also retired:
the provenance value for authored documents is now `source:authored`, which names
the origin rather than a defunct tool.

## Consequences

- **Gained: shared memory and cross-repo references with collision-free
  identity.** Every repo ships to one bank and references documents by
  platform-unique `id`, minted against one shared tree. This is the capability the
  whole arrangement exists to provide.

- **Gained: the single-bank and no-local-override rules are enforced, not merely
  documented.** `mode` makes a satellite defining its own bank a detectable error.
  The constraint we agreed on is encoded in the schema's own logic rather than
  left to human discipline.

- **Gained: one source of truth per platform-singleton fact.** The bank
  connection lives once, in the centralized repo, inherited by satellites through
  `mode` + `central_repo`. Changing the bank or URL is a one-place edit.

- **Gained: a clean placement split on one test — "must this work read a
  codebase?"** Work that reads a specific repo's code runs satellite-side and
  lands in that satellite's lane: not only the build chain (decomposer,
  implementation-writer, builder, foreman) but **PM spec authoring and architect
  spec-review when the spec or ADR is *for that code repo*** — judging a feature's
  value-in-context or its buildability is squarely reading code. Only
  cross-cutting work that reads **no single codebase** — platform-wide PRDs,
  cross-cutting ADRs, journey maps — runs centrally. So PM and architect appear on
  *both* sides; the split is "needs a codebase vs. cross-cutting," not
  "authoring vs. build," and it falls naturally out of the topology.

- **Accepted: per-repo install is a human, multi-setting step.** Root config
  files are outside the agents' edit scope, so onboarding a repo means a human
  places `.workflow.yaml`, references, permissions, and bead init. The onboarding
  instrument mitigates this but does not eliminate it; the human is still in the
  loop for the writes the agent cannot perform.

- **Accepted: the same central path appears in two systems.** `central_repo` in
  `.workflow.yaml` and the `references`/`external_directory` paths in
  `opencode.json` name the same directory, because opencode's permission engine
  reads only `opencode.json` while the workflow logic reads only `.workflow.yaml`.
  This is unavoidable duplication-of-fact (not drift-prone logic); the mitigation
  is that the onboarding instrument writes both and is the documented way to
  change them, with `.workflow.yaml`'s `central_repo` named authoritative.

- **Accepted: the resolver becomes a load-bearing shared dependency.** Centralizing
  inheritance, the single-bank rule, and the root-derivation in one helper means
  every `hindsight.*` and docs-path consumer depends on it. That is the point —
  one place to be correct — but it is a component that must not regress, and
  changes to it ripple to every caller.

- **Accepted: placement moves from the command into the skill.** Today the
  invoking command passes a literal directory; under the convention the
  `doc-templates` skill computes `<base>/<type>/<id>.md` itself. This is new logic
  the skill must carry, and every command that currently reads a per-type
  directory key (`omg-spec` → `directories.specs`; `omg-spec-review`,
  `omg-spec-harden`, `omg-decompose` → `directories.decisions`; the foreman /
  `omg-build` → `directories.build_reports`) must stop reading per-type keys and
  defer placement to the resolver-plus-convention. This call-site churn is the
  bulk of the implementation and a regression surface worth a focused test.

- **Accepted: `build_reports` stops being a special case — confirmed, not
  assumed.** Under the convention a build report is `type: build-report`, so its
  documents land in a `build-report/` subfolder **iff** its `id` is minted as
  `build-report.<domain>.<topic>.NNNN`. The id grammar supports this (the first
  segment is the type), and the build-report template carries no frontmatter that
  contradicts it, so the foreman must mint the id to that grammar at authoring
  time. With that, the last explicit directory key dissolves into the convention
  and no exception remains. If a future report id were shaped differently, the fix
  is to reshape the id, not to re-add a key.

- **Accepted: a residual, negligible id-mint race.** Two satellites could
  theoretically mint the same id at the same instant, since minting reads the tree
  but does not atomically create-and-commit the file, and one working copy cannot
  see another's uncommitted file. This requires simultaneous mint *and*
  simultaneous write *and* no human or decomposer noticing the near-duplicate in
  `git status` before it ships — vanishingly unlikely under single-human-attended
  sessions. **Deliberately not designed against now.** If concurrent unattended
  multi-repo authoring ever becomes real, the fix is mint-then-commit-atomically
  or a central id allocator; it is recorded here so it is not a future surprise.

- **Scoped out — deferred to the open-mardi-gras migration, not built here:** the
  `reference: hidden: true` optimization for the large central reference; the
  "deny `omg-*` skills globally, allow the needed slice per agent" install posture
  (confirmed context-free, since a denied skill is hidden from the agent); the
  documentation that `external_directory` grants a directory the same access as the
  project root; and the explicit architect-vs-OMG single-bank boundary note. These
  are packaging-and-docs concerns for the published family, not changes to this
  topology.

- **Scoped out — unchanged by this ADR:** the frontmatter contract
  (`adr.platform.frontmatter-schema.0001`), the memory lifecycle
  (`adr.platform.memory-lifecycle.0001`), and the `hindsight.md` design
  (`adr.platform.hindsight-guidance.0001`). This ADR adds a topology and a config
  seam; it does not alter the document schema, the ship/retract lifecycle, or the
  tagging-intent model those ADRs govern.

## Sequencing

A prior work item added a `directories.docs_root` key to `.workflow.yaml` and made
`next-id.sh` read it (landed and verified). **This ADR supersedes that key's
shape:** the scan root becomes a *derived* value — the parent of `docs_base` —
never an independently configured key, so `directories.docs_root` and the
per-type `directories.{specs,decisions,build_reports}` keys are all replaced by the
single `docs_base` (plus `central_repo` + `name` for satellites). No work is
wasted: the minter's behavior this ADR needs — read the root from a resolved
source, fail loud if absent, scan recursively — is exactly what landed; only the
*source* of the root changes from a literal key to the resolver's derivation. The
`directories.docs_root` key is therefore transitional and should be removed in the
same change that introduces `docs_base` and the resolver, to avoid leaving a
contradictable root key in the schema the ADR exists to eliminate.

## Related Documents

- **`adr.platform.frontmatter-schema.0001`** — establishes id-as-identity and
  config-driven paths, the two prior decisions this topology rests on. Unchanged
  here.
- **`adr.platform.hindsight-guidance.0001`** — designs `hindsight.md`; this ADR
  adds how it is *located* across repos (the resolver-backed script) without
  changing what it is.
- **`adr.platform.memory-lifecycle.0001`** — governs shipped-memory behavior; the
  satellite foreman ships the epic and tree-sources the build report per its
  rules. Unchanged here.
- **`doc-templates` skill** — its `next-id.sh` minter scans the resolver-derived
  root; it gains type-derived placement (`<base>/<type>/<id>.md`) and a
  resolver-backed `hindsight.md` lookup.
- **`omg-foreman` skill** — the satellite foreman writes build reports into, and
  ships from, the central tree across the external-directory boundary.
- **Onboarding skill + `/omg-onboard` command (future)** — the instrument this ADR
  calls for; unbuilt, to be authored as the keystone of this work.
- **Resolver helper (future)** — the `mode`-aware effective-config resolver this
  ADR calls for; unbuilt; the single home of inheritance and the single-bank rule.
- **Central id-allocation / atomic mint (future, deferred)** — the fix for the
  residual mint race if concurrent unattended multi-repo authoring ever arrives;
  explicitly not built now.
