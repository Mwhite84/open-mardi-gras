#!/usr/bin/env bash
#
# ensure-test-opt-out.sh — converge an epic onto the verification opt-out shape
# (this repo's .workflow.yaml sets test: false), deterministically and
# idempotently.
#
# The decomposer runs this instead of dispatching the confidence planner when
# the mint report carries the "Verification: opted out" line. It converges
# three facts:
#   1. The blanket no-test decision is recorded on the epic, exactly once.
#   2. No test-planning child remains: every child labeled agent:omg-tester or
#      agent:omg-test-planner — whatever its status — is deleted. bd delete
#      removes the dependency edges in both directions, so a bead wired to a
#      deleted test is unblocked, never orphan-blocked.
#   3. No stale done-target remains: the test_beads metadata stamp is removed
#      from every surviving child, so no builder resolves a deleted test id.
#
# Idempotent — a second run finds nothing to change and says so.
#
# Success -> three summary lines on stdout (comment / deleted / unstamped).
# Failure -> message on stderr, non-zero exit.
#
# Usage: ensure-test-opt-out.sh <epic-id>

set -euo pipefail

die() { printf 'ensure-test-opt-out: %s\n' "$1" >&2; exit 1; }

EPIC="${1:-}"
[ -n "$EPIC" ] || die "usage: ensure-test-opt-out.sh <epic-id>"

command -v bd >/dev/null 2>&1 || die "bd not found"
command -v jq >/dev/null 2>&1 || die "jq not found"

# 1. The blanket no-test decision, recorded exactly once.
# Match against the JSON text field — the human rendering of bd comments wraps
# or truncates long text, so a substring check against it misses real hits.
COMMENT="No test beads for any obligation: this repo opts out of verification (test: false in .workflow.yaml)."
EXISTING="$(bd comments "$EPIC" --json 2>/dev/null | jq -r '.[].text' 2>/dev/null || true)"
case "$EXISTING" in
  *"opts out of verification (test: false"*)
    printf 'comment: already present\n' ;;
  *)
    bd comments add "$EPIC" "$COMMENT" >/dev/null || die "failed to comment on $EPIC"
    printf 'comment: recorded\n' ;;
esac

# 2. Delete every test-planning child, whatever its status — together with each
# one's own children (bd set-state mints closed "State change" audit beads under
# a bead; deleting the parent alone would orphan them as [deleted:ID] clutter).
# NOT --cascade: cascade follows dependents, which would take the implementation
# beads wired to a test. --force deletes the named set and un-wires the rest.
CHILDREN="$(bd children "$EPIC" --json)" \
  || die "bd children $EPIC failed — is $EPIC a valid epic id?"
TEST_IDS="$(jq -r '.[]
  | select(any(.labels[]?; . == "agent:omg-tester" or . == "agent:omg-test-planner"))
  | .id' <<<"$CHILDREN")"
if [ -n "$TEST_IDS" ]; then
  DELETE_IDS="$TEST_IDS"
  while IFS= read -r id; do
    subs="$(bd children "$id" --json 2>/dev/null | jq -r '.[].id' || true)"
    [ -n "$subs" ] && DELETE_IDS="$DELETE_IDS
$subs"
  done <<<"$TEST_IDS"
  # shellcheck disable=SC2086  # word-splitting the ids is intended
  bd delete $DELETE_IDS --force >/dev/null \
    || die "failed to delete test beads: $(tr '\n' ' ' <<<"$DELETE_IDS")"
  printf 'deleted: %s\n' "$(tr '\n' ' ' <<<"$DELETE_IDS")"
else
  printf 'deleted: none\n'
fi

# 3. Strip the test_beads stamp from every surviving child.
STAMPED="$(bd children "$EPIC" --json | jq -r '.[]
  | select(.metadata.test_beads? != null)
  | .id')" \
  || die "re-reading children of $EPIC failed"
if [ -n "$STAMPED" ]; then
  while IFS= read -r id; do
    bd update "$id" --unset-metadata test_beads >/dev/null \
      || die "failed to unset test_beads on $id"
  done <<<"$STAMPED"
  printf 'unstamped: %s\n' "$(tr '\n' ' ' <<<"$STAMPED")"
else
  printf 'unstamped: none\n'
fi
