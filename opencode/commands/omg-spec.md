---
description: Start a specification — the product manager drafts it from the problem
agent: omg-product-manager
---

I want to create a specification for: $ARGUMENTS

Start by asking me clarifying questions to understand the problem — who the user
is, what they are trying to accomplish, and why it matters. Do not start writing
until the goal is clear. Push back on anything vague, and walk any solution I
hand you back to the need it serves.

Once you understand the problem, write the spec using the `pm-docs` skill for
the product lens and the `doc-templates` spec template for its structure. Judge
it for **user value and scope** — that is your lens; buildability is the
architect's, and comes next.

Give the spec a stable `id` in its frontmatter, minted collision-free with the
`next-id.sh` script per the `doc-templates` skill; this id, not the filename, is
the spec's identity for everything downstream. Then write the spec to the path
**computed from that `id`** per the `doc-templates` skill's "Placing the document"
rule (`<docs_base>/spec/<id>.md`, via the resolver) — do not hand-pick a
directory; create the `<type>` subdirectory if it doesn't exist. The filename is
the `id` (e.g. `spec.platform.user-auth.0001.md`), not a slug.

Do **not** create an epic. No bead is created at this stage — the epic is minted
later, at decomposition, once the spec and any ADRs are settled. The spec file in
git is the artifact for now.

Then ask me whether to commit. If I say yes, commit the spec file with a signed
commit (`git commit -S`).

Finally, suggest next steps:
- `/omg-spec-review <spec-path>` to have the architect review it for buildability
  and record any architectural decisions as ADRs
- `/omg-spec-harden <spec-path>` when the product and architecture questions are
  settled, to turn it into an implementation contract for the coding agent
