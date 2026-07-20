---
schema_version: 1
id:            # mint with next-id.sh — never hand-pick (see Minting the `id`); type segment is `design`, not `design-doc`
type: design
title:         # human title
status: draft
domain:        # the id's second dotted segment
created_at:    # date -u +"%Y-%m-%dT%H:%M:%SZ" — the real instant, UTC
updated_at:    # refresh on every edit, UTC
hindsight:     # present ⇒ this doc ships to memory; only the user removes this block
  strategy:    # optional bank retain strategy per hindsight.md — delete this line for the bank default
  tags:        # key:value list, chosen by judgment from hindsight.md
---

# <System / Feature Name> — Design Doc

> Design document. Argues for a whole approach to building something: the
> proposed structure, the alternatives weighed, and the reasoning that connects
> goals to design.

## Goals

What this design must achieve.

## Non-Goals

What this design explicitly does not set out to do.

## Context

The existing system and constraints the design must fit within.

## Proposed Approach

The architecture or design — components, their responsibilities, and how they
interact.

## Alternatives Considered

The other approaches that were weighed and why each was not chosen.

## Tradeoffs

What the proposed approach gains and what it gives up.

## Operational Considerations

How it is deployed, observed, and run, and how it behaves when things fail.

## Open Questions

Unresolved decisions and dependencies.
