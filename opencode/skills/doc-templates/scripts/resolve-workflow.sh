#!/usr/bin/env bash
#
# resolve-workflow.sh — resolve a repo's EFFECTIVE workflow config.
#
# This is the single home of the multi-repo derivation rules from
# adr.platform.multi-repo-canon.0001: mode-keyed config, hindsight inheritance,
# the single-bank rule, and the "root is the parent of the base" derivation.
# Every consumer (next-id.sh, the foreman, the shipping references, the
# hindsight.md resolver) calls this instead of reading .workflow.yaml raw, so the
# rules live in exactly one place and cannot drift.
#
# Usage:   resolve-workflow.sh <key>
# Keys:
#   mode            -> solo | centralized | satellite
#   docs_root       -> ABSOLUTE path to the tree the id-minter scans (the shared
#                      root). Derived as the parent of the effective docs base.
#   docs_base       -> ABSOLUTE path to where THIS repo writes its docs (the
#                      per-type subfolder is appended by the caller from the id).
#   hindsight.url   -> the Hindsight API url (inherited from central for satellite)
#   hindsight.bank  -> the Hindsight bank id (inherited from central for satellite)
#   hindsight.guidance -> ABSOLUTE path to hindsight.md (central for satellite)
#   central_repo    -> ABSOLUTE path to the central repo (satellite only)
#   test            -> true | false — whether this repo plans verification.
#                      false ONLY when this repo's own file sets 'test: false';
#                      absent or any other value means true. LOCAL-ONLY: never
#                      inherited from central, because testability is a property
#                      of the code repo.
#
# All paths are emitted ABSOLUTE so callers never re-resolve relative-to-what.
# The script fails loud (non-zero, message on stderr) rather than emitting a
# wrong-but-plausible value — a silent bad path is the failure this design exists
# to prevent.

set -euo pipefail

die() { printf 'resolve-workflow: %s\n' "$1" >&2; exit 1; }

key="${1:-}"
[ -n "$key" ] || die "usage: resolve-workflow.sh <key>"

command -v yq >/dev/null 2>&1 || die "yq not found"

# --- locate this repo's .workflow.yaml (walk up from cwd) -------------------
find_workflow() {
  local d="$1"
  while [ "$d" != "/" ]; do
    if [ -f "$d/.workflow.yaml" ]; then printf '%s\n' "$d/.workflow.yaml"; return 0; fi
    d="$(dirname "$d")"
  done
  return 1
}

WORKFLOW="$(find_workflow "$PWD")" || die "could not find a '.workflow.yaml' from $PWD"
REPO_DIR="$(cd "$(dirname "$WORKFLOW")" && pwd)"

# Resolve a path that is relative to a given base directory, to absolute.
# Fails if the resulting directory does not exist (the caller asked for a real tree).
abspath_in() {
  local base="$1" p="$2" out
  case "$p" in
    /*) out="$p" ;;
    *)  out="$base/$p" ;;
  esac
  ( cd "$out" 2>/dev/null && pwd ) || die "path '$p' (from $base) does not resolve to a directory"
}

yq_get() { yq -r "$1 // \"\"" "$2" 2>/dev/null || true; }

MODE="$(yq_get '.mode' "$WORKFLOW")"
[ -n "$MODE" ] || die "mode is not set in $WORKFLOW (expected solo|centralized|satellite)"
case "$MODE" in solo|centralized|satellite) ;; *) die "unknown mode '$MODE' in $WORKFLOW" ;; esac

# --- satellite: resolve the central repo and enforce the no-local-hindsight rule
CENTRAL_DIR=""
CENTRAL_WORKFLOW=""
if [ "$MODE" = "satellite" ]; then
  # A satellite must NOT define its own hindsight block (single-bank rule).
  if yq -e '.hindsight' "$WORKFLOW" >/dev/null 2>&1; then
    die "satellite $WORKFLOW defines a 'hindsight' block — satellites inherit the central bank; remove it"
  fi
  central_raw="$(yq_get '.central_repo' "$WORKFLOW")"
  [ -n "$central_raw" ] || die "satellite $WORKFLOW must set 'central_repo'"
  CENTRAL_DIR="$(abspath_in "$REPO_DIR" "$central_raw")"
  CENTRAL_WORKFLOW="$CENTRAL_DIR/.workflow.yaml"
  [ -f "$CENTRAL_WORKFLOW" ] || die "central_repo '$central_raw' has no .workflow.yaml (looked in $CENTRAL_DIR)"
fi

# Which .workflow.yaml owns the docs-tree shape and the hindsight block.
# For a satellite that is the central one; otherwise it is this repo.
AUTHORITY_WORKFLOW="$WORKFLOW"
AUTHORITY_DIR="$REPO_DIR"
if [ "$MODE" = "satellite" ]; then
  AUTHORITY_WORKFLOW="$CENTRAL_WORKFLOW"
  AUTHORITY_DIR="$CENTRAL_DIR"
fi

# The base directory that defines the tree's shape (the central/own docs_base).
authority_base_raw="$(yq_get '.docs_base' "$AUTHORITY_WORKFLOW")"
[ -n "$authority_base_raw" ] || die "docs_base is not set in $AUTHORITY_WORKFLOW"
AUTHORITY_BASE="$(abspath_in "$AUTHORITY_DIR" "$authority_base_raw")"
# Root is the parent of the authority base — derived, never specified.
DOCS_ROOT="$(cd "$AUTHORITY_BASE/.." && pwd)"

# This repo's effective write base.
if [ "$MODE" = "satellite" ]; then
  name="$(yq_get '.name' "$WORKFLOW")"
  [ -n "$name" ] || die "satellite $WORKFLOW must set 'name'"
  DOCS_BASE="$DOCS_ROOT/$name"   # sibling of the central base under the shared root
else
  DOCS_BASE="$AUTHORITY_BASE"
fi

emit_hindsight() {
  local field="$1" val
  val="$(yq_get ".hindsight.$field" "$AUTHORITY_WORKFLOW")"
  [ -n "$val" ] || die "hindsight.$field is not set in $AUTHORITY_WORKFLOW"
  printf '%s\n' "$val"
}

case "$key" in
  mode)            printf '%s\n' "$MODE" ;;
  docs_root)       printf '%s\n' "$DOCS_ROOT" ;;
  docs_base)       printf '%s\n' "$DOCS_BASE" ;;
  central_repo)
    [ "$MODE" = "satellite" ] || die "central_repo is only defined for satellite mode (this repo is $MODE)"
    printf '%s\n' "$CENTRAL_DIR" ;;
  test)
    # Read from $WORKFLOW, not $AUTHORITY_WORKFLOW: the opt-out is local-only,
    # so a central docs repo cannot switch verification off for its satellites.
    # Raw yq, not yq_get: its '// ""' default treats boolean false as falsy and
    # would swallow exactly the value this key exists to carry.
    if [ "$(yq -r '.test' "$WORKFLOW" 2>/dev/null || true)" = "false" ]; then
      printf 'false\n'
    else
      printf 'true\n'
    fi ;;
  hindsight.url)   emit_hindsight url ;;
  hindsight.bank)  emit_hindsight bank ;;
  hindsight.guidance)
    # hindsight.md lives at the authority repo root by default; an optional
    # 'hindsight.guidance' key overrides the location. Emit the resolved path
    # without requiring the file to exist — the caller decides how to handle an
    # absent file (per the ADR: fall back to ask-and-emit).
    override="$(yq_get '.hindsight.guidance' "$AUTHORITY_WORKFLOW")"
    if [ -n "$override" ]; then
      case "$override" in
        /*) printf '%s\n' "$override" ;;
        *)  printf '%s\n' "$AUTHORITY_DIR/$override" ;;
      esac
    else
      printf '%s\n' "$AUTHORITY_DIR/hindsight.md"
    fi ;;
  *) die "unknown key '$key'" ;;
esac
