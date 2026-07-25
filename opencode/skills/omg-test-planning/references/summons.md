# Summons resolution

You were dispatched onto a **child bead that exists only to summon you** for one decision. It arrives long after your plan pass ended, so it carries a link back to the bead it came from — that source bead is the fix (or the stuck test) you are being summoned about.

## First: is there a decision to make at all?

Every summons asks the same underlying question — what verification does this need? A repo that opts out of verification has already answered it, repo-wide, and nothing you decide here can change that answer. Check before you read anything else:

```bash
OMG_CONFIG_DIR="${OPENCODE_CONFIG_DIR:-.opencode}"
[ -f "$OMG_CONFIG_DIR/skills/doc-templates/scripts/resolve-workflow.sh" ] || OMG_CONFIG_DIR=".opencode"
"$OMG_CONFIG_DIR/skills/doc-templates/scripts/resolve-workflow.sh" test
```

`false` — close the summons and stop. Skip the rest of this file:

```bash
bd close <summons> --reason "No verification planned: this repo sets test: false in .workflow.yaml."
```

That one close is a complete and correct dispatch. Two things not to do on the way out: do not re-derive the opt-out by reading the epic and its comments — the resolver is the authority and the epic only records what it already said; and do not substitute hand-verification for the tests you are not planning. Probing the code by hand is unbudgeted work nobody wired, it covers whatever you happen to reach rather than what matters, and it leaves no durable artifact — only comment volume the report-writer must digest. If the opt-out is leaving real risk uncovered, that is a question about the repo's policy, not a gap for you to close one summons at a time.

`true` — continue below.

## Read the summons

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
