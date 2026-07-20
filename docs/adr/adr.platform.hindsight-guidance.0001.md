---
schema_version: 1
id: adr.platform.hindsight-guidance.0001
type: adr
title: "hindsight.md: Per-Project Tagging Intent Authored and Consumed by Agents"
status: draft
domain: platform
produced_for: adr.platform.frontmatter-schema.0001
created_at: 2026-06-20T03:05:36Z
updated_at: 2026-06-20T03:05:36Z
hindsight:
  strategy: design-record
  tags:
    - source:authored
    - domain:platform
    - discipline:engineering
    - memory_type:adr
---

# ADR: hindsight.md — Per-Project Tagging Intent Authored and Consumed by Agents

> Architecture Decision Record. Captures one decision: its context, the options
> weighed, the choice made, and the consequences accepted. An ADR is frozen once
> it ships to memory — supersede a shipped ADR with a new one rather than editing
> it. Before it ships it is a working file, refined in place.

## Status

Draft

## Context

The frontmatter-schema ADR (`adr.platform.frontmatter-schema.0001`) made the
frontmatter contract **bank-agnostic**: it defines the structure of a `hindsight`
block and free-form `key:value` tags, but names no `memory_type`, no `domain`
vocabulary, no required-tag policy, and no strategy values. That knowledge was
deliberately evicted from the contract so the contract is reusable across banks
and projects.

But the knowledge still has to live *somewhere*. An agent authoring a document's
frontmatter must decide: which tags does this bank want, what do they mean, which
`strategy` fits this kind of document, when is something `source:voice-memo`
(owner opinion) versus `source:document-ingest` (fact)? The frontmatter ADR named
the home for that knowledge — a root `hindsight.md` — but explicitly deferred its
design. This ADR designs it.

Three constraints shape the answer:

- **The system is agent-first.** Frontmatter is normally authored by an agent.
  The consumer of tagging guidance is therefore a reasoning agent, not a
  deterministic program — which is precisely why the frontmatter ADR rejected a
  declarative config map in favor of judgment from guidance.
- **The bank is the only source of truth for its vocabulary, and this repo does
  not mirror it.** Whatever `hindsight.md` is, it must not become a committed copy
  of the bank's `memory_type`/`domain` enum that silently rots when the bank
  changes. It carries *intent*, not the authoritative value list.
- **There is already a skill that owns frontmatter authoring.** `doc-templates`
  owns the canonical document form and mints the `id` via `next-id.sh`. Filling
  the `hindsight` block is more frontmatter authoring, so the consumer of
  `hindsight.md` should be that existing skill, not a new parallel one.

## Options Considered

1. **A declarative config map** (`type → memory_type`, id-domain → bank-domain, a
   required-tag policy in `.workflow.yaml`). Rejected in the frontmatter ADR and
   not revisited here: the consumer is an agent that can reason, the map grows
   hairy and breaks on every taxonomy change, and it re-couples the id grammar to
   bank vocabulary.

2. **A committed copy of the bank template** that the authoring skill reads as the
   authoritative value list. Rejected: it manufactures a second source of truth
   for the vocabulary that cannot be synced with the running bank. The bank
   template, if provided, is ephemeral conversational input — not a stored
   artifact.

3. **Nothing — let each agent infer tags ad hoc per document.** Rejected: tagging
   would be inconsistent across documents and across sessions, with no shared
   notion of what `source:` or `memory_type:` mean for this project, defeating the
   retrieval the tags exist to serve.

4. **A prose `hindsight.md` carrying tagging *intent*, authored by an interview
   skill and consumed by the existing frontmatter-authoring skill** (chosen). A
   human-readable document explains what the project's tag dimensions mean and
   when each applies; an agent reads it and reasons its way to the right tags and
   strategy for the document in front of it. The authoritative vocabulary stays in
   the bank; `hindsight.md` carries judgment guidance, not the enum. **Chosen.**

## Decision

### `hindsight.md` is a root prose document of tagging intent

A single `hindsight.md` lives at the repository root. It is the project's
natural-language guidance for how to tag documents for this project's Hindsight
bank. It is **prose for judgment**, deliberately not a machine-parsed schema:

- It explains what each tag dimension the project uses *means* — e.g. what
  `source:` distinguishes and why (the fact-vs-opinion line the bank's reflect
  layer consumes), what `memory_type:` captures, how `domain:` (the bounded
  context) differs from `discipline:` (the functional discipline).
- It explains *when* each value applies — e.g. "a transcribed voice memo is owner
  opinion → `source:voice-memo`; a source-of-record document is fact →
  `source:document-ingest`; an authored design record → `source:authored`."
- It explains which `strategy` fits which kind of document.
- It states the project's tagging *policy* — which tags this project expects a
  shipping document to carry — as guidance, not as a gate the contract enforces.

It is **not** an authoritative enumeration of legal `memory_type`/`domain`
values. Those live only in the running bank. `hindsight.md` may *illustrate*
common values to orient an agent, but it does not claim to be the complete or
current list, and nothing validates against it.

### A skill authors it by interviewing the owner

A skill (the "hindsight-guidance" authoring skill) drives a conversation in which
the owner explains the bank's architecture and tagging intent in their own words —
optionally pasting the bank template as ephemeral reference — and the agent
synthesizes that into `hindsight.md`. The bank template, if pasted, informs the
conversation and is then discarded; it is never committed.

This skill is run when setting up a project's canon lane, and re-run when the
bank's architecture or the project's tagging intent changes.

### The existing frontmatter-authoring skill consumes it

`doc-templates` — which already owns the canonical document form and id
minting — is extended so that when an agent fills a document's `hindsight` block,
it first reads `hindsight.md` and uses it to choose the document's `tags` and
`strategy` by judgment. This keeps all frontmatter-authoring knowledge in one
skill ("run `next-id.sh` for the id; read `hindsight.md` for the tags") rather
than splitting it across a new parallel skill.

So there are two roles and they are distinct: **authoring `hindsight.md`** (the
interview skill, run rarely) and **consuming `hindsight.md`** (the `doc-templates`
extension, run on every document). One new skill, one extension to an existing
skill — not two new skills.

## Consequences

- **Gained: bank-specific tagging knowledge has a single, honest home.** It is
  prose an owner can write and read, in the one place an authoring agent looks,
  separate from the bank-agnostic contract and from the connection config.
- **Gained: no second source of truth for the vocabulary.** `hindsight.md` carries
  intent, not the enum, so it does not compete with the bank as the authority over
  legal values.
- **Gained: consistency without determinism.** Every document is tagged against
  the same shared intent, so tags cohere across documents and sessions, while the
  agent retains the judgment to handle a document the guidance did not anticipate.
- **Accepted: `hindsight.md` can lag the bank.** A `memory_type` added in the
  Hindsight UI is invisible to authoring until `hindsight.md` (and the agent's
  conversation context) catches up. This is the same unavoidable drift the
  frontmatter ADR named; the deferred fix is a live fetch of the bank vocabulary
  at authoring time, not a committed mirror.
- **Accepted: guidance quality is load-bearing.** If `hindsight.md` is vague or
  wrong, tagging degrades. The interview skill must produce concrete, example-rich
  guidance, and the owner must refresh it when intent changes.
- **Scoped out: the frontmatter contract is unchanged.** This ADR adds no
  frontmatter field and changes no validation rule. It only fills the
  "where does tagging intent live and who acts on it" gap the frontmatter ADR
  left open.

## Related Documents

- **`adr.platform.frontmatter-schema.0001`** — the ADR this one serves. It made
  the frontmatter contract bank-agnostic and named `hindsight.md` as the home of
  tagging intent without designing it. This ADR designs it.
- **`adr.platform.memory-lifecycle.0001`** — governs how shipped memory behaves;
  the shipping skill that this guidance ultimately feeds is described there.
- **`doc-templates` skill** — owns frontmatter form and id minting today; gains the
  `hindsight.md`-consuming behavior described here.
- **hindsight-guidance authoring skill (future)** — the interview skill this ADR
  calls for; unbuilt, to be authored when the canon lane is wired.
- **Live bank-vocabulary fetch (future, deferred)** — the correct fix if
  `hindsight.md` drift ever bites; explicitly not a committed mirror of the bank.
