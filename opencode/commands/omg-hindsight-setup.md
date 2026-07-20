---
description: Design a project's Hindsight memory — the bank architecture and/or the repo's hindsight.md tagging-intent doc
agent: omg-hindsight-architect
---

Set up this project's Hindsight memory. $ARGUMENTS

Decide which job the project needs and do it — do not assume:

- If the bank this project ships to **does not exist yet**, or its structure
  (banks, tag dimensions, entity labels, retain strategies, mental models) is what
  needs deciding, design it with the `hindsight-architecture` skill.
- If the bank **already exists** (the common case) and what is missing is the
  repo-root **`hindsight.md`** tagging-intent doc, author it with the
  `hindsight-guidance` skill.

Most repos need only the `hindsight.md`. Read the bank's live vocabulary first
(`hindsight-cli`), then:

1. **Ask whether existing documents set a tagging convention to honor.** If the
   project already has specs/ADRs with `hindsight` frontmatter, ask for the
   directory so you can hold the guidance to that convention (or diverge from it
   deliberately, with my agreement).
2. **Reconcile before writing.** If the bank's declared vocabulary, the tags
   actually in use, the existing documents' frontmatter, or any current
   `hindsight.md` **disagree**, stop and show me the specific conflict and your
   recommendation — do not blend them into an amalgamation that matches none.
3. **Write `hindsight.md`** (or propose the bank template) once the vocabulary and
   intent are reconciled.

When done, tell me what you wrote, any conflict you surfaced and how it resolved,
and any follow-up (a bank-side change that must run in Hindsight, or documents that
need re-tagging). Remind me to restart opencode if you changed config it loads at
startup.
