# User Story — Product Manager's Lens

The form of a user story — its sections — lives in the `doc-templates` skill
(`templates/user-story.md`). This file covers what the **product manager** does
within that form: a story captures one unit of user value from the user's
perspective, with acceptance criteria that confirm it is done.

## What the PM checks

- **It is framed from the user.** The "as a / I want / so that" names a real user,
  a real goal, and a real benefit — the benefit is not a restatement of the goal.
- **It is one unit of value.** A story that bundles several independent needs is
  several stories. Flag it for splitting.
- **The benefit justifies the work.** The "so that" connects to something the user
  actually gains. A story whose benefit is hollow is work with no buyer.
- **Acceptance criteria are checkable.** Each is a condition you could confirm
  true or false, covering the behavior that matters including the edges.
- **Scope is bounded.** What the story does not cover is stated so it does not
  quietly grow.

## Smells the PM flags

- **No real benefit.** A "so that" that merely repeats the "I want," or that no
  user would actually value.
- **Epic in disguise.** Several distinct needs packed into one story.
- **Unverifiable acceptance.** Criteria you could not confirm — vague or
  subjective.
- **Solutionized.** A story that dictates implementation instead of describing the
  user's need.
