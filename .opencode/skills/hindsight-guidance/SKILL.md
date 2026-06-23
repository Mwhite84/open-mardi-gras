---
name: hindsight-guidance
description: Runbook for authoring or refreshing the repo-root hindsight.md — the project's prose tagging-intent guidance an agent reads to choose a document's hindsight tags and strategy. Use ONLY when creating or updating hindsight.md itself (the tagging-intent doc), or when setting up/refreshing a project's docs lane. Do NOT use for designing the Hindsight bank, banks, tags, entity labels, observation scopes, or bank templates — that is hindsight-architecture.
---

# Authoring hindsight.md

`hindsight.md` lives at the repository root. It is the project's **prose tagging
intent**: it tells an authoring agent what this project's tag dimensions mean,
when each value applies, which `strategy` fits which kind of document, and which
tags a shipping document is expected to carry. An agent reads it and *reasons*
its way to the right `tags` and `strategy` for the `hindsight` block of the
document in front of it (per `adr.platform.frontmatter-schema.0001` and
`adr.platform.hindsight-guidance.0001`).

This skill produces that file. It is run rarely — when a project's docs lane is
first set up, or when the bank's tagging intent changes — by learning the bank's
vocabulary (from the live bank where possible, see below) and synthesizing the
project's tagging *intent* into `hindsight.md`.

## What this skill is NOT

This is not bank design. Deciding the bank's *architecture* — how many banks,
its tag dimensions and their legal values, entity labels, observation scopes,
retain strategies, mental models, the bank template JSON — is the
`hindsight-architecture` skill's job. That work happens **inside Hindsight** and
is the bank's own source of truth.

This skill consumes the *outcome* of that design as the owner describes it, and
records the project's **intent for tagging documents against it**. If the owner
has not yet designed the bank, send them to `hindsight-architecture` first.

The line: `hindsight-architecture` answers "what should the bank be?";
`hindsight-guidance` answers "given the bank that exists, how do we tag our
documents for it?"

## What hindsight.md must and must not be

It **is** prose for judgment:

- For each tag dimension the project uses, it explains what that dimension
  *means* and *why* — what distinction the bank's recall/reflect layer draws
  from it. (Whatever those dimensions are: a provenance dimension, a memory-shape
  dimension, a company-domain dimension — they are this bank's choices, not a
  fixed set.)
- It explains *when* each value applies, with concrete examples.
- It says which `strategy` fits which kind of document.
- It states the project's tagging *policy* — which tags a shipping document is
  expected to carry — as guidance, not as a gate anything enforces.

It is **not** an authoritative enumeration of a dimension's legal values. Those
live only in the running bank. `hindsight.md` may *illustrate* common values to
orient an agent, but it never claims to be the complete or current list, and
nothing validates against it.

It does **not** mirror the bank template or config. The bank is the source of
truth for its own vocabulary; you read it to *write intent*, but you never commit
a copy of its template, config, or value enums. A committed copy is a second
source of truth that silently rots when the bank changes.

## Learning the bank's vocabulary

Two things are structural — every Hindsight retain call has them, so every
`hindsight.md` covers them: **`tags`** (free-form `key:value` strings) and an
optional **`strategy`** (a named bank retain profile). Everything else — *which*
tag dimensions exist, what their keys are, what values are legal — is **this
bank's chosen vocabulary.** You do not bring a vocabulary; you learn this bank's.

Learn it from the most authoritative source available, in this order:

1. **Discover from the live bank via the `hindsight` CLI** (preferred — it is the
   actual source of truth, and it shows both what the bank *allows* and what is
   *in use*). See "CLI discovery" below.
2. **A bank template the owner pastes**, if the CLI is unavailable. Read its
   `entity_labels` (the tag dimensions) and `retain_strategies` (the strategies).
   Ephemeral reference only — do not commit it.
3. **Pure conversation**, if neither is possible. Ask the owner what tag *keys*
   the bank filters and reasons on, and what each means.

Whichever rung you land on, the goal is the same: the *vocabulary* comes from the
bank; the *intent and meaning* — what each dimension is for, when each value
applies, the fact-vs-opinion distinctions — is what you synthesize into prose.

### CLI discovery

The CLI emits a lot of text, and `-o json` emits more. **Never pipe a raw bank
dump into your context** — it can blow the window. Instead:

- **Redirect JSON to a temp file**, then step through it with `jq`. Discover keys
  before values: `jq 'keys'`, then `jq '.bank | keys'`, then pull one dimension
  at a time. Extract only the fields you need (`key`, `description`, `values[]`),
  never the whole blob.
- Write the temp files to your environment's scratch/temp directory, not into
  the repo.

Two commands carry what you need (substitute the `bank` from `.workflow.yaml`):

- `hindsight -o json bank export-template <bank>` — the **authoritative spine.**
  `.bank.entity_labels[]` are the tag dimensions (each with `key`, `description`,
  `tag`, and `values[]` of `{value, description}`); `.bank.retain_strategies` are
  the named strategies (each with its extraction mode and mission);
  `.bank.*_mission` explain how the bank reasons.
- `hindsight -o json tag list <bank> --limit 500` — the **reality check.** Group
  by key prefix (`split(":")[0]`) to see every tag dimension *actually in use*,
  and inspect values + counts. This surfaces (a) convention tags that are **not**
  entity labels — e.g. a writer-stamped `source:` — which the template alone
  would miss, and (b) drift: typos and casing splits (`memory_type:prd` vs
  `memory_type:prD`) that mean the same dimension is being tagged inconsistently.

Cross-read the two: the template tells you what the dimensions *should* be and
what they mean; the tag list tells you what is *live* and where reality has
drifted. Note meaningful drift to the owner rather than encoding it as intent.

These are read-only. Do not run create/update/delete/clear/retain/import
commands against a production bank.

## Synthesizing intent

Whatever rung produced the vocabulary, capture the *intent* for each piece:

1. **The bank, briefly.** Which bank do these documents ship to (the `bank` in
   `.workflow.yaml`)? What is it the memory *of*? You are not redesigning it —
   only writing intent for tagging against it.

2. **Each tag dimension's meaning.** For *each* dimension you discovered, capture:
   the key, what it distinguishes and *why* (what the bank's recall/reflect layer
   does with it), and the rule for choosing a value. Pay attention to any
   dimension that encodes a distinction the **reflect layer consumes** (e.g. a
   provenance dimension separating fact from opinion) — that one is load-bearing
   for retrieval quality and deserves the clearest guidance and examples.
   Remember that a live convention tag (from the tag list) can be a real
   dimension even when it is not a formal entity label.

3. **Watch for collisions with document-management fields.** A bank tag key can
   share a name with a top-level frontmatter field while meaning something
   different (in this repo, a bank `domain:` *tag* is the company domain, while
   the top-level `domain` *field* is the id-tree area — they do not map
   mechanically). When a dimension overlaps a frontmatter field name, write the
   distinction explicitly and worked, so an agent never conflates them.

4. **`strategy` — how the bank extracts.** Which retain strategies does the bank
   expose, and which fits which kind of document? Note the default and that an
   omitted `strategy` uses it; recommend naming one anyway.

5. **Policy.** Which tags does the project expect a shipping document to carry?
   Frame as guidance, not a gate.

## Writing the file

Synthesize what you learned into prose at the repo root as `hindsight.md`. Give
each tag dimension you discovered its own section (its key, its meaning, when
each value applies), a `strategy` section, and close with concrete end-to-end
**examples** — for a few real document kinds, the full set of tags and the
strategy an agent should write. Do **not** impose a fixed set of sections; the
sections are whatever dimensions this bank uses. Examples are the
highest-leverage content: an agent tags by pattern-matching against them, so
make them real and specific to this project's documents.

State illustrative value lists as *illustrative*, never as the legal set — the
authoritative values live in the running bank.

## Worked example

The dimensions below are **one project's choices**, not a required set — this
repo's bank happens to tag on `source:`, `memory_type:`, and `domain:`. Another
bank might use none of these and tag on something else entirely. The example
shows the *shape* a filled-in file takes, not the dimensions to impose.

This repo's `hindsight.md` reads, in part:

```markdown
## `source:` — provenance and trust

The reflect layer uses `source:` to separate fact from opinion. Choose by origin:

- `source:canon` — design/decision records authored in this repo (specs, ADRs,
  HLDs, PRDs). Reviewed, durable belief. Almost always right for documents
  authored here.
- `source:document-ingest` — source-of-record documents preserved as-is. Fact.
- `source:voice-memo` — transcribed voice memos. Owner opinion, not fact.

## Examples

- ADR authored here → `strategy: design-record`; `source:canon`,
  `domain:engineering`, `memory_type:adr`.
- Mission/vision doc → `strategy: source-document`; `source:document-ingest`,
  `domain:business`, `memory_type:strategy`.
```

Here `source:` is the load-bearing reflect dimension (fact vs. opinion),
`memory_type:` is the memory shape, and `domain:` is the bank's company domain
(distinct from the top-level id-tree `domain` field). The repo's current
`hindsight.md` is a complete reference for the target shape — read it as an
example of a finished file, not as the dimensions every project must use.

## After authoring

- Confirm the file is at the **repo root** (`hindsight.md`), not under `docs/`.
- Remind the owner it carries intent, not the bank's authoritative vocabulary,
  and to re-run this skill when the bank's tagging intent changes.
- The consumer is the `doc-templates` skill: when an agent fills a document's
  `hindsight` block, it reads this file to choose `tags` and `strategy`. Good
  guidance here is what makes that judgment consistent across documents.
