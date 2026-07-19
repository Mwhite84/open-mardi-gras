---
schema_version: 1
id:            # mint with next-id.sh — never hand-pick (see Minting the `id`)
type: adr
title:         # human title — beads minted from this document inherit it
status: draft
domain:        # the id's second dotted segment
created_at:    # date -u +"%Y-%m-%dT%H:%M:%SZ" — the real instant, UTC
updated_at:    # refresh on every edit, UTC
produced_for:  # id of the spec this decision serves — decomposition finds ADRs by scanning this
# superseded_by: <id of the replacing ADR, when status becomes superseded>
hindsight:     # present ⇒ this doc ships to memory; only the user removes this block
  strategy:    # optional bank retain strategy per hindsight.md — delete this line for the bank default
  tags:        # key:value list, chosen by judgment from hindsight.md
---

# ADR <number>: <Title>

> Architecture Decision Record. Captures one decision: its context, the options
> weighed, the choice made, and the consequences accepted. An ADR is frozen once
> it ships to memory — supersede a shipped ADR with a new one rather than editing
> it. Before it ships, it is a working file and is refined in place; marking it
> `final` does not freeze it.

## Status

draft | proposed | final | superseded | deprecated

(`final` is the classic ADR "Accepted". A superseding ADR's id goes in the `superseded_by:` frontmatter field, not in the status text. This section mirrors the frontmatter `status` for human readers.)

## Context

The forces in play — requirements, constraints, pressures — that made this
decision necessary.

## Options Considered

The alternatives that were seriously weighed, including the one chosen.

## Decision

The decision, stated plainly in the active voice.

## Consequences

The benefits gained and the costs, risks, and new constraints accepted.
