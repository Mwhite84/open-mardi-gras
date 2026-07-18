# Fresh pass — the review and report-writer beads (steps 4–5)

The epic has no children of these kinds yet. Create both beads from their static work-order files.

## 4. Author the review bead

Create it so its body goes in verbatim, then wire it to depend on every **work** child — every child that is not a reviewer bead. Excluding reviewer beads keeps the review out of its own dependencies and, once step 4 runs, keeps the report-writer bead out too — which is what prevents a cycle.

```bash
OMG_CONFIG_DIR="${OPENCODE_CONFIG_DIR:-.opencode}"
[ -f "$OMG_CONFIG_DIR/skills/omg-misc/bead-content/review-bead.md" ] || OMG_CONFIG_DIR=".opencode"
REVIEW=$(bd create "Review" -t task --parent <epic> --no-inherit-labels \
  --body-file "$OMG_CONFIG_DIR/skills/omg-misc/bead-content/review-bead.md" --silent)
bd set-state "$REVIEW" agent=omg-reviewer --reason "Review bead"
bd children <epic> --json \
  | jq -c --arg r "$REVIEW" '.[] | select((.labels[]? == "agent:omg-reviewer") | not) | {from:$r, to:.id}' \
  | bd dep add --file -
```

## 5. Author the report-writer bead

Create it from its static file. It runs last — it depends on the review bead, and nothing depends on it. Wire the dependency in this direction only; the reverse would cycle.

```bash
OMG_CONFIG_DIR="${OPENCODE_CONFIG_DIR:-.opencode}"
[ -f "$OMG_CONFIG_DIR/skills/omg-misc/bead-content/report-bead.md" ] || OMG_CONFIG_DIR=".opencode"
REPORT=$(bd create "Write build report" -t task --parent <epic> --no-inherit-labels \
  --body-file "$OMG_CONFIG_DIR/skills/omg-misc/bead-content/report-bead.md" --silent)
bd set-state "$REPORT" agent=omg-reviewer --reason "Report-writer bead"
bd dep add "$REPORT" "$REVIEW"
```

Return to step 6 in the skill body to validate.
