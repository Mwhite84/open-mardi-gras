#!/usr/bin/env bash
#
# file-adjudication.sh — file a broken-promise adjudication bead for the product
# manager, fully wired, from the canonical adjudicate-<variant> body.
#
# The filer (a builder mid-build, or the reviewer at review time) provides the
# facts; this script does the graph work: it assembles the bead body from the
# canonical template with every id and fact interpolated — including writing the
# bead's own id back into its command blocks after creation — stamps
# agent=omg-product-manager, wires the blocked bead to wait on the ruling, and
# resets the blocked bead so it re-enters the ready queue once the ruling lands
# (the step whose omission wedges an epic). After this script succeeds, every
# `<...>` left in the bead body is a judgment slot for the product manager.
#
# The failure excerpt is read from stdin (multi-line safe).
#
# Success -> one line on stdout:  adjudication: <bead-id>
#
# Usage:
#   file-adjudication.sh build  <epic> <implementation-bead> <failing-test-selector> < excerpt
#   file-adjudication.sh review <epic> <review-bead>         <failing-test-selector> < excerpt

set -euo pipefail

die() { printf 'file-adjudication: %s\n' "$1" >&2; exit 1; }

VARIANT="${1:-}"; EPIC="${2:-}"; BLOCKED="${3:-}"; SELECTOR="${4:-}"
[ -n "$SELECTOR" ] || die "usage: file-adjudication.sh <build|review> <epic> <blocked-bead> <failing-test-selector> < failure-excerpt"
case "$VARIANT" in
  build|review) ;;
  *) die "variant must be 'build' or 'review', got '$VARIANT'" ;;
esac

command -v bd >/dev/null 2>&1 || die "bd not found"

# The canonical adjudication bodies live in the omg-misc bead-content dir;
# find them relative to this script's own location so we never guess at layout.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$SCRIPT_DIR/../bead-content/adjudicate-$VARIANT.md"
[ -f "$TEMPLATE" ] || die "canonical adjudication body not found: $TEMPLATE"

FAILURE_OUTPUT="$(cat)"
[ -n "$FAILURE_OUTPUT" ] || die "no failure excerpt on stdin — pipe in the failing run's output"

# Interpolate with bash parameter expansion (replacement text is literal, so
# selectors and excerpts containing sed/awk metacharacters cannot corrupt it).
BODY="$(cat "$TEMPLATE")"
BODY="${BODY//'{{EPIC}}'/$EPIC}"
BODY="${BODY//'{{BLOCKED_BEAD}}'/$BLOCKED}"
BODY="${BODY//'{{SELECTOR}}'/$SELECTOR}"
BODY="${BODY//'{{FAILURE_OUTPUT}}'/$FAILURE_OUTPUT}"

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
printf '%s\n' "$BODY" > "$TMP"

ADJ="$(bd create "Adjudicate broken promise: $SELECTOR" -t task -p 1 \
  --parent "$EPIC" --no-inherit-labels \
  --deps "discovered-from:$BLOCKED" \
  --body-file "$TMP" --silent)" \
  || die "failed to create the adjudication bead on $EPIC"
[ -n "$ADJ" ] || die "bd create for the adjudication bead returned no id"

# The body's command blocks reference the bead's own id, which only exists now:
# substitute it and write the body back.
BODY="${BODY//'{{THIS_BEAD}}'/$ADJ}"
printf '%s\n' "$BODY" > "$TMP"
bd update "$ADJ" --body-file "$TMP" \
  || die "failed to write $ADJ's own id into its body"

bd set-state "$ADJ" agent=omg-product-manager --reason "Adjudication bead" \
  || die "failed to set agent=omg-product-manager on $ADJ"

# Wire the blocked bead to wait on the ruling BEFORE resetting it to open, so
# it can never surface in bd ready un-blocked between the two steps.
bd dep add "$BLOCKED" "$ADJ" \
  || die "failed to wire $BLOCKED to wait on $ADJ"

if [ "$VARIANT" = "build" ]; then
  # The builder had claimed its bead (in_progress); without this reset it never
  # re-enters bd ready after the ruling lands, and the epic wedges.
  bd update "$BLOCKED" --status open --assignee "" \
    || die "failed to reset implementation bead $BLOCKED to the ready queue"
else
  # The review bead goes back to open so the ready queue re-dispatches it for a
  # fresh pass once the ruling (and any minted work) resolves.
  bd update "$BLOCKED" --status open \
    || die "failed to reopen review bead $BLOCKED"
fi

printf 'adjudication: %s\n' "$ADJ"
