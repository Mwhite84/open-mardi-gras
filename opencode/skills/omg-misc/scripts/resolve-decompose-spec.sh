#!/usr/bin/env bash
# Resolve an /omg-decompose spec with local precedence and satellite fallback.

set -euo pipefail

die() { printf 'resolve-decompose-spec: %s\n' "$1" >&2; exit 1; }

input="${1:-}"
resolver="${2:-}"
spec="${input#@}"

[ -n "$spec" ] || die "usage: resolve-decompose-spec.sh <spec-file> <resolve-workflow.sh>"
[ -x "$resolver" ] || die "resolve-workflow.sh is not executable: $resolver"

canonical_file() {
  local path="$1" dir base
  dir="$(cd "$(dirname "$path")" && pwd -P)"
  base="$(basename "$path")"
  printf '%s/%s\n' "$dir" "$base"
}

if [ -f "$spec" ]; then
  canonical_file "$spec"
  exit 0
fi

attempted="$spec"
mode_error=""
if ! mode="$("$resolver" mode 2>&1)"; then
  mode_error="$mode"
  mode=""
fi

if [ "$mode" = "satellite" ]; then
  case "$spec" in
    /*) ;;
    *)
      if ! central_repo="$("$resolver" central_repo 2>&1)"; then
        die "spec file not found; attempted: $attempted; central repo resolution failed: $central_repo"
      fi
      central_spec="$central_repo/$spec"
      attempted="$attempted, $central_spec"
      if [ -f "$central_spec" ]; then
        canonical_file "$central_spec"
        exit 0
      fi
      ;;
  esac
fi

if [ -n "$mode_error" ]; then
  die "spec file not found; attempted: $attempted; workflow resolution failed: $mode_error"
fi
die "spec file not found; attempted: $attempted"
