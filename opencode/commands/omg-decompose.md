---
description: Mint the epic from a spec and decompose it into child tasks with dependencies
agent: omg-decomposer
---

Decompose the specification at `$1` into an epic with child tasks.

Use the `omg-epics` and `omg-commands` skills for the mechanics — minting the
epic, creating ADR beads, creating children, wiring dependencies, the review bead
pattern, validation, and the refinement passes. Carry out the decomposition end
to end, observing these command-specific gates:

- **Mint the epic from the spec.** The epic does not exist before this command —
  nothing upstream creates a bead. Read the spec's stable `id` from its
  frontmatter and create the epic with that as its `spec_id`, splitting the spec
  frontmatter into `--metadata` and the stripped body into the description per
  the `omg-epics` skill. Confirm with me before creating it.
- **Create ADR beads for this spec.** Scan the shared docs tree
  (!`.opencode/skills/doc-templates/scripts/resolve-workflow.sh docs_root`)
  for ADR files (`id` starting `adr.`) whose `produced_for` frontmatter equals the
  spec's `id`. For each, mint a bead (its `spec_id` is the ADR's own `id`) and link
  it to the epic with a `relates-to` edge — not `parent-child`. If there are no
  such ADRs, there are no ADR beads; that is fine.
- **Commit before creating children.** The decomposition must start from a clean,
  recorded state: if `$1`, any ADR files, or `.beads/` have uncommitted changes,
  commit them with a signed commit (`git commit -S`).
- **Present the structure and wait.** When the epic, ADR beads, children,
  dependencies, review bead, validation, and refinement passes are done, show me
  the final structure and stop for my review.
- **Commit after I approve.** If `.beads/` changed in git, commit it with a signed
  commit. The spec and ADR files stay in the repo — they are the durable
  artifacts; the epic body carries a synced copy of the spec.
