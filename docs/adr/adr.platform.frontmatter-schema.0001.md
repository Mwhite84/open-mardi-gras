---
schema_version: 1
id: adr.platform.frontmatter-schema.0001
type: adr
title: Frontmatter as the Bank-Agnostic Half of a Hindsight Retain Call
status: draft
domain: platform
created_at: 2026-06-12T00:00:00Z
updated_at: 2026-06-20T02:20:24Z
hindsight:
  strategy: design-record
  tags:
    - source:authored
    - domain:platform
    - discipline:engineering
    - memory_type:adr
---

# ADR: Frontmatter as the Bank-Agnostic Half of a Hindsight Retain Call

> Architecture Decision Record. Captures one decision: its context, the options
> weighed, the choice made, and the consequences accepted. An ADR is frozen once
> it ships to memory — supersede a shipped ADR with a new one rather than editing
> it. Before it ships it is a working file, refined in place.

## Status

Draft

## Context

This repository holds Markdown documents that become entries in a Hindsight
memory bank. The frontmatter on each document supplies arguments to a Hindsight
**retain** call. The design question is: what shape should that frontmatter take,
and *what knowledge belongs in it* versus elsewhere?

An earlier draft started from "this is a documentation system" and treated
Hindsight as a thin downstream sync target. That produced a rich
document-management model — a fixed `type` enum, status transitions,
supersession chains, slug-derived IDs, per-`(type, domain)` counters — and left
the Hindsight side starved: it carried `ingest`, `bank`, and a `document_id`, but
**not** the `strategy` or `tags` a retain call actually needs. A second draft
corrected that by declaring **"frontmatter *is* the retain call."** That was
closer, but it over-reached in the opposite direction: it baked **one bank's
vocabulary and policy** into the frontmatter contract itself.

Concretely, the second draft hardcoded into the normative schema things that are
true only of *this* project's bank:

- a **required "provenance core"** of `company:`, `source:`, and `memory_type:`
  tags, as if every bank everywhere shares that notion of provenance;
- a **`type → memory_type` derivation table**, mapping document types to *this*
  bank's `memory_type` label vocabulary;
- the assumption that a `domain:` tag, with this bank's domain values, is part of
  every retain call.

None of that is universal. The legal values of `memory_type` and `domain`, which
tags a bank requires, and which retain strategies exist all live in the **bank's
own configuration**, which is defined and enforced **inside Hindsight** — it does
not live in this repository at all. A contract that hardcodes that vocabulary
cannot be reused by another project, or by this owner on a different project with
a different bank, without editing the contract. That is a leak: bank-specific
knowledge sitting in a place that is supposed to be bank-agnostic.

Three facts drive the reframe in this draft:

- **The system is agent-first.** Frontmatter is normally authored by an agent,
  not hand-typed by a human (though a human may). The consumer of any
  vocabulary-mapping is therefore an agent that can *reason*, not a dumb program
  that needs a lookup table. This is the same insight that retired the `canon`
  CLI (see the memory-lifecycle ADR): the operations are agent skills, so a rigid
  config table is the wrong tool — judgment from guidance is the right one.
- **The bank is the only source of truth for its own vocabulary, and this repo
  does not mirror it.** A `memory_type` added in the Hindsight UI is authoritative
  immediately; nothing here is synced to it. So no in-repo artifact — neither a
  config map nor a committed copy of the bank template — can be a trustworthy
  vocabulary source. Storing one manufactures a second source of truth that
  silently rots.
- **Documents already living here don't fit a rigid document-management model.**
  The business-plan documents under `hindsight/business/plan/` (mission, vision,
  core values) are durable company memory authored elsewhere, with their own
  shape. A model built around design-doc authoring rejects them.

So this ADR is reframed again, more precisely: **frontmatter is the
bank-agnostic, per-document half of a retain call. The bank-specific half —
which tags to write, what they mean, which strategy fits — is supplied by an
agent's judgment from per-project guidance, and the connection facts come from
project config. The frontmatter contract names no bank vocabulary.**

## Options Considered

1. **Document-management model with Hindsight as downstream sync** (the first
   draft). Rich `type`/`status`/supersession model; a translation layer maps our
   vocabulary to the bank's. Rejected: it answers "how do we run a docs site and
   review workflow," not "how do we build a correct retain call," and it
   manufactures a two-vocabulary translation problem. It also can't ingest the
   documents already in the repo.

2. **Frontmatter *is* the retain call, with the bank's policy hardcoded** (the
   second draft). The block mirrors the retain API, and the contract additionally
   *guarantees* a `company:`/`source:`/`memory_type:` provenance core and derives
   `memory_type` from `type` via a built-in table. Rejected: it bakes one bank's
   vocabulary and required-tag policy into a contract meant to be reusable. A
   different bank — or this owner on another project — would have to edit the
   contract. The hardcoded core, the derivation table, and the `domain:`-tag
   assumption are all leaks of bank-specific knowledge into a bank-agnostic place.

3. **A declarative config map in `.workflow.yaml`** (`type → memory_type`,
   id-domain → bank-domain, a required-tag policy). Considered as the fix for
   option 2's leak: move the bank-specific mapping out of the contract and into
   project config. Rejected: it solves the leak but at real cost. The consumer of
   this mapping is an **agent**, not a dumb program, so a rigid lookup table asks
   a reasoning system to execute what it could derive — and the table breaks the
   moment a new id-domain or `memory_type` appears that no row covers. The map
   would grow hairy and need editing on every taxonomy change, re-coupling the id
   grammar to bank vocabulary.

4. **Bank-agnostic contract; bank-specific tagging is agent judgment from
   per-project guidance** (chosen). The frontmatter contract defines only
   structure — a `hindsight` block whose presence is the ship signal, carrying a
   `strategy` and free-form `key:value` `tags` — and names **no** bank
   vocabulary. Connection facts (`bank` id, Hindsight `url`, token) live in
   `.workflow.yaml`. The project's tagging *intent* — what the dimensions mean,
   when each tag applies, the fact-vs-opinion distinction — lives in a prose
   `hindsight.md`. An authoring agent reads that guidance and *reasons* its way to
   the right tags and strategy, the same way it already reasons its way to a
   document's `id`. The authoritative vocabulary stays where it actually
   lives — inside the running bank — and is **not mirrored** here. **Chosen.**

### Sub-decisions

- **Tags are free-form, never validated against bank vocabulary.** The ship
  process cannot know the bank's label vocabulary without mirroring it, which this
  ADR refuses to do. It passes tags through, checking only that each is a
  well-formed `key:value`. (Carried unchanged from the prior draft — it was the
  one place that draft resisted the leak.)
- **No required provenance core in the contract.** Which tags a document *must*
  carry is a project policy, expressed as guidance in `hindsight.md`, not a law
  baked into the schema. The contract guarantees nothing about tag *content*.
- **No `type → memory_type` derivation.** `type` is a bank-agnostic
  document-management field (it says what *kind of document* this is). It does not
  derive any tag. Whether an `adr`-typed doc gets a `memory_type:adr` tag is an
  agent's judgment from `hindsight.md`, not a contract rule — another bank may map
  it differently or have no `memory_type` axis at all.
- **No bank-specific tag is named, not even as an example to avoid.** Earlier
  drafts called out `company:` as a "supported but unused" mechanism. Removed: the
  general rule "tags are free-form, write what your bank needs" already subsumes
  it, and naming a tag the project does not use is clutter.
- **`bank` is not a frontmatter field.** There is one bank; it lives in
  `.workflow.yaml`. A per-document `bank` override has no consumer today and would
  let any document silently redirect itself out of the bank. If a second bank ever
  exists it is a new lane with its own ship config, decided then.
- **Field shape is a nested `hindsight:` block**, grouping the retain-call
  arguments under one key, cleanly separated from document metadata.
- **Identity is a single top-level `id`.** One value is the document's identity,
  the beads `spec_id`, and the Hindsight retain upsert key. There is no separate
  `hindsight.document_id`: putting the id inside the block over-emphasized the
  memory layer and forced a redundant `id == document_id` rule. The retain
  `document_id` argument is supplied from this top-level `id` at ship time.
- **The presence of the `hindsight` block is the ship signal.** There is no
  `ingest` boolean: a document with a `hindsight` block is memory and ships; a
  document without one stays in Git only. Exclusion is the rare act of omitting
  the block — if a document is worth writing it is worth remembering.

## Decision

### Where each kind of knowledge lives

This ADR's core decision is a separation of concerns across four homes. The
frontmatter contract owns only the first.

| Layer | Holds | Committed here? | Consumer |
|---|---|---|---|
| **Frontmatter** (this ADR) | bank-agnostic *structure*: the `hindsight` block, `key:value` tags, `id`/`type`/cross-refs | yes | everyone; names no bank vocabulary |
| **`.workflow.yaml`** | connection facts: `bank` id, Hindsight `url`, optional token | yes | the deterministic shipper |
| **`hindsight.md`** | the project's tagging *intent*: what the tag dimensions mean, when each applies, the fact-vs-opinion distinction | yes | the authoring agent (judgment) |
| **the running bank** | the authoritative *vocabulary*: legal `memory_type`/`domain` values, retain strategies | **no — lives only in Hindsight** | Hindsight enforces; an agent may fetch it live if ever needed (deferred) |

The bank's configuration template is **not** an artifact of this system. A user
may paste it into a session to inform the conversation that writes `hindsight.md`,
but it is ephemeral input, not a committed, skill-consumed file. Storing a copy
would create a second source of truth that cannot be kept in sync with the bank.

### The `hindsight` block

A document that should become memory carries a `hindsight` block. Its **presence
is the ship signal**, and it carries the per-document half of the retain call:

```yaml
hindsight:
  strategy:   # optional; names a bank retain strategy. Omit → bank default extraction
  tags:       # the retain tags[], free-form key:value, authored by judgment
```

The `bank` is **not** here — it comes from `.workflow.yaml`. The retain
`document_id` is **not** here — it is supplied from the top-level `id` (see
Document identity). The shipping process assembles the retain call from three
sources: `bank_id` ← `.workflow.yaml`; `document_id` ← top-level `id`; `strategy`
and `tags` ← this block; content ← the document body. There is no vocabulary
translation step, because the contract carries no vocabulary to translate.

### Tags are free-form and judgment-authored

`tags` is a list of `key:value` strings. The contract checks only that each is
well-formed (`^[a-z][a-z0-9_-]*:.+$`); it never validates a tag *value* against
the bank's vocabulary, and it requires no particular tag. *Which* tags to write,
and what they mean, is the authoring agent's call, guided by `hindsight.md`.

For *this* project, that guidance leads an agent to write tags such as
`source:<producer>` (which distinguishes, e.g., a transcribed voice memo — owner
opinion — from a source-of-record document — fact, a distinction the bank's
reflect layer actively consumes), `memory_type:<shape>`, and `domain:<area>` in
the bank's domain vocabulary. **None of those tag keys or values are part of this
contract** — they are stacked-chips' tagging policy, recorded in `hindsight.md`,
and a different project writes whatever its bank needs (or nothing).

The accepted cost: because the contract holds no vocabulary, the shipper cannot
catch a mistyped tag value (`memory_type:speced`). That is unchanged from prior
drafts and inherent to not mirroring the bank — the guardrail is the authoring
agent reasoning from `hindsight.md` and the constrained vocabulary it knows from
the authoring conversation, not a ship-time gate.

### Retain strategy

`strategy` names a bank retain strategy (e.g. `design-record`, `source-document`,
`voice-memo`). It is a direct retain argument and optional: omitting it uses the
bank's default extraction. The strategy *names* are bank-specific — the contract
treats `strategy` as an opaque string and does not enumerate valid values. The
authoring agent chooses one by judgment from `hindsight.md`; the shipper does not
force a class.

### Ship signal

A document ships if and only if it carries a `hindsight` block. There is no
`ingest` boolean and no `status` gate: presence of the block is the whole signal.
A document with no `hindsight` block stays in Git and never becomes memory.
(Lifecycle — when a *shipped* document is frozen, superseded, or retracted — is
governed by the memory-lifecycle ADR, not by a frontmatter gate here.)

### Top-level document metadata

These are bank-agnostic document-management fields. `id` is required (it is the
identity and the retain upsert key); `type` is required (it says what kind of
document this is — true in any project). The rest are optional, useful to humans
and tooling, and none participate in vocabulary mapping.

```yaml
id:            # REQUIRED; canonical document identity AND the retain document_id
schema_version:# REQUIRED; integer, 1 under this ADR
type:          # REQUIRED; what kind of document this is (adr, spec, prd, …).
               # Bank-agnostic. Does NOT derive any tag.
title:         # human title
status:        # draft|proposed|final|deprecated|superseded — descriptive only, no gate
domain:        # the bounded context (platform, notifications, subscriptions, …),
               # i.e. the second id segment. Ships as the `domain:` tag — see below.
created_at:    # RFC 3339 UTC
updated_at:    # RFC 3339 UTC
supersedes:    # optional id this replaces
superseded_by: # optional id that replaces this
produced_for:  # optional id this document was produced in service of
               # (e.g. an ADR points at the spec whose review prompted it)
tags:          # optional extra doc-level tags (merged into hindsight.tags)
```

The shipping process neither requires nor invents tag content from these. In
particular, **`type` does not derive a `memory_type` tag** — that mapping was a
bank-specific leak and is removed. A document with no `memory_type:` tag still
ships; whether that is desirable is the authoring agent's judgment, not a
contract rule.

### `domain` is the bounded context; `discipline` is the function

An earlier draft overloaded the word "domain" onto two unrelated things — the
id-tree segment and a company-function tag (`domain:engineering`) — and had to
warn that they were "deliberately distinct." That overload is removed.
Domain-Driven Design settles the word: a **domain is a bounded context**, so:

- the **top-level `domain` field** is the bounded context (`platform`,
  `notifications`, `subscriptions`) — the second id segment, the problem area the
  document concerns. It ships **mechanically** as the `domain:` tag, so the field
  and the tag are the *same* dimension with the *same* value. No "two domains."
- the **functional discipline** — who owns the work — is a separate tag,
  **`discipline:`** (`engineering`, `product`, `business`, …), authored by
  judgment. A `notifications` spec is `domain:notifications` + `discipline:engineering`.

The contract itself still names no tag vocabulary (the values live in the bank and
`hindsight.md`); this section only records that the id-tree segment *is* the
bounded-context `domain`, not a separate thing from the bank's `domain:` tag.

### Document identity

The top-level `id` is the stable identity and the idempotent retain upsert key.
It must be stable across renames and edits; re-shipping a document with the same
`id` updates its Hindsight entry rather than duplicating it. The same `id` is
used as the beads `spec_id`, so one value identifies the document everywhere it
appears.

The schema does not mandate a particular id grammar — any stable, unique string
is valid. This repo uses a dotted form (`adr.platform.frontmatter-schema.0001`,
`type.domain.topic.NNNN`) for authored canon documents because it sorts and
reads well, minted collision-free by the `next-id.sh` script in the
`doc-templates` skill. That is a convention, not a schema requirement; identity
validation requires only that `id` is present, non-empty, and unique within the
repository.

## Consequences

- **Gained: the contract is reusable across banks and projects.** Because it
  names no `memory_type`, `domain`, strategy, or required-tag policy, another
  project — or this owner on a different project — reuses it by writing a
  different `.workflow.yaml` and `hindsight.md`, with no edit to the contract. The
  bank-specific knowledge that the prior draft hardcoded now lives where it
  belongs.
- **Gained: no config map to grow hairy.** The judgment that picks tags and a
  strategy is the authoring agent's, guided by prose — not a `type → memory_type`
  table or a mapping layer that would need editing on every taxonomy change.
  Consistent with the agent-first posture that already retired the `canon` CLI.
- **Gained: one source of truth for vocabulary, never mirrored.** The legal
  `memory_type`/`domain` values and strategies live only in the running bank.
  Nothing here claims to be that list, so nothing here can rot into a confidently-
  wrong copy.
- **Gained: documents already in the repo fit immediately.** The business-plan
  files become valid by adding a `hindsight` block with the tags and strategy an
  agent judges appropriate — no `type` enum or provenance-core law to satisfy.
- **Accepted: tag values are not validated against the bank vocabulary.** A typo
  (`memory_type:speced`) ships and mis-filters. The only thing that *could* catch
  it is Hindsight, which this ADR deliberately does not mirror. The guardrail is
  the authoring agent reasoning from `hindsight.md`, not a ship-time gate.
- **Accepted: tag authoring is non-deterministic.** Two agent runs could tag the
  same document slightly differently. This is the same latitude an agent already
  has writing the body; the mitigation is a constrained vocabulary and explicit
  guidance, not a deterministic map (which only ever guaranteed *consistent*
  wrongness, not *correct* classification).
- **Accepted: `hindsight.md` can lag the bank.** A `memory_type` added in the
  Hindsight UI is invisible to authoring until `hindsight.md` is updated. This
  drift is **not introduced by this design** — it exists for any in-repo
  description of a bank that lives elsewhere, including a config map. The eventual
  fix, **if drift ever bites**, is to fetch the bank's vocabulary live at
  authoring time (if an API exists); mirroring the bank config in the repo is the
  wrong fix and is explicitly avoided. Live-fetch is **deferred** — overkill
  today.
- **Scoped out, by design:** how *shipped* memory is frozen, superseded, and
  retracted lives in the memory-lifecycle ADR, not here. This ADR fixes only the
  *frontmatter contract*. `status` is descriptive metadata, not a gate.
- **Scoped out: the `hindsight.md` mechanism is a separate decision.** The
  purpose and shape of `hindsight.md`, the skill that interviews the owner to
  author it, and the extension to `doc-templates` that consumes it when filling
  the `hindsight` block are a *new mechanism* deserving their own record. They are
  named here as the home of tagging intent but **not designed here** — see Related
  Documents.
- **Accepted:** ids are not minted by a tool that owns creation. Authors and
  agents create documents and mint the `id` with the `next-id.sh`
  collision-avoidance script (`doc-templates` skill); identity is *validated*, not
  *owned*, with uniqueness enforced at ship time, not prevented at creation.

## Appendix: Normative Specification

This appendix is binding on whatever ships documents (today an agent-driven
shipping skill; the memory-lifecycle ADR governs how shipping is carried out).
"The shipping process" below refers to that, not to a `canon` binary.

### A1. The `hindsight` block

Its **presence** marks the document for shipping; there is no `ingest` field. The
`bank_id` comes from `.workflow.yaml` (A7), not this block. The retain
`document_id` comes from the top-level `id` (A5), not this block.

| field    | required | type / constraint                              |
|----------|----------|------------------------------------------------|
| tags     | no       | list of `key:value` strings                    |
| strategy | no       | non-empty string; a named bank retain strategy |

A `key:value` tag matches `^[a-z][a-z0-9_-]*:.+$`. The shipping process does not
constrain the value beyond that pattern, and does not validate it against any
bank vocabulary.

### A2. Tag policy

The contract requires **no** particular tag. Which tags a document must carry,
what they mean, and which values are legal are **not** defined here — they are the
project's tagging policy, expressed as guidance in `hindsight.md` and applied by
the authoring agent's judgment. The shipping process neither stamps default tags
nor derives tags from other fields. (There is no required provenance core and no
`type → memory_type` derivation; both were bank-specific and are removed.)

### A3. Ship signal

A document ships **iff** it carries a `hindsight` block. There is no `ingest`
field and no `status` gate. A document with no `hindsight` block is valid but
never shipped. Validation does not require a `hindsight` block — a Git-only
document is well-formed.

### A4. Retain-call construction

The shipping process builds the retain call as:

- `bank_id` = the bank from `.workflow.yaml` (A7)
- `document_id` = top-level `id`
- `strategy` = `hindsight.strategy` if present, else omitted (bank default)
- `tags` = `hindsight.tags` merged with any top-level `tags`, passed through
  verbatim (no stamping, no derivation)
- content = the document body (everything after the frontmatter)

Re-shipping with an unchanged `id` is an idempotent upsert.

### A5. Top-level fields

`id`, `schema_version`, and `type` are required; the rest are optional
document-management metadata. All are bank-agnostic — none names or maps to bank
vocabulary.

| field          | required | type / constraint                                    |
|----------------|----------|------------------------------------------------------|
| id             | yes      | non-empty string; unique within the repository; the retain `document_id` |
| schema_version | yes      | integer; `1` under this ADR                          |
| type           | yes      | non-empty string; what kind of document this is. Bank-agnostic; derives no tag |
| title          | no       | non-empty string                                     |
| status         | no       | one of draft, proposed, final, deprecated, superseded; descriptive only |
| domain         | no       | non-empty string; id-tree domain (distinct from any bank `domain:` tag) |
| created_at     | no       | RFC 3339 date-time, `Z` (UTC)                        |
| updated_at     | no       | RFC 3339 date-time, `Z` (UTC)                        |
| supersedes     | no       | non-empty string (an id)                             |
| superseded_by  | no       | non-empty string (an id)                             |
| produced_for   | no       | non-empty string (an id)                             |
| tags           | no       | list of `key:value` strings; merged into `hindsight.tags`, passed through verbatim |

`schema_version` lets the first schema migration identify documents that predate
it; `id` is the identity every other system keys on. `owners` and `repos` from
prior drafts are removed — neither had a consumer.

### A6. Validation duties

Validation enforces: `id`, `schema_version`, and `type` present; `id` non-empty
and unique within the repository; tags well-formed per A1 when present; `status` a
valid enum value when present; RFC 3339 dates when `created_at`/`updated_at`
present; no obvious secrets.

Validation does **not** enforce tag-value vocabularies (the bank owns those and is
not mirrored here), required-tag policy (that is `hindsight.md` guidance, not a
gate), status transition legality, or supersession retirement (memory-lifecycle
ADR). Nor does it resolve cross-document reference fields (`supersedes`,
`superseded_by`, `produced_for`): when present they must be well-formed id strings
(A5), but the referenced document is not verified to exist — a document may
legitimately reference one in another repo or one authored later. Adding any of
these checks is a future decision, not a silent code behavior.

### A7. Project connection config (`.workflow.yaml`)

The bank-specific connection facts live in `.workflow.yaml`, not in any
document's frontmatter:

| key            | required | type / constraint                                        |
|----------------|----------|----------------------------------------------------------|
| bank           | yes      | non-empty string; the Hindsight `bank_id` for this project |
| url            | yes      | the Hindsight endpoint                                    |
| api_token      | no       | token; **sourced from environment/secret store by default.** The file key is an optional local/dev override, and `.workflow.yaml` **must** be gitignored if a real token is placed in it. |

This ADR specifies only the keys it needs to assemble a retain call.
`.workflow.yaml` may carry other project conventions (it already holds
`specs.directory`); its full schema is out of scope here.

## Related Documents

- **`adr.platform.memory-lifecycle.0001`** — the companion decision governing how
  shipped memory behaves: immutability (frozen at ship), supersession, bead-vs-tree
  sourcing, the Hindsight state lifecycle, the build-record doc type, and why
  shipping is an agent skill plus a deferred poller rather than a CLI. This ADR
  defines the frontmatter *contract*; that one defines the *pipeline* that acts on
  it.
- **`hindsight.md` mechanism ADR (future)** — the new decision this reframe
  creates: the purpose and shape of the root `hindsight.md` (the project's tagging
  intent), the skill that interviews the owner to author it, and the extension to
  the `doc-templates` skill that consumes it when an agent fills the `hindsight`
  block. Named here as the home of tagging intent; designed there.
- `README.md` — the platform-docs system this frontmatter serves.
- Live bank-vocabulary fetch (future, deferred) — fetching the bank's
  `memory_type`/`domain`/strategy vocabulary from Hindsight at authoring time, the
  correct fix *if* `hindsight.md` drift ever bites. Overkill today; the bank
  config is explicitly **not** mirrored in the repo in the meantime.
- Work-record lane / status-transition ADRs (future) — document-management
  features this ADR intentionally leaves optional.
