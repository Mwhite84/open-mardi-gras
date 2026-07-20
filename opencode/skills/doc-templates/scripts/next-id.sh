#!/usr/bin/env bash
#
# next-id.sh — mint a collision-free document id.
#
# Usage:   next-id.sh <type.domain.topic>
# Example: next-id.sh adr.subscriptions.metering-period
# Output:  adr.subscriptions.metering-period.0002   (the next free NNNN)
#
# Given the dotted prefix (everything before the trailing counter), this scans
# every Markdown doc's frontmatter `id` under the docs tree, finds the highest
# existing NNNN for that exact prefix, and returns prefix.<max+1>, zero-padded to
# four digits. A prefix with no existing docs returns .0001.
#
# The docs tree to scan is the resolver-derived docs_root (resolve-workflow.sh),
# which is the parent of the docs base. In a satellite repo this resolves to the
# shared central docs tree, so ids stay collision-free across the whole platform;
# in a solo/centralized repo it is the local tree. The script does NOT guess the
# tree by walking up from $PWD — that would mint a locally-unique id that collides
# platform-wide.
#
# It scans working-tree files (committed AND uncommitted), so two docs minted in
# the same session cannot collide. It fails loudly rather than returning a false
# ".0001" if it cannot resolve the root or its tools.

set -euo pipefail

die() { printf 'next-id: %s\n' "$1" >&2; exit 1; }

prefix="${1:-}"
[ -n "$prefix" ] || die "usage: next-id.sh <type.domain.topic>"

# A prefix is dotted, lowercase-ish segments with no trailing counter. Reject a
# value that already carries a .NNNN suffix — the caller passes the prefix only.
case "$prefix" in
  *.[0-9][0-9][0-9][0-9]) die "pass the prefix without the NNNN counter (got '$prefix')" ;;
  *.) die "prefix must not end with a dot (got '$prefix')" ;;
esac

command -v rg >/dev/null 2>&1 || die "ripgrep (rg) not found"
command -v yq >/dev/null 2>&1 || die "yq not found"

# The docs tree to scan is the resolver-derived, absolute docs_root. The resolver
# owns all the mode/derivation logic (central vs. satellite, root = parent of
# base) and fails loud itself if the config is wrong; we surface its error.
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
tree="$(bash "$HERE/resolve-workflow.sh" docs_root)" \
  || die "could not resolve docs_root (see resolve-workflow error above)"
[ -d "$tree" ] || die "resolved docs_root '$tree' is not a directory"

# Highest existing counter for this exact prefix (0 if none). index()==1 anchors
# the prefix as a literal (dots are literal, not regex wildcards); the remainder
# must be exactly four digits to count as a sibling.
max=$(
  while IFS= read -r f; do
    yq --front-matter=extract '.id // ""' "$f" 2>/dev/null || true
  done < <(rg --files -g '*.md' "$tree") \
  | awk -v p="$prefix." '
      index($0, p) == 1 {
        suf = substr($0, length(p) + 1)
        if (suf ~ /^[0-9]{4}$/ && suf+0 > max) max = suf+0
      }
      END { print max+0 }'
)

printf '%s.%04d\n' "$prefix" "$((max + 1))"
