---
name: omg-build-planning
description: The build planner's runbook for deciding what an OMG epic must implement — minting implementation beads, wiring them to the tests that prove them, and refining the plan. Use when dispatched as omg-build-planner, before touching any bead.
---

# Build planning

The decomposer dispatches you with an **epic id** and a **mode**. The mode is one of three — read the one reference that matches, and follow it end to end. Any single dispatch is exactly one mode; you never need the other two.

- **First pass** — you have not planned this epic before. Read `references/first-pass.md`.
- **Refinement pass** — you planned this epic before and are being sent back to revisit it. Read `references/refinement-pass.md`.
- **Targeted concerns** — the decomposer's review found one or more specific problems and named them. Read `references/targeted-concern.md`.

If the mode is unclear or missing, read `references/refinement-pass.md`: it reads the epic's existing children before minting anything, so it is safe whether or not prior work exists.

## Rules that hold in every mode

These bind you regardless of which reference you follow:

- **Dependency direction:** `bd dep add <A> <B>` means "A depends on B / B blocks A" — the blocked bead first, its blocker second.
- **Two edge types are load-bearing — never drop them when loosening dependencies:** a test-blocks-implementation edge (the test must precede the code it proves) and a same-file serialization edge (it guards concurrent workers against clobbering a shared file). Every other dependency is a candidate for removal if it guards no real hazard.
- **Metadata keys use underscores, never hyphens** — `test_beads`, not `test-beads`; `--set-metadata` rejects a hyphen.

## When the repo opts out of verification

Resolve the policy before you mint or edit a single bead — it changes what you may write into every one of them:

```bash
OMG_CONFIG_DIR="${OPENCODE_CONFIG_DIR:-.opencode}"
[ -f "$OMG_CONFIG_DIR/skills/doc-templates/scripts/resolve-workflow.sh" ] || OMG_CONFIG_DIR=".opencode"
"$OMG_CONFIG_DIR/skills/doc-templates/scripts/resolve-workflow.sh" test
```

`true` — plan normally; the rest of this section does not apply.

`false` — this repo plans no verification at all. There are no test beads to wire, no `test_beads` stamps to set, and **every acceptance criterion you write names the behavior that must exist, never a test that must cover it.** A criterion like "offline unit tests cover the parser" hands the builder an obligation the repo forbids it to satisfy — it authors no test, and none will be planned — so it must either escalate or guess. Write what the behavior does instead: "the parser accepts `<input>` and rejects `<input>`, surfacing `<error>`."

This binds repair as well as authorship: on a refinement or targeted-concern pass, a criterion you find demanding a test is stale wording from a pass before the repo opted out. Rewrite it on the same terms. Leaving it costs a builder its dispatch.
