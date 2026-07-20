---
schema_version: 1
id:            # mint with next-id.sh — never hand-pick (see Minting the `id`)
type: prd
title:         # human title
status: draft
domain:        # the id's second dotted segment
created_at:    # date -u +"%Y-%m-%dT%H:%M:%SZ" — the real instant, UTC
updated_at:    # refresh on every edit, UTC
hindsight:     # present ⇒ this doc ships to memory; only the user removes this block
  strategy:    # optional bank retain strategy per hindsight.md — delete this line for the bank default
  tags:        # key:value list, chosen by judgment from hindsight.md
---

# <Product / Feature Name> — PRD

> Product Requirements Document. Defines the problem, who it is for, and what
> success looks like — not how it is built.

## Problem

The user problem or need this addresses, and why it matters now.

## Target Users

Who this is for. The specific segment whose need this serves.

## Goals

The outcomes this product or feature is meant to achieve.

## Non-Goals

What this explicitly does not set out to do.

## Success Metrics

How success will be measured — the signals that show the goals were met.

## Requirements

What the product must do, at the level of user-facing capability.

## Scope

What is in, what is out, and what is deferred to later.

## Open Questions

Unresolved decisions, assumptions to validate, and dependencies.
