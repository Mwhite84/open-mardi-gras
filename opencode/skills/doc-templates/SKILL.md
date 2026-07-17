---
name: doc-templates
description: Agent-agnostic templates for the standard documents — PRD, spec, roadmap, user story, design doc, ADR. Provides the canonical structure (sections and what each holds) so any agent produces the same format and any reviewer checks against the same shape. Use when creating any of these document types, or when checking that one is well-formed.
---

# Doc Templates

This skill owns the **form** of the standard documents — their sections and the
canonical layout — and nothing else. It is deliberately agent-agnostic: whoever
writes a PRD, a spec, or a design doc produces the same structure, and whoever
reviews one checks against the same structure. This is what keeps two agents from
thrashing a shared document into rival layouts.

It does **not** tell you how to judge whether a document is *good*, or what to
put in each section beyond what the section is for. That is the acting agent's
job, and it lives in that agent's own skill references — `architect-docs` for the
architect's lens, `pm-docs` for the product manager's. This skill gives the empty
rooms; your own references tell you how to furnish or inspect them.

## How to use it

- **Creating a document:** copy the matching template from `templates/` as the
  skeleton, then fill each section using your agent's own reference for that doc
  type. Keep the section structure; do not invent rival layouts.
- **Reviewing a document:** check the document carries the template's sections
  and shape. A missing or malformed section is a form defect. Whether the
  *content* of a section is sound is a separate judgment your own reference
  governs.

## The templates

Each file in `templates/` is the canonical skeleton for one doc type. The
**id type segment** is the bare document type — it is what goes in the `id`'s
first dotted segment and names the doc's folder (see *Minting the `id`* and
*Placing the document*). It is **not** necessarily the template filename: copy
the file named below, but mint the id with the type segment named below.

| Doc type | Template file | id type segment | Folder |
| --- | --- | --- | --- |
| PRD | `templates/prd.md` | `prd` | `docs/prd/` |
| Spec | `templates/spec.md` | `spec` | `docs/spec/` |
| Roadmap | `templates/roadmap.md` | `roadmap` | `docs/roadmap/` |
| User story | `templates/user-story.md` | `user-story` | `docs/user-story/` |
| Design doc | `templates/design-doc.md` | `design` | `docs/design/` |
| ADR | `templates/adr.md` | `adr` | `docs/adr/` |
| Build report | `templates/build-report.md` | `build-report` | `docs/build-report/` |

Note the design doc: its template file is `design-doc.md`, but its id type
segment is the **bare type `design`**, so it lands in `docs/design/` — never
`design-doc`. Do not read the type segment off the template filename.

If a document type has no template here, it has no canonical form yet — tell the
user that **oc-smith** can author one so the format is fixed going forward.

## Minting the `id`

The frontmatter `id` is the document's stable identity (per ADR-0001 — a dotted
`type.domain.topic.NNNN`, e.g. `adr.subscriptions.metering-period.0002`). The
leading `type` segment is the **bare document type**, never a `-doc`/`-record`
suffix and never blindly the template filename: `prd` (not `prd-doc`), `adr` (not
`adr-record`), `spec`, `roadmap`, `user-story`, `build-report`, and — the one
that trips people up — `design` (the template file is `design-doc.md`, but the id
type segment is `design`). Take the type segment from the table above, not from
the filename you copied. The trailing `NNNN` must not collide with an existing
document sharing the prefix.
Do **not** eyeball the next number — run the script and use what it returns:

```
OMG_CONFIG_DIR="${OPENCODE_CONFIG_DIR:-.opencode}"
[ -f "$OMG_CONFIG_DIR/skills/doc-templates/scripts/next-id.sh" ] || OMG_CONFIG_DIR=".opencode"
"$OMG_CONFIG_DIR/skills/doc-templates/scripts/next-id.sh" <type.domain.topic>
```

Pass the prefix **without** the counter; the script scans every doc's
frontmatter `id` under the docs tree (committed and uncommitted) and prints the
prefix with the next free `NNNN` (`.0001` if none exist). It finds the tree via
the resolver (`scripts/resolve-workflow.sh docs_root`), so in a satellite repo it
scans the shared central docs tree and ids stay collision-free across the whole
platform. It fails loudly rather than guessing if it cannot resolve the tree — if
it errors, fix the cause (usually a missing or misconfigured `.workflow.yaml`); do
not fall back to a hand-picked number.

## Placing the document

Once you have the `id`, its location is **computed, not chosen** — do not invent a
path or take one from the invoking command. A document is written to:

```
<docs_base>/<type>/<id>.md
```

- **`<docs_base>`** comes from the resolver:
  `OMG_CONFIG_DIR="${OPENCODE_CONFIG_DIR:-.opencode}"; [ -f "$OMG_CONFIG_DIR/skills/doc-templates/scripts/resolve-workflow.sh" ] || OMG_CONFIG_DIR=".opencode"; "$OMG_CONFIG_DIR/skills/doc-templates/scripts/resolve-workflow.sh" docs_base`. In a
  `solo`/`centralized` repo this is the repo's own base; in a `satellite` it is the
  repo's sibling directory inside the **central** docs tree. Either way the
  resolver returns an absolute path — use it verbatim.
- **`<type>`** is the first dotted segment of the `id`
  (`adr.platform.metering-period.0001` → `adr`). Every id carries it (ADR-0001's
  `type.domain.topic.NNNN` grammar guarantees it), so every doc type lands in its
  own subfolder with no per-type configuration. Because the id's type segment is
  the **bare type** (see *Minting the `id`*), this folder is the bare type too — a
  design doc lands in `docs/design/`, not `docs/design-doc/`.

So `adr.platform.metering-period.0001` is written to
`<docs_base>/adr/adr.platform.metering-period.0001.md`. Create the `<type>`
subdirectory if it does not exist. This convention is why one `docs_base` key
serves every document type — including build reports (`build-report/`) — and why
every repo's tree has an identical internal shape (per
`adr.platform.multi-repo-canon.0001`).

## Filling the `hindsight` block

A document that should become memory carries a `hindsight` block — its presence
is the ship signal (per `adr.platform.frontmatter-schema.0001`). The block holds
the per-document half of a Hindsight retain call: an optional `strategy` and a
list of free-form `key:value` `tags`. A document with **no** `hindsight` block
stays in Git only and never ships; omit the block when the document is not
memory.

The contract names **no** tag vocabulary — *which* tags to write, what they
mean, and which `strategy` fits is the project's tagging intent, and it lives in
the project's **`hindsight.md`**. So when you fill this block:

1. **Locate `hindsight.md` via the resolver**, not by assuming the repo root:
   `OMG_CONFIG_DIR="${OPENCODE_CONFIG_DIR:-.opencode}"; [ -f "$OMG_CONFIG_DIR/skills/doc-templates/scripts/resolve-workflow.sh" ] || OMG_CONFIG_DIR=".opencode"; "$OMG_CONFIG_DIR/skills/doc-templates/scripts/resolve-workflow.sh" hindsight.guidance`
   returns the path. In a `satellite` repo this is the **central** repo's
   `hindsight.md` (the single shared tagging intent), not a local one — which is
   correct, since a satellite ships to the one shared bank. Read that file.
2. **Choose `tags` and `strategy` by judgment** from that guidance — match the
   document in front of you against its dimensions and examples. Do not invent a
   tag vocabulary; do not derive tags mechanically from the `type` field (there
   is no `type → memory_type` rule).
3. If the resolver errors or the resolved `hindsight.md` does not exist, the
   project's docs lane is not set up — tell the user to run **`/omg-hindsight-setup`**
   to author it against the live bank. Do not guess a tag vocabulary in its absence.

The block shape:

```yaml
hindsight:
  strategy:   # optional; a bank retain strategy. Omit → bank default extraction
  tags:       # list of key:value strings, authored by judgment from hindsight.md
```

The `bank` and the retain `document_id` are **not** in this block — the bank is
resolved from `.workflow.yaml` (`resolve-workflow.sh hindsight.bank`, which
inherits the central bank in a satellite), and the `document_id` is the top-level
`id`. You author only `strategy` and `tags`.

## Document status

`status:` is a frontmatter field, and its legal values come from the frontmatter contract (`adr.platform.frontmatter-schema.0001`, A5): `draft`, `proposed`, `final`, `deprecated`, `superseded`. The rows below specialize what those values *mean* per doc type; no doc type invents other values.

| Doc type | Working | Terminal | End-of-life | Meaning notes |
|---|---|---|---|---|
| PRD | draft, proposed | final | superseded, deprecated | proposed = circulated for review; final = approved direction |
| Spec | draft, proposed | final | superseded, deprecated | final = approved to decompose and build against |
| Roadmap | draft, proposed | final | superseded | a roadmap revision is committed (final) or replaced by the next (superseded), never edited once superseded |
| User story | draft, proposed | final | deprecated, superseded | final = refined and ready to build; deprecated = dropped, will not be built |
| Design doc | draft, proposed | final | superseded, deprecated | final = the design of record |
| ADR | draft, proposed | final | superseded, deprecated | final is the classic ADR "Accepted"; superseded pairs with the `superseded_by:` frontmatter id |
| Build report | draft | final | superseded | a record: final at epic close; changed only by supersession |

Three rules govern the field:

- **Status is descriptive — never a gate and never a freeze.** The ship signal is solely the presence of the `hindsight` block (contract A3), and immutability attaches at *ship* (`hindsight=shipped`), not at any status value. Marking a doc `final` does not freeze it; it is still refined in place until it ships.
- **Ship expectation.** A document is *expected* to be `final` before it ships to Hindsight. An agent about to ship a `draft` or `proposed` doc flags it to the user rather than shipping silently — this is authoring guidance, not a contract gate; hardening it into a mechanical gate is a deferred future ADR (the contract's status-transition ADR).
- **`superseded`/`deprecated` on a tree doc is bookkeeping.** The authoritative supersession of *shipped* memory is the hindsight supersession flow (see *Immutability and Supersession* in `omg-commands`); setting `status: superseded` retracts nothing by itself.

Status lives in frontmatter only: templates do not carry a body `## Status` section — except the ADR, whose body `## Status` is the classic ADR shape, kept as a human-readable mirror of the frontmatter value.

## Frontmatter conventions

Every template carries frontmatter, and some fields are easy to fill dishonestly.
These conventions apply to whoever fills them, for any doc type:

- **Timestamps (`created_at`, `updated_at`) are real, UTC, and never faked.** The
  fields are RFC 3339 with a `Z` suffix — UTC, not your local zone. Get the value
  from the wall clock: run `date -u +"%Y-%m-%dT%H:%M:%SZ"` and use what it
  returns. If `date` or a shell is not available to you, ask the user for the
  current UTC time rather than guessing.
- **Do not pad precision you did not measure.** Writing `T00:00:00Z` because the
  format wants a time you never fetched is fabricated precision — the value then
  claims a midnight that never happened. Stamp the actual instant, or ask.
- **Watch the date across the UTC boundary.** Your local date can lag or lead UTC
  by a day. Because the field is `Z`, stamp the UTC date — which is what
  `date -u` already gives you. Do not transcribe a local "today" into a UTC field.
- **`updated_at` reflects *this* edit; leave `created_at` alone.** When you revise
  an existing document, refresh `updated_at` to now. Do not rewrite `created_at`
  or other historical values you cannot verify — imprecise real history beats a
  confident guess.

## The line this skill holds

A template states **what a section holds** — intrinsic to the document's purpose,
true no matter who writes it. A template never states **how to judge whether the
content is good** — that is agent judgment and belongs in an agent's reference.
Keep templates structural. If you find yourself writing evaluation criteria into
a template, it belongs in `architect-docs` or `pm-docs` instead.
