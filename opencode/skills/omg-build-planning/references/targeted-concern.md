# Targeted concerns — resolve the specific problems the decomposer raised

The decomposer reviewed the whole plan, found one or more specific problems, and sent them to you in words. Your job is those named problems — not a re-plan. The plan is otherwise sound; touch only what the concerns implicate, and leave everything else exactly as it is. Work through each concern the decomposer listed; resolve every one before you report back.

## Understand the concerns

Read each of the decomposer's concerns carefully — each is a supervisor's observation at the level of the whole plan (a requirement that looks uncovered, a bead that looks mis-scoped, a dependency that looks wrong or missing). Each is a question for you, the SME, to resolve; the decomposer did not decide the fix, it flagged the smell.

Ground each concern in the actual beads before you act:

```bash
bd show <epic> --long --json                                   # the spec, to check an obligation
bd children <epic> --json | jq -r '.[] | "\(.id)\t\(.issue_type)\t\(.title)"'   # the current plan
bd show <bead-in-question> --long --json                       # the specific bead(s) the concern names
```

## Resolve them, and nothing else

Act on each concern with the smallest correct change:

- **A requirement looks uncovered** — confirm against the spec. If it is genuinely uncovered, mint the missing implementation bead (`bd create … --parent <epic> --no-inherit-labels --silent`, `bd set-state <impl> agent=omg-builder`), wire any planned test to block it, and stamp its `test_beads`. If it was already covered and the decomposer misread it, say so in your report — do not mint a duplicate.
- **A bead looks mis-scoped** — split one too large, or merge two too small, per your own sizing judgment.
- **A dependency looks wrong** — add a missing ordering edge, or drop one that throttles parallelism without guarding a real hazard. (The two load-bearing edge types named in the skill body are never dropped.)
- **A bead looks thin** — add the missing *what*, *where*, or acceptance criteria so a builder can execute it without a question.

Report back what you changed and why, concern by concern. If, on inspection, a concern was already satisfied, report that for it rather than inventing a change.
