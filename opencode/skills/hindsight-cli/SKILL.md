---
name: hindsight-cli
description: Runbook for using the `hindsight` CLI to query a Hindsight memory bank — listing banks, reading mental models, recalling and reflecting — without blowing out the context window. Use when running hindsight commands to pull context from a memory bank, especially before authoring a document. Covers the jq/temp-file discipline for the CLI's large JSON output.
---

# Using the hindsight CLI

The `hindsight` CLI talks to a Hindsight memory bank — a semantic memory system.
It is self-describing: `hindsight --help` lists the command groups, and
`hindsight <group> --help` (and `<group> <cmd> --help`) gives exact arguments.
Trust the help output over memory; this skill covers the *judgment* — which
commands answer which question, and how to use them without flooding your
context — not an exhaustive flag list.

The bank id is the first positional argument to most commands (e.g.
`stacked-chips`). It is the `bank` in `.workflow.yaml` (resolved from the central
repo's config when the working repo is a satellite).

## The command surface, briefly

Read-only commands you will reach for most:

- `bank list` — the banks available.
- `bank export-template <bank>` — the bank's configured vocabulary: entity
  labels (tag dimensions), retain strategies, missions.
- `tag list <bank>` — tags actually in use, with counts.
- `mental-model list <bank>` / `mental-model get <bank> <id>` — curated, fast,
  reusable views of the bank. The best first read for orientation.
- `memory recall <bank> <query>` — semantic search; returns matching facts.
- `memory reflect <bank> <query>` — a reasoned answer in the bank's voice,
  synthesized over recalled facts and mental models.

Write commands (`retain`, `create`, `update`, `delete`, `clear`, `set-config`,
`import-template`, …) mutate the bank. **Do not run them against a production
bank** unless that is explicitly the task. This skill is about reading; retaining
is a separate reference, added when that workflow is built.

## The context-explosion trap (read this first)

The CLI prints a lot, and `-o json` prints **far more** — a single
`mental-model list` can exceed 800 KB, enough to blow your context window in one
call. The default `pretty` output is smaller but still unbounded and not
parseable. The rule:

**Never let raw CLI output land directly in your context. Redirect JSON to a
temp file, then extract only what you need with `jq`.**

The discipline, every time:

1. **Redirect `-o json` to a temp file** in your environment's scratch/temp
   directory (not the repo):
   `hindsight -o json <cmd> > "$TMP/out.json" 2>/dev/null`
2. **Check the size and top-level shape before reading any values:**
   `wc -c "$TMP/out.json"` then `jq 'keys' "$TMP/out.json"` (or
   `jq 'if type=="object" then keys else length end'`).
3. **Drill key-by-key, never the whole blob.** `jq '.items[0] | keys'` to learn
   an item's fields, then project just the small ones:
   `jq -r '.items[] | "\(.id)\t\(.name)"'`.
4. **Pull large text fields one at a time, and only the field you want.** A
   record can carry a small readable field next to a huge raw one — extract the
   readable one (`jq -r '.content'`), not the object.

A worked tell: `mental-model get` returns ~140 KB of JSON, but its `.content`
(the readable markdown) is ~9 KB — the other ~130 KB is `.reflect_response` raw
facts. `jq -r '.content'` gives you the model; dumping the object wastes the
window. The same shape recurs across commands: find the small field, take it.

`recall` and `reflect` accept `--budget low|mid|high` and `--max-tokens`; keep
them low while exploring so responses stay small, and raise them only when you
need depth. Even so, route `recall` through a temp file and project compact views
(`text`, `tags`, `type`) rather than dumping every fact's full record.

## Reference workflows

Load the matching reference for the task in front of you:

- **Discovering context before authoring a document** —
  `reference/discover-context.md`. Orient via mental models, then pull threads
  with targeted `recall`/`reflect`. Use this before writing a spec, ADR, PRD, or
  design doc so the author works from the bank's fuller picture, not a cold start.
- **Shipping an in-tree document to Hindsight** —
  `reference/ship-doc-from-tree.md`. Turn a document's frontmatter + body into a
  retain call (`id` → document_id, `hindsight.strategy`, `hindsight.tags`). Use
  when shipping a tree-sourced doc (PRD, HLD, vision — memory but not work) to
  memory. **Note:** this is a write to the bank — the reference explains why it
  goes through the HTTP API, not the CLI retain commands.
- **Shipping a bead to Hindsight** — `reference/ship-bead-from-source.md`. The
  same retain call, sourced from `bd show <id> --json` instead of frontmatter
  (`spec_id` → document_id, `metadata.hindsight.*` → strategy/tags, description →
  content). Use when shipping a bead-sourced doc (spec, ADR) from the
  `hindsight:pending` queue. Builds on the tree-doc reference — read that first.
- **Discovering a bank's tagging vocabulary** — not here; that lives in the
  `hindsight-guidance` skill (authoring `hindsight.md`), which uses
  `export-template` + `tag list`. Reach for it when the task is the tagging-intent
  doc, not document context.
