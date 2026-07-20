---
description: Architect reviews a spec for buildability and records any decisions as ADRs
agent: omg-architect
---

Review the specification at `$1` for buildability.

Use the `architect-docs` skill for the review lens and the `doc-templates` spec
template as the reference for what the spec should carry. Judge it for
**buildability and verifiability** — can this be implemented as written, and can
the result be checked against it. The product value and scope are the product
manager's call, already made; do not relitigate them. Surface where the spec is
underspecified, where a requirement hides an unresolved architectural choice, and
where the design is unsound or carries risk the spec does not acknowledge.

Some reviews surface a genuine architectural decision — a choice with real
tradeoffs and lasting consequences. Some do not. **Write an ADR only when there
is a decision worth recording.** Do not manufacture an ADR to satisfy this step;
a review that finds nothing architecturally significant simply records that the
spec holds and ends.

When an ADR is warranted, write it using the `architect-docs` ADR reference and
the `doc-templates` ADR template. Give each ADR:
- a stable `id` in its frontmatter, minted collision-free with the `next-id.sh`
  script per the `doc-templates` skill,
- placement computed from that `id` per the `doc-templates` skill's "Placing the
  document" rule (`<docs_base>/adr/<id>.md`, via the resolver) — do not hand-pick
  a directory, and
- a `produced_for` field set to the **spec's `id`** (read it from the
  spec's frontmatter). This back-reference is how decomposition later finds every
  ADR that belongs to this spec, so it must be present and correct on each ADR.

Present your findings: what blocks (kept separate from what is merely worth
considering), what is sound, and any ADRs you wrote. Then ask me whether to
commit. If I say yes, commit the spec and any new ADR files with a signed commit
(`git commit -S`).

Suggest next steps:
- chat with me to resolve anything you raised
- `/omg-spec` again (omg-product-manager) if the findings change product scope
- `/omg-spec-harden <spec-path>` once the architecture questions are settled
