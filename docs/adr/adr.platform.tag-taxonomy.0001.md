---
schema_version: 1
id: adr.platform.tag-taxonomy.0001
type: adr
title: "Tag Taxonomy: Provenance, Bounded Context, and Discipline as Independent Dimensions"
status: accepted
domain: platform
produced_for: adr.platform.hindsight-guidance.0001
created_at: 2026-06-23T04:15:06Z
updated_at: 2026-06-23T04:15:06Z
hindsight:
  strategy: design-record
  tags:
    - source:authored
    - domain:platform
    - discipline:engineering
    - memory_type:adr
---

# ADR: Tag Taxonomy — Provenance, Bounded Context, and Discipline as Independent Dimensions

> Architecture Decision Record. Captures one decision: its context, the options
> weighed, the choice made, and the consequences accepted. An ADR is frozen once
> it ships to memory — supersede a shipped ADR with a new one rather than editing
> it. Before it ships, it is a working file and is refined in place; marking it
> Accepted does not freeze it.

## Status

Accepted

## Context

The project tags every authored document (specs, ADRs, PRDs) with a small set of
`key:value` tags that ride into the Hindsight retain call, so the bank's
recall/reflect layer can filter and reason over memories. The intended vocabulary
is described in prose in the repo-root `hindsight.md`
(`adr.platform.hindsight-guidance.0001`), which an authoring agent reads to choose
a document's tags. Two defects in that vocabulary surfaced in use and this ADR
fixes them.

**1. `source:canon` — a tag value named after a tool that does not exist.** The
`source:` dimension exists to record **provenance**: where a memory originated and
how much to trust it (the reflect layer uses it to separate authored design records
from transcribed voice memos from ingested source documents — fact vs. opinion).
The value for authored documents was `source:canon`, inherited from the working
name of a CLI (`canon`) that `adr.platform.frontmatter-schema.0001` and
`adr.platform.multi-repo-canon.0001` already eliminated in favor of agent-driven
shipping. With the tool retired, `canon` names nothing — it is not a provenance, it
is a dead reference. Because it lived in `hindsight.md`, agents kept stamping it: a
build agent asked to author config emitted `source:canon` verbatim, propagating the
dead name into new memory.

**2. The `domain` overload.** The frontmatter contract used the word "domain" for
two unrelated things, and `frontmatter-schema.0001` had to carry a standing caveat
("Two `domain`s, deliberately distinct") to manage the confusion:

- the top-level **`domain` field** — the second segment of the dotted `id`
  (`spec.notifications.…`), naming the product/codebase area the document concerns;
- a **`domain:` tag** whose values were functional disciplines (`engineering`,
  `product`) — *who owns the work*, a different axis entirely.

A caveat that two same-named things are "deliberately distinct" is a sign the
naming is wrong, not that the distinction is subtle. The id-tree segment and the
functional discipline are genuinely different dimensions; calling both "domain"
forced the caveat and invited exactly the conflation it warned against.

### Binding constraints

This is a taxonomy decision, so the dominant forces are **correctness of retrieval**
(the dimensions must let the queries the owner actually needs succeed — e.g. "recall
everything about notifications" and "separate fact from opinion") and
**maintainability** (the vocabulary must not carry dead values or self-contradicting
names that rot and mislead authoring agents). Scale, cost, security, and operability
are not binding here. A subordinate constraint is **blast radius**: the bank already
holds memories under the prior `domain:` convention, so a change that reinterprets a
live tag has a cost the design must account for.

### What the dimensions must distinguish

Three orthogonal questions a memory should answer, which the prior scheme collapsed:

- **Where did this come from / how much do I trust it?** — provenance.
- **What part of the product/platform is it about?** — the bounded context.
- **What kind of work / which discipline owns it?** — the functional discipline.

These are independent: a `notifications` spec (context) is engineering work
(discipline) authored here (provenance). Any value in one says nothing about the
others, so they must be three separate tag keys.

## Options Considered

### Naming the "which area" dimension

1. **Keep two `domain` meanings, manage with a caveat (status quo).** Rejected.
   The caveat is the defect, not the fix: two same-named dimensions invite
   conflation indefinitely, and an authoring agent must re-derive the distinction
   every time. The bug that prompted this ADR is the predictable result.

2. **Introduce `area:` for the id-tree segment; leave `domain:` as the discipline
   tag.** Considered, and initially favored because it touches no live `domain:`
   tag. Rejected on reflection: it invents a *third* word ("area") for the concept
   the id grammar already calls `domain`, and it leaves `domain:` meaning
   "discipline," which is not what "domain" means. It minimizes blast radius at the
   cost of entrenching the wrong name — buying short-term safety with permanent
   confusion.

3. **Make `domain` mean the bounded context (its Domain-Driven Design sense), and
   move the functional discipline to a new `discipline:` tag** (chosen). DDD settles
   the word: a *domain* is a bounded context (`notifications`, `subscriptions`,
   `web`, `platform`). Under this reading the top-level `domain` field and the
   `domain:` tag become the **same** dimension with the **same** value — the
   overload dissolves, and the "two domains" caveat is deleted rather than managed.
   The functional discipline (`engineering`, `product`, `business`) gets its own
   honest key. **Chosen** despite the larger blast radius (it reinterprets the live
   `domain:` tag), because it is the only option that makes every name mean what it
   says. The blast radius is handled as a deferred, explicit bank pass (see
   Consequences), not absorbed silently.

### Replacing `source:canon`

1. **`source:docs` / `source:centralized-docs`.** Rejected. These name a *location*
   (which repo/tree), but `source:` is the provenance dimension — how a memory
   originated, not where it sits. Encoding location into provenance is the same
   category error that produced the bug.

2. **`source:authored`** (chosen). Names the origin — a human or agent authored this
   here as durable belief — independent of where the document lives or which area it
   concerns. It reads correctly for any authored document in any subtree and
   contrasts cleanly with the other provenance values (`document-ingest`,
   `voice-memo`, `harness-conversation`). **Chosen.**

### How `domain:` gets its value

1. **Author it by judgment per document.** Rejected. The bounded context is already
   determined the moment the `id` is minted — it *is* the second segment. Asking an
   agent to re-derive it invites drift between the id and the tag.

2. **Derive it mechanically from the id's second segment** (chosen). The `domain:`
   tag value equals the top-level `domain` field, which equals the id's second
   segment. No judgment, no drift. Only `discipline:` requires judgment. **Chosen.**

## Decision

Adopt **three independent tag dimensions** for authored documents, plus the
existing `memory_type:`:

1. **`source:` — provenance.** How the memory originated and how far to trust it.
   Authored design records are **`source:authored`** (replacing the retired
   `source:canon`). Other values unchanged: `source:document-ingest` (source-of-record
   fact), `source:voice-memo` (owner opinion), `source:harness-conversation`
   (session records). This is the dimension the reflect layer uses to separate fact
   from opinion.

2. **`domain:` — the bounded context** (Domain-Driven Design sense). The
   product/platform area the memory concerns: `platform`, `notifications`,
   `subscriptions`, `web`, … The value is **mechanical** — it equals the document's
   top-level `domain` field, which is the second segment of its `id`. The field and
   the tag are now the same dimension with the same value; the "Two `domain`s"
   caveat in `frontmatter-schema.0001` is removed.

3. **`discipline:` — the functional discipline.** *Who owns the work / what kind of
   work it is*, authored by **judgment**: `engineering`, `product`, `business`,
   `legal`, `operations`, `marketing`, `infrastructure`, `strategy`. This is the new
   home for the values the old `domain:` tag mis-carried.

The three are orthogonal and a document carries each independently — e.g. a
notifications spec is `source:authored` + `domain:notifications` +
`discipline:engineering` + `memory_type:spec`. The id grammar
(`type.domain.topic.NNNN`) is **unchanged**: its second segment was always the
bounded context, so the DDD reading makes it correct, not different.

These are **project tagging intent**, recorded in `hindsight.md` and authored by
agent judgment — not contract-enforced. Per `frontmatter-schema.0001`, the
frontmatter contract names no tag vocabulary; this ADR governs the *vocabulary the
project chooses*, which the contract carries verbatim without validating.

## Consequences

- **Gained: every tag name means what it says.** `domain` is a bounded context (as
  in DDD and as in the id grammar), `discipline` is the function, `source` is
  provenance. The "deliberately distinct" caveat is deleted, not managed, so the
  conflation that caused the original bug cannot recur.

- **Gained: three independent filter axes.** A query can recall by context
  (`domain:notifications`), by discipline (`discipline:product`), or by provenance
  (`source:authored`) independently. The owner's "everything about the monolith /
  notifications" query now lands on a real dimension.

- **Gained: `domain:` is drift-proof.** Because its value equals the id's second
  segment, it cannot disagree with the document's identity, and the authoring agent
  makes no judgment call for it. Only `discipline:` is judgment.

- **Accepted: the live bank holds memories under the old convention.** Existing
  memories tagged `source:canon` or carrying a discipline value under the `domain:`
  key (e.g. `domain:engineering`) predate this taxonomy. This ADR re-tags only the
  repo's own documents and `hindsight.md`; it does **not** rewrite the running bank.
  Reconciling the bank — re-tagging old `source:canon` → `source:authored` and old
  function-valued `domain:` tags → `discipline:` — is a **deferred bank pass**,
  owned by `hindsight-architecture` (it touches bank vocabulary, not just this
  repo). Until then, recall over historical memory may need to query both the old
  and new values. This is recorded so the split is a known, intentional state, not a
  future surprise.

- **Accepted: these dimensions should become formal bank entity labels.** Today
  `source:`, `domain:`, and `discipline:` are writer-stamped convention tags, not
  validated entity labels in the bank (consistent with how `source:` already worked).
  Promoting them to real entity-label dimensions — so the bank enforces and
  documents the vocabulary — is part of the same deferred `hindsight-architecture`
  pass. Convention now; formalized when that pass runs.

- **Accepted: out-of-repo copies must be synced by hand.** The OMG instruments and
  their guidance were copied to the `open-mardi-gras` repo. This taxonomy change to
  `hindsight.md` and the ADRs is not automatically reflected there; the owner syncs
  it separately.

- **Scoped out — unchanged by this ADR:** the frontmatter contract
  (`frontmatter-schema.0001`) beyond deleting its "two domains" caveat and updating
  the `domain` field comment; the id grammar (`type.domain.topic.NNNN`, where the
  second segment is the bounded-context `domain`); the memory lifecycle
  (`memory-lifecycle.0001`); and the multi-repo topology
  (`multi-repo-canon.0001`). This ADR changes the *tag vocabulary*, nothing
  structural.

## Related Documents

- **`adr.platform.hindsight-guidance.0001`** — designs `hindsight.md`, the doc this
  ADR's taxonomy is written into; this ADR is `produced_for` it. The guidance's
  sections for `source:`, `domain:`, and the new `discipline:` reflect this decision.
- **`adr.platform.frontmatter-schema.0001`** — its "Two `domain`s, deliberately
  distinct" section is removed by this ADR (the field and the `domain:` tag are now
  one dimension), and its `domain` field comment updated to "bounded context."
- **`adr.platform.multi-repo-canon.0001`** — retired the `canon` CLI and the "canon
  tree"; this ADR retires the last surviving `canon` reference, the `source:canon`
  tag value, completing that cleanup.
- **`hindsight-architecture` skill (future pass)** — owns the deferred bank
  reconciliation: re-tagging historical memories and promoting `source:`/`domain:`/
  `discipline:` to formal entity labels.
