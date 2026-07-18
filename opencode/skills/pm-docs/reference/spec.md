# Spec — Product Manager's Lens

The form of a spec — its sections — lives in the `doc-templates` skill
(`templates/spec.md`). A spec is often collaborative: the omg-product-manager
judges it for **user value and scope**, while the omg-architect judges the same
spec for **buildability** (see `architect-docs`). This file covers the PM's lens.

## What the PM checks

- **Every requirement serves a stated need.** Each traces back to a user problem
  or product goal. A requirement that serves no need is scope with no buyer.
- **The user-facing behavior is right.** What the system does, framed in terms of
  what the user experiences and needs — not internal mechanism.
- **Scope is honest.** What is in, out, and deferred is explicit. Non-goals are
  present so the spec does not quietly expand.
- **Acceptance reflects the need.** The criteria confirm the user's problem is
  actually solved, not just that some behavior occurs.
- **Priority is clear where it matters.** When requirements compete for time, the
  spec signals what is essential versus what is optional.

## Smells the PM flags

- **Requirements with no rationale.** Behavior specified that no goal or user need
  asked for.
- **Gold-plating.** Capability beyond what the problem requires — cost with no
  buyer.
- **Scope without boundaries.** No non-goals, so the spec invites endless
  expansion.
- **Acceptance that misses the point.** Criteria that confirm the mechanism works
  but not that the user's need is met.
