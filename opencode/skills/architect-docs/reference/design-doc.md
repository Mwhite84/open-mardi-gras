# Design Doc — Architect's Lens

The form of a design doc — its sections — lives in the `doc-templates` skill
(`templates/design-doc.md`). This file covers what the **architect** does within
that form: judging whether the proposed approach is sound, justified, and
operable.

## What the architect checks

- **Goals and non-goals are both present.** Without both, scope is unbounded and
  the design has no yardstick.
- **The approach is concrete enough to evaluate.** Components, their
  responsibilities, and how they interact — not hand-waving.
- **Real alternatives were weighed.** Other approaches that were genuinely on the
  table and why they lost. One option presented as inevitable has not done the
  work.
- **Tradeoffs are explicit.** What the approach gives up, not only what it gains.
- **The binding constraints are named and answered.** Which forces dominate —
  correctness, failure modes, scale, security, operability, maintainability,
  cost — and how the design addresses them. A design that optimizes the wrong
  constraint is elegant and useless.
- **Operability is addressed.** How it behaves when things break, how it deploys,
  and how it is observed. Designs that ignore operability fail in production.

## Smells the architect flags

- **Solution-first.** A design proposed before the goals it must serve are
  established.
- **One option dressed as inevitability.** No real alternatives, or strawmen built
  only to be knocked down.
- **Tradeoffs hidden.** Costs and risks omitted so the chosen approach looks free.
- **Gold-plating.** Complexity, abstraction, or scale that no stated goal or
  constraint requires — cost with no buyer.
- **No operability story.** Steady-state behavior described, but not failure,
  deployment, or observability.
