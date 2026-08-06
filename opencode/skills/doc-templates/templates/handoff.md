---
schema_version: 1
id:            # mint with next-id.sh — never hand-pick (see Minting the `id`)
type: handoff
title:         # human title
status: draft
domain:        # the id's second dotted segment
created_at:    # date -u +"%Y-%m-%dT%H:%M:%SZ" — the real instant, UTC
updated_at:    # refresh on every edit, UTC
hindsight:     # present ⇒ this doc ships to memory; only the user removes this block
  strategy:    # optional bank retain strategy per hindsight.md — delete this line for the bank default
  tags:        # key:value list, chosen by judgment from hindsight.md
---

# <System / Rollout Name> — Handoff

> Handoff record. Names obligations that must happen and are not this
> repository's to discharge, and who owns each.

## Overview

What system or rollout this hands off, and the specs whose relocated
requirements feed this document.

## Obligations

Each obligation that left the repository. For each one: what must happen, why it
left (the bound it fell outside), what this repository supplies toward it, who
owns it, and what would show it satisfied.

*How* to discharge an obligation belongs to whoever owns it and is not recorded
here.

## Unowned Obligations

Obligations with no named owner. An entry here records a hole in the system
decomposition; the empty section is the normal state.
