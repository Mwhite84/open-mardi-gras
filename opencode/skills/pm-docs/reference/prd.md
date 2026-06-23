# PRD — Product Manager's Lens

The form of a PRD — its sections — lives in the `doc-templates` skill
(`templates/prd.md`). This file covers what the **product manager** does within
that form: a PRD must define a real problem, the user it serves, and the outcome
that tells you it worked — without prescribing how it is built.

## What the PM checks

- **The problem is real and stated first.** It names an actual user need, not a
  feature in search of a justification. If it reads as a solution, walk it back to
  the need it claims to serve.
- **The target user is specific.** A defined segment whose need this serves, not
  "everyone." A PRD for everyone serves no one.
- **Goals are outcomes, not activities.** What changes for the user or the
  business, not what gets shipped.
- **Success metrics are measurable.** Each goal has a signal that would show it was
  met. A goal with no metric cannot be confirmed.
- **Non-goals and scope are explicit.** What is out and what is deferred is stated
  as deliberately as what is in.

## Smells the PM flags

- **Solution-first.** A feature described before the problem it solves is
  established.
- **Build-for-everyone.** No specific user, or a target so broad it commits to
  nothing.
- **Vanity goals.** Goals stated as output ("ship X") rather than outcome ("users
  do Y more").
- **Unmeasurable success.** "Improve the experience" with no signal that would
  confirm it.
- **Implementation creep.** The PRD prescribing how it is built rather than what it
  must do. That is the architect's territory.
