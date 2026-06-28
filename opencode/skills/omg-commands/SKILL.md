---
name: omg-commands
description: Detailed beads CLI command reference for creating, updating, and managing issues. Load this skill before creating issues, filing discovered work, or updating issue fields.
---

# Beads Command Reference

## Creating Issues

```
bd create "Title" -d "description" --type task --priority 2 --json
```

- Use `--body-file=<path>` for long descriptions (up to 64 KB)
- Use `-d "markdown content"` for inline descriptions
- Use `--spec-id "<id>"` to link a bead to its source document. The `spec_id`
  holds the document's **stable `id`** (read from the document's frontmatter —
  per ADR-0001, identity is the document `id`, not the file path): the spec's
  `id` on the epic, the ADR's own `id` on an ADR bead.
- Use `--parent <epic-id>` to create a child under an epic
- 4 rich-text fields: description (`-d`), design (`--design`),
  acceptance criteria (`--acceptance`), notes (`--notes`)
- Priority: 0-4 or P0-P4 (0=critical, 2=medium, 4=backlog).
  NOT "high"/"medium"/"low"
- Types: `task`, `bug`, `feature`, `epic`, `chore`, `decision`
  - `task` — default; discrete unit of work (implementation, research, setup)
  - `bug` — defect or regression in existing behavior
  - `feature` — new user-facing capability
  - `epic` — container for child beads; not directly implementable
  - `chore` — maintenance, refactoring, or infrastructure with no user-visible change
  - `decision` — architectural or design decision to record (aliases: `dec`, `adr`)

## Updating Issues

```
bd update <id> --title "..." --description "..." --notes "..."
bd update <id> --status in_progress
bd update <id> --assignee username
bd update <id> --body-file=<path>            # Sync body from file content
```

**WARNING**: Do NOT use `bd edit` — it opens $EDITOR which blocks agents.
Always use `bd update` with inline flags instead.

## Claiming and Closing

```
bd update <id> --claim                 # Atomic: sets assignee + in_progress
bd close <id> --reason "what you did"  # Complete work
bd close <id1> <id2> ...               # Close multiple at once (more efficient)
```

## Finding Work

```
bd ready --json                        # Unblocked work
bd ready --parent <epic> --json        # Scoped to an epic
bd show <id> --json                    # Full issue details
bd list --status open --json           # All open issues
bd list --spec "<id>" --json           # Find a bead by its source document id
bd blocked --json                      # Blocked issues
```

## Filing Discovered Work

When you find something that needs attention while working on another task —
a bug, tech debt, missing tests — file it immediately. Always set the type and
priority explicitly based on what you discovered:

```
bd create "Found issue" -d "Details" --type bug --priority 1 --deps discovered-from:<current-bead-id> --json
```

This creates the new issue and links it back to the bead where you discovered it.
Adjust `--type` and `--priority` to match the nature and urgency of the issue.

### Inside the epic or outside it?

When you discover work while executing an epic, decide where the new bead
lives before you create it:

- **Related to the epic** — it is in the epic's scope, or the epic cannot
  honestly ship without it:
  1. Create it as a child of the epic with `--parent <epic-id>`.
  2. Add a dependency from the review bead to the new bead so the review
     cannot close until the new work is done:
     `bd dep add <review-bead-id> <new-bead-id>`
- **Unrelated to the epic** — pre-existing tech debt, a bug in code the epic
  does not touch: create it standalone, with no `--parent` and no review-bead
  dependency. The `discovered-from` link preserves the trail; an unrelated
  finding must not hold the epic hostage.

If you discover an **epic-related** issue **while executing the review bead**:

1. Create the child bead, stamp its `agent` label (`bd set-state <id>
   agent=omg-builder`), and wire the dependency as above.
2. Stop the review immediately — the review bead is now blocked by the
   new bead and cannot be closed anyway.
3. Set the review bead back to open: `bd update <review-bead-id> --status open`
4. Hand back so the foreman's ready-queue loop can dispatch and finish the new
   bead.
5. When the review bead appears in the ready queue again, the foreman dispatches
   it back to you; restart the review from scratch.

## ADR Beads

A spec may have architectural decisions recorded as ADR documents alongside it.
At decomposition, each ADR becomes its own bead linked to the epic — see
`omg-epics` for where this sits in the decomposition flow.

Find the ADRs for a spec by scanning the shared docs tree (the resolver's
`docs_root`) for ADR files — `id` starting `adr.` — whose `produced_for`
frontmatter equals the spec's `id`. That match is the complete, deterministic
set — nothing hands you the list, you derive it.

### Creating the bead

A document carries YAML frontmatter that must **not** end up in the bead
description — it renders as junk and a leading `---` breaks Markdown rendering.
Split the file: frontmatter becomes structured bead metadata, the body (with the
frontmatter stripped) becomes the description.

```bash
FILE=<adr-path>
id=$(yq    --front-matter=extract '.id'    "$FILE")
title=$(yq --front-matter=extract '.title' "$FILE")
type=$(yq  --front-matter=extract '.type'  "$FILE")   # 'adr' → bd aliases to 'decision'
meta=$(yq  --front-matter=extract -o=json -I=0 '.' "$FILE")

# Strip the leading frontmatter block; pipe the clean body in as the description.
awk 'NR==1 && $0=="---"{fm=1; next} fm && $0=="---"{fm=0; body=1; next} body' "$FILE" \
  | bd create "ADR: $title" \
      --type "$type" \
      --spec-id "$id" \
      --metadata "$meta" \
      --deps relates-to:<epic-id> \
      --body-file - \
      --json
```

- The bead's `spec_id` is the document's own `id` (per ADR-0001, identity is the
  document `id`, not the file path). Shipping uses the same `id` as the Hindsight
  document id, so one value serves both.
- `--metadata` stores the whole frontmatter as a queryable JSON object on the
  bead, kept out of the rendered description. `--body-file -` reads the stripped
  body from stdin.
- Use `relates-to` (an associative link), **not** `parent-child` or `blocks`. An
  ADR is decided context, not a unit of work: it must hang beside the epic
  without gating ready-work. The ADR's *decisions* already live in the spec body
  (the implementation-writer folded them in); the ADR bead preserves the ADR
  itself as the durable record of why.

### Setting state and closing

If the document's frontmatter has a `hindsight` block, mark the bead for
ingestion, then close it:

```bash
bd set-state <id> hindsight=pending --reason "Minted from <doc-id>; awaiting ingest"
bd close <id> --reason "Decision recorded; ADR finalized."
```

The **presence of a `hindsight` block** is the only frontmatter signal read into
logic here — it means "this document is memory, ship it." Every field inside the
block (and elsewhere) is captured verbatim in `--metadata` and is free to evolve
without touching this runbook. A document with no `hindsight` block is minted and
closed but gets no `hindsight` state — it never ships to memory.

Close the bead because a recorded ADR is a **decided** decision, not work: an
open `decision` bead means "still being decided" and would surface in
`bd ready`. (Leave it open only if the ADR is genuinely still being worked.)

## Hindsight Lifecycle

A bead that ships to Hindsight carries a single `hindsight` **state dimension**,
managed with `bd set-state` (which atomically swaps the dimension's label and
records an event). It is the one mutable thing on the bead once it has shipped.
Values:

- `hindsight=pending` — has a `hindsight` block, not yet shipped. The ship
  queue: `bd list --label hindsight:pending`.
- `hindsight=shipped` — retained in Hindsight; the quiet steady state. **This is
  the freeze point** (see below).
- `hindsight=tombstoned` — superseded; awaiting retraction. The retract
  queue: `bd list --label hindsight:tombstoned`.
- `hindsight=retracted` — removed from Hindsight; the bead is closed as
  superseded but kept as the audit record.

No `hindsight` label at all means the document is not ingested.

## Immutability and Supersession

**Shipping** a bead to Hindsight freezes it — not minting it. A bead is mutable
between mint and ship: an ADR bead mints, ships, and closes in close succession,
but an **epic ships at close** (`hindsight=pending` at mint, shipped only once the
work is done), so the work that was decomposed but never built never enters memory
as phantom finished work, and the epic may accumulate working notes until it
ships. Once a bead is `hindsight=shipped`, its content is immutable; the
`hindsight` state label is the only thing that moves afterward.

A shipped bead's description, metadata, and document body are never edited in
place. To change shipped memory, **supersede** it:

1. Mint a new document with a new `id` and `supersedes: <old-id>` in its
   frontmatter; set `superseded_by: <new-id>` on the old document.
2. Create the new bead from it (the flow above), `hindsight=pending`.
3. Tombstone the old bead: `bd set-state <old-bead-id> hindsight=tombstoned
   --reason "Superseded by <new-id>"`.

The retract flow then removes the old document from Hindsight by `id` (per the
`hindsight-cli` references), sets the old bead to `hindsight=retracted`, and
closes it as superseded. The old bead is **kept, never deleted** — it is the
record of what was proposed and why it was replaced.
Deleting from Hindsight and re-ingesting the clean version keeps memory accurate;
keeping the bead keeps the history auditable.

## Comments

Comments are append-only, timestamped, attributed records on an issue. Use them
when you need a durable trail — recording a deviation from the bead's
description, a decision made mid-work, a handoff note. Notes (`--notes`) are a
single overwritable scratch field; do not use notes for history.

```
bd comment <id> "text of the comment"  # Add (author auto-detected from git)
bd comment <id> --file notes.txt       # Read comment text from a file
bd comments <id>                       # List comments (oldest first)
bd comments <id> --json                # List as JSON
```
