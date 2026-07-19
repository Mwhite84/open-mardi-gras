#!/usr/bin/env bash
#
# decompose-mint.sh — deterministically mint (or reuse) the epic for a spec, and
# mint the ADR beads produced_for it, emitting the epic id for /omg-decompose.
#
# This is the deterministic pre-work of /omg-decompose: everything that can be
# derived from the spec file and the docs tree without judgment happens here,
# before the decomposer agent gets its turn. It is idempotent — run it twice on
# the same spec and the second run reuses the existing epic and skips ADR beads
# that already exist, so /omg-decompose can be re-run to refine a decomposition.
#
# Contract — its whole stdout is spliced into /omg-decompose via !`…`, so stdout
# IS the message the decomposer agent reads. It carries the outcome, success or
# failure, because stderr is not spliced and the agent would never see it.
#   Success -> two lines:
#                **Epic id:** <epic-id>
#                This is a refinement pass.   (epic already existed)
#                  — or —
#                This is freshly minted.      (epic created this run)
#   Failure -> a STOP directive addressed to the agent, and a non-zero exit.
#
# Usage: decompose-mint.sh <spec-file>

set -euo pipefail

# On failure, speak to the agent on stdout (the spliced stream) — tell it to
# halt and surface the problem, rather than plan against a missing epic.
die() {
  printf 'STOP — do not proceed with decomposition. Minting the epic failed: %s\n' "$1"
  printf 'Report this failure to the user and take no further action.\n'
  exit 1
}

# resolve-workflow.sh lives in the doc-templates skill; find it relative to this
# script's own location so we never guess at repo layout.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESOLVE="$SCRIPT_DIR/../../doc-templates/scripts/resolve-workflow.sh"
[ -x "$RESOLVE" ] || RESOLVE="$(command -v resolve-workflow.sh || true)"
[ -x "$RESOLVE" ] || die "cannot locate resolve-workflow.sh (looked beside this script and on PATH)"

SPEC_RESOLVER="$SCRIPT_DIR/resolve-decompose-spec.sh"
[ -x "$SPEC_RESOLVER" ] || die "cannot locate executable resolve-decompose-spec.sh beside this script"
resolve_error=""
if ! SPEC="$("$SPEC_RESOLVER" "${1:-}" "$RESOLVE" 2>&1)"; then
  resolve_error="$SPEC"
  die "$resolve_error"
fi

command -v yq >/dev/null 2>&1 || die "yq not found"
command -v jq >/dev/null 2>&1 || die "jq not found"
command -v bd >/dev/null 2>&1 || die "bd not found"

# Strip a file's leading YAML frontmatter block, emitting only the body.
strip_frontmatter() {
  awk 'NR==1 && $0=="---"{fm=1; next} fm && $0=="---"{fm=0; body=1; next} body' "$1"
}

spec_id="$(yq --front-matter=extract -r '.id // ""' "$SPEC")"
[ -n "$spec_id" ] && [ "$spec_id" != "null" ] || die "spec has no 'id' in frontmatter: $SPEC"
title="$(yq --front-matter=extract -r '.title // ""' "$SPEC")"
[ -n "$title" ] || title="$spec_id"

# --- Reuse an existing epic for this exact spec id ---------------------------
# `bd list --spec` is a PREFIX filter, so a sibling spec id that starts with the
# same string would match; select the exact spec_id to reuse the right epic only.
epic="$(bd list --spec "$spec_id" --type epic --json 2>/dev/null \
  | jq -r --arg sid "$spec_id" '.[] | select(.spec_id == $sid) | .id' 2>/dev/null | head -n1 || true)"

if [ -n "$epic" ]; then
  status="This is a refinement pass."
else
  status="This is freshly minted."
  meta="$(yq --front-matter=extract -o=json -I=0 '.' "$SPEC")"
  epic="$(strip_frontmatter "$SPEC" \
    | bd create "$title" -t epic -p 1 --spec-id "$spec_id" --metadata "$meta" --body-file - --silent)"
  [ -n "$epic" ] || die "failed to mint epic for $spec_id"
  # The epic ships at close, so it carries hindsight:pending from mint.
  bd set-state "$epic" hindsight=pending --reason "Epic minted from $spec_id; ships at close" >/dev/null 2>&1 \
    || die "failed to stamp hindsight=pending on $epic"
fi

# --- Mint an ADR bead per ADR produced_for this spec, once -------------------
DOCS_ROOT="$("$RESOLVE" docs_root)" || die "resolve-workflow docs_root failed"

# spec_ids of every existing bead — used to skip ADRs already minted (idempotency).
existing_spec_ids="$(bd list --json 2>/dev/null | jq -r '.[].spec_id // empty' 2>/dev/null || true)"

while IFS= read -r adr_file; do
  [ -n "$adr_file" ] || continue
  aid="$(yq --front-matter=extract -r '.id // ""' "$adr_file" 2>/dev/null || true)"
  case "$aid" in adr.*) ;; *) continue ;; esac
  [ "$(yq --front-matter=extract -r '.produced_for // ""' "$adr_file" 2>/dev/null || true)" = "$spec_id" ] || continue
  printf '%s\n' "$existing_spec_ids" | grep -Fxq "$aid" && continue   # already minted

  # Title is optional frontmatter (same contract as the spec title above); fall
  # back to the body's first '#' heading — the ADR template guarantees one —
  # and finally to the ADR id.
  atitle="$(yq --front-matter=extract -r '.title // ""' "$adr_file")"
  [ "$atitle" != "null" ] || atitle=""
  [ -n "$atitle" ] || atitle="$(strip_frontmatter "$adr_file" \
    | awk '/^#+[[:space:]]/ { sub(/^#+[[:space:]]*/, ""); sub(/[[:space:]]+$/, ""); print; exit }')"
  [ -n "$atitle" ] || atitle="$aid"
  atype="$(yq --front-matter=extract -r '.type' "$adr_file")"        # 'adr' → bd aliases to 'decision'
  ameta="$(yq --front-matter=extract -o=json -I=0 '.' "$adr_file")"
  abead="$(strip_frontmatter "$adr_file" \
    | bd create "ADR: $atitle" -t "$atype" --spec-id "$aid" --metadata "$ameta" \
        --deps "relates-to:$epic" --body-file - --silent)" \
    || die "failed to mint ADR bead for $aid"

  # A hindsight block on the ADR means it is memory to ship; its absence means it isn't.
  if yq --front-matter=extract -e '.hindsight' "$adr_file" >/dev/null 2>&1; then
    bd set-state "$abead" hindsight=pending --reason "Minted from $aid; awaiting ingest" >/dev/null 2>&1 \
      || die "failed to stamp hindsight=pending on $abead"
  fi
  # A recorded ADR is a decided decision, not open work — close it so it stays out of bd ready.
  bd close "$abead" --reason "Decision recorded; ADR finalized." >/dev/null 2>&1 \
    || die "failed to close ADR bead $abead"
done < <(grep -rlE '^id:[[:space:]]*adr\.' "$DOCS_ROOT" 2>/dev/null || true)

printf '**Epic id:** %s\n%s\n' "$epic" "$status"
