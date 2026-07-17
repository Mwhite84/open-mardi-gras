---
description: Harden a spec into an implementation contract a coding agent can build from
agent: omg-implementation-writer
---

Harden the specification at `$1` for the coding agent who will implement it with
no chance to ask a follow-up question. This is one hardening pass; it can be run
multiple times until no issues remain.

First, gather your inputs:
1. Read the spec at `$1` thoroughly, including its `id` in the frontmatter.
2. Find every ADR produced for this spec: scan the shared docs tree
   (!`OMG_CONFIG_DIR="${OPENCODE_CONFIG_DIR:-.opencode}"; [ -f "$OMG_CONFIG_DIR/skills/doc-templates/scripts/resolve-workflow.sh" ] || OMG_CONFIG_DIR=".opencode"; "$OMG_CONFIG_DIR/skills/doc-templates/scripts/resolve-workflow.sh" docs_root`)
   for ADR files (`id` starting `adr.`) whose `produced_for` frontmatter equals
   this spec's `id`. The resolver returns the whole shared root, so this finds
   ADRs wherever they live in the tree (central or this repo's subtree). Those are
   the architectural decisions that constrain the implementation.
3. Discover additional context before hardening: use the `hindsight-cli` skill to
   draw on what the project already knows but the spec and ADRs assume rather than
   restate. Pursue only the threads that bear on making this spec buildable, and
   stop once you have enough — this informs the gaps and edge cases you hunt below.

Then work the spec, using the `doc-templates` spec template as the reference for
its sections:

1. **Fold ADR consequences into the spec.** For each ADR, write its *decision*
   into the spec as a plain requirement or constraint the coding agent must
   follow ("use Postgres," "writes go through the queue"). Do **not** carry the
   ADR's rationale, rejected alternatives, or "why" into the spec — that is noise
   to the implementer. The ADR remains the record of why; the spec carries only
   what to do.
2. **Gaps** — find requirements too vague for a coding agent to implement without
   asking, and resolve them with me.
3. **Contradictions** — flag any requirements that conflict, including conflicts
   the folded-in decisions introduce.
4. **Edge cases** — surface the failure modes, error states, and boundary
   conditions the spec does not yet address.
5. **Acceptance criteria** — pair every requirement with a way to verify it; add
   criteria where missing.
6. **Open questions** — drive every unresolved item to resolution with me, or to
   explicit deferral with my agreement. A spec that still carries open questions
   is not ready for handoff.

Update the spec file in place with the agreed changes. Do not rewrite sections
that are already solid, and do not reopen settled product or architecture
decisions — if you believe one is wrong, raise it with me rather than overriding
it.

Then ask me whether to commit this pass — I may want another. If I say yes,
commit the spec file with a signed commit (`git commit -S`).

When you believe the spec leaves the coding agent nothing to guess at, say so and
suggest running `/omg-decompose $1`.
