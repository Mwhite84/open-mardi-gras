#!/usr/bin/env bash
#
# ensure-terminal-beads.sh — converge an epic onto exactly one review bead and
# one report-writer bead, then reconcile the terminal edges.
#
# This is the decomposer's terminal-bead step: find each terminal bead by its
# canonical title before creating it (recovering an interruption between
# `bd create` and `bd set-state`), create a missing one from its canonical body,
# ensure both carry agent=omg-reviewer state, then wire the review to depend on
# every non-terminal child and the report-writer to depend on the review. It is
# idempotent — re-adding an existing dependency is a harmless no-op — and it
# never rewrites the body of an existing bead.
#
# Failure is loud: more than one child matching a canonical title is ambiguous,
# so the script stops and names the duplicate ids rather than guessing or
# creating another.
#
# Success -> two lines on stdout:
#   review: <review-bead-id>
#   report: <report-bead-id>
#
# Usage: ensure-terminal-beads.sh <epic-id>

set -euo pipefail

die() { printf 'ensure-terminal-beads: %s\n' "$1" >&2; exit 1; }

EPIC="${1:-}"
[ -n "$EPIC" ] || die "usage: ensure-terminal-beads.sh <epic-id>"

command -v bd >/dev/null 2>&1 || die "bd not found"
command -v jq >/dev/null 2>&1 || die "jq not found"

# The canonical terminal-bead bodies live in the omg-misc bead-content dir;
# find them relative to this script's own location so we never guess at layout.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REVIEW_BODY="$SCRIPT_DIR/../bead-content/review-bead.md"
REPORT_BODY="$SCRIPT_DIR/../bead-content/report-bead.md"
[ -f "$REVIEW_BODY" ] || die "canonical review bead body not found: $REVIEW_BODY"
[ -f "$REPORT_BODY" ] || die "canonical report bead body not found: $REPORT_BODY"

# Snapshot the children once, and validate BOTH duplicate-title sets before any
# mutation, so a duplicate on either title stops the run with nothing changed.
CHILDREN="$(bd children "$EPIC" --json)" \
  || die "bd children $EPIC failed — is $EPIC a valid epic id?"
REVIEW_IDS="$(jq -c '[.[] | select(.title == "Review") | .id]' <<<"$CHILDREN")"
REPORT_IDS="$(jq -c '[.[] | select(.title == "Write build report") | .id]' <<<"$CHILDREN")"

[ "$(jq 'length' <<<"$REVIEW_IDS")" -le 1 ] \
  || die "multiple Review beads on $EPIC: $(jq -r 'join(", ")' <<<"$REVIEW_IDS")"
[ "$(jq 'length' <<<"$REPORT_IDS")" -le 1 ] \
  || die "multiple report-writer beads on $EPIC: $(jq -r 'join(", ")' <<<"$REPORT_IDS")"

# Find-or-create each terminal bead. An existing bead keeps its body untouched;
# the canonical body is used only when creating a missing one.
REVIEW="$(jq -r '.[0] // empty' <<<"$REVIEW_IDS")"
if [ -z "$REVIEW" ]; then
  REVIEW="$(bd create "Review" -t task --parent "$EPIC" --no-inherit-labels \
    --body-file "$REVIEW_BODY" --silent)" \
    || die "failed to create Review bead on $EPIC"
  [ -n "$REVIEW" ] || die "bd create for the Review bead on $EPIC returned no id"
fi
bd set-state "$REVIEW" agent=omg-reviewer --reason "Review bead" \
  || die "failed to set agent=omg-reviewer on Review bead $REVIEW"

REPORT="$(jq -r '.[0] // empty' <<<"$REPORT_IDS")"
if [ -z "$REPORT" ]; then
  REPORT="$(bd create "Write build report" -t task --parent "$EPIC" --no-inherit-labels \
    --body-file "$REPORT_BODY" --silent)" \
    || die "failed to create report-writer bead on $EPIC"
  [ -n "$REPORT" ] || die "bd create for the report-writer bead on $EPIC returned no id"
fi
bd set-state "$REPORT" agent=omg-reviewer --reason "Report-writer bead" \
  || die "failed to set agent=omg-reviewer on report-writer bead $REPORT"

# Repair a reversed terminal edge left by a partial or older run, then converge
# the required graph. Re-adding an existing dependency is a harmless no-op.
bd dep remove "$REVIEW" "$REPORT" >/dev/null 2>&1 || true
bd children "$EPIC" --json \
  | jq -c --arg r "$REVIEW" --arg p "$REPORT" \
      '.[] | select(.id != $r and .id != $p) | {from:$r, to:.id}' \
  | bd dep add --file - \
  || die "failed to wire Review bead $REVIEW onto the work children of $EPIC"
bd dep add "$REPORT" "$REVIEW" \
  || die "failed to make report-writer bead $REPORT depend on Review bead $REVIEW"

printf 'review: %s\n' "$REVIEW"
printf 'report: %s\n' "$REPORT"
