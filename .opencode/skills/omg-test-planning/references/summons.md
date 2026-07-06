# Summons resolution

You were dispatched onto a **child bead that exists only to summon you** for one decision. It arrives long after your plan pass ended, so it carries a link back to the bead it came from — that source bead is the fix (or the stuck test) you are being summoned about.

Read the summons bead and its comments:

```bash
bd show <summons> --long --json
bd comments <summons>
```

The link back is a dependency of type `discovered-from` in the summons bead's `dependencies` array. Pull the source bead's id from there:

```bash
# the id of the bead this summons was discovered from — the fix (or stuck test) at issue
bd show <summons> --long --json \
  | jq -r '.[0].dependencies[]? | select(.dependency_type == "discovered-from") | .id'
```

Then read that source bead (`bd show <id> --long --json`) for the full context of what you are deciding.

Two situations bring you here. The bead's description tells you which:

- **It asks you to plan verification for a fix.** The reviewer found a defect, filed a fix bead, and needs you to decide how that fix gets verified. You MUST read `references/summons-plan-verification.md` and follow its instructions.
- **It reports that a builder is stuck on a test you planned.** The builder judges one of your tests wrong or impossible (not merely unmet) and has escalated it back to you. You MUST read `references/summons-stuck-builder.md` and follow its instructions.

Whichever it is, **close the summons bead before your run ends.** A summons left open blocks the work waiting on it forever — this is the one deadlock this guards, so the close is never inferred or deferred.
