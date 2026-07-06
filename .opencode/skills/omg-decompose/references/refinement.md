# Refinement pass — the review and report-writer beads (steps 4–5)

Both beads already exist from the prior run. The cardinal rule: **never create a second copy.** Find each and verify; the planners may have added, dropped, or resized work children this pass, so the review bead's dependency set needs reconciling.

## 4. Reconcile the review bead

Find it by title and label — do **not** mint a second one — then re-run its wiring so it depends on the current work children, picking up any the planners added. Re-adding an edge that already exists is a harmless no-op, so a plain re-wire is safe.

```bash
REVIEW=$(bd children <epic> --json \
  | jq -r '.[] | select(.title == "Review" and (.labels[]? == "agent:omg-reviewer")) | .id' | head -n1)
[ -n "$REVIEW" ] || { echo "refinement: review bead not found on the epic" >&2; exit 1; }

bd children <epic> --json \
  | jq -c --arg r "$REVIEW" '.[] | select((.labels[]? == "agent:omg-reviewer") | not) | {from:$r, to:.id}' \
  | bd dep add --file -
```

Excluding reviewer beads from the wiring keeps both the review bead and the report-writer bead out of the review's dependencies — which is what prevents a cycle, since the report bead already depends on the review.

If a planner **dropped** a child this pass, its bead is closed; a closed dependency cannot block the review, so no edge needs removing. The review's stale edges to closed work are inert.

## 5. Confirm the report-writer bead

It already exists and its single dependency — on the review bead — has not changed. Find it to confirm it is present; it needs no re-wiring.

```bash
REPORT=$(bd children <epic> --json \
  | jq -r '.[] | select(.title == "Write build report" and (.labels[]? == "agent:omg-reviewer")) | .id' | head -n1)
[ -n "$REPORT" ] || { echo "refinement: report-writer bead not found on the epic" >&2; exit 1; }
```

Return to step 6 in the skill body to validate.
