---
schema_version: 1
id:            # mint with next-id.sh — never hand-pick (see Minting the `id`)
type: spec
title:         # human title — the epic minted from this spec inherits it
status: draft
domain:        # the id's second dotted segment
created_at:    # date -u +"%Y-%m-%dT%H:%M:%SZ" — the real instant, UTC
updated_at:    # refresh on every edit, UTC
hindsight:     # present ⇒ this doc ships to memory; only the user removes this block
  strategy:    # optional bank retain strategy per hindsight.md — delete this line for the bank default
  tags:        # key:value list, chosen by judgment from hindsight.md
---

# <System / Component Name> — Spec

> Specification. Defines what the system or component must do, precisely enough
> to be built and verified against.

## Overview

What this specifies and the context it sits in.

## Requirements

The required behaviors and properties, each stated so it can be verified.

## Inputs and Outputs

For each behavior, what goes in, what comes out, and the shape of each.

## Preconditions and Assumptions

The conditions under which the behavior holds and what is assumed going in.

## Error and Edge Behavior

What happens on invalid input, failure, timeout, or limit.

## Non-Goals

What the system is explicitly not required to do.

## Relocated Requirements

Requirements that left this spec and where each one went. Unlike a non-goal,
which is not being done at all, a relocated requirement must still happen — just
not here.

## Acceptance Criteria

How each requirement is confirmed satisfied.

## Open Questions

Unresolved points and dependencies.
