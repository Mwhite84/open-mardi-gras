# ADR — Architect's Lens

The form of an ADR — its sections — lives in the `doc-templates` skill
(`templates/adr.md`). This file covers what the **architect** does within that
form: what to verify when building one, and what to catch when reviewing one.

## What the architect checks

- **It is one decision.** An ADR that records several decisions is really several
  ADRs. Flag it for splitting.
- **The context justifies the decision.** The forces named must actually make the
  decision necessary — a reader should understand *why now* without outside
  knowledge.
- **The options were genuinely weighed.** At least the seriously-considered
  alternatives appear, not just the winner. An ADR with no rejected options is an
  assertion, not a decision record.
- **The decision is unambiguous.** The reader never has to infer what was decided.
- **The consequences are honest.** Both the benefits and the costs, risks, and new
  constraints accepted. Upside-only is incomplete.

## Status and immutability

- Confirm the status is present and accurate. `status` records where the decision
  stands (Proposed, Accepted, Superseded, Deprecated). It is an ordinary,
  editable field — marking an ADR `Accepted` does **not** freeze it.
- **Immutability attaches at *ship*, not at a status value and not at mint.** A
  decision is frozen only once it ships to Hindsight (a bead reaching
  `hindsight=shipped`); see **Immutability and Supersession** in `omg-commands`
  for the authoritative rule. Until then the ADR is a working file in the tree —
  including an Accepted-but-unshipped one — and you **refine it in place.** Do not
  supersede an ADR that has not shipped; editing your own un-shipped draft is the
  normal way to incorporate review findings.
- **Supersession is for shipped decisions only.** Once an ADR has shipped, its
  content is frozen: a changed decision is recorded as a *new* ADR (new `id`,
  `supersedes:` the old) rather than an in-place edit, and the old one is tombstoned,
  not deleted. If a refine request would rewrite a *shipped* decision, flag this and
  propose a superseding ADR instead.

## Linking an ADR to its spec

When an ADR records a decision produced for a spec, set `produced_for` on the ADR
to the spec's `id` (read it from the spec's frontmatter). This is the
**single source** of the spec↔ADR relationship: the architect declares it once,
on the ADR, at the moment the ADR is born.

The link lives only on the ADR. Do **not** add a back-reference in the spec
pointing at the ADR — the relationship is single-sourced here on purpose. A second
copy in the spec drifts when ADRs are added, superseded, or retired, and it is
unnecessary: decomposition discovers a spec's ADRs by scanning `produced_for`, not
by reading the spec body. If you review a spec that has grown such a back-link,
flag it for removal and confirm the ADR's `produced_for` is correct instead.

## Smells the architect flags

- **Justifying after the fact.** Context and options written to rationalize a
  choice already made, rather than to show it was reasoned.
- **No alternatives.** The single most common ADR defect.
- **Hidden consequences.** Downsides omitted or softened. Surface them.
- **Decision creep.** Scope grown beyond the one decision the ADR names.
