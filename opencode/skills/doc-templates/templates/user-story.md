---
schema_version: 1
id:            # mint with next-id.sh — never hand-pick (see Minting the `id`)
type: user-story
title:         # human title
status: draft
domain:        # the id's second dotted segment
created_at:    # date -u +"%Y-%m-%dT%H:%M:%SZ" — the real instant, UTC
updated_at:    # refresh on every edit, UTC
hindsight:     # present ⇒ this doc ships to memory; only the user removes this block
  strategy:    # optional bank retain strategy per hindsight.md — delete this line for the bank default
  tags:        # key:value list, chosen by judgment from hindsight.md
---

# <Story Title>

> User story. A single unit of user-facing value, framed from the user's
> perspective with the conditions that confirm it is done.

## Story

As a `<type of user>`, I want `<goal>` so that `<benefit>`.

## Context

Background a reader needs to understand the story and why it matters.

## Acceptance Criteria

The conditions that must hold for the story to be considered complete. One
checkable statement per line.

## Out of Scope

What this story deliberately does not cover.

## Notes

Open questions, dependencies, and assumptions.
