# Reference: onboarding a satellite repo

A satellite is a code repo. It builds, decomposes, and tracks work in its own local
beads database; it writes its documents into the **central** docs tree and ships to
the one shared bank. It names no path into the docs tree — only which central repo
it belongs to and its own folder name.

## 1. Discover

- Read this repo's `.workflow.yaml` (may be absent or partial).
- Read `.beads/metadata.json` / `config.yaml` (beads may already be set up).
- Read the project `opencode.json` — it may be at the worktree root
  (`opencode.json`) **or** at `.opencode/opencode.json`; check both — for existing
  `references` and `permission.external_directory`.
- Establish **where the central repo is.** If `.workflow.yaml` already has
  `central_repo`, use it. Otherwise ask the user for the path to the centralized
  docs repo (relative to this repo, absolute, or `~/`). It must contain a
  `.workflow.yaml` with `mode: centralized` and a `docs_base` — confirm by reading
  it. If it does not resolve, stop: a satellite cannot be wired without its center.

## 2. Derive from the center

Read the central repo's `.workflow.yaml`. From it you get, for free:

- the **shared bank connection** (`hindsight.url`, `hindsight.bank`) — the satellite
  inherits these; it must **not** restate them.
- the central **`docs_base`**, whose parent is the **shared docs root** every
  participant scans.

Ask the user only for this repo's **`name`** — its sibling folder under the shared
root (e.g. `monolith`). If discovery already has it, confirm rather than re-ask.

## 3. Write (or emit) `.workflow.yaml`

The satellite's `.workflow.yaml` is small by design — it carries no docs paths and
no `hindsight` block:

```yaml
mode: satellite
central_repo: ../platform-docs   # path to the centralized repo (resolved earlier)
name: monolith                   # this satellite's sibling folder under the shared root
build:
  mode: one_agent                # one_agent | one_agent_fresh_contexts | multi_agents
```

If a `hindsight` block exists in a satellite's file, **remove it** — the resolver
rejects it, and it would imply a second bank. Attempt the write; if refused, emit
the content and the destination path.

## 4. Write (or emit) `opencode.json` wiring

This is the permission plumbing that lets the satellite read and **write** the
central tree. It is the most-forgotten step and the most likely first-run break.
Merge into the **existing** `opencode.json` — at the worktree root *or*
`.opencode/opencode.json`, whichever the repo uses — and do not drop keys already
there. If neither exists, create `.opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "references": {
    "platform-docs": {
      "path": "../platform-docs",
      "description": "Centralized platform docs — PRDs, specs, ADRs, journey maps to reference by id"
    }
  },
  "permission": {
    "external_directory": {
      "../platform-docs/**": "allow"
    }
  }
}
```

- The `references` path and the `external_directory` path must both name the same
  central repo as `central_repo` in `.workflow.yaml` (the ADR's "same path in two
  systems"). Keep them in agreement.
- A `reference` auto-allows *reads*; the `external_directory: allow` is what permits
  **writing** the build report and other docs back into the central tree, and bash
  (the id-minter) reaching it. Without it, reads work and writes silently prompt or
  fail.
- If the user keeps the central repo somewhere absolute or under `~/`, use that form
  (`~/code/platform-docs/**`) consistently in both keys.

## 5. Beads

A satellite tracks work locally. If `.beads/` is absent or empty:

- Fresh clone/worktree → `bd bootstrap --yes`.
- Connecting to the shared Dolt server (server mode) →
  `bd init --server --server-host <host> --server-user <user> --remote ""` with the
  host/user the user confirms (the same server the rest of the platform uses).

Confirm the mode: `jq -r '.dolt_mode' .beads/metadata.json`. The satellite's workers
respect this (`server` → no `bd dolt commit/push/pull`).

## 6. Verify (run every check; report pass/fail with the command)

```bash
RES=".opencode/skills/doc-templates/scripts/resolve-workflow.sh"
NID=".opencode/skills/doc-templates/scripts/next-id.sh"

# a) resolver yields a complete effective config (each must succeed, non-empty)
for k in mode central_repo docs_root docs_base hindsight.url hindsight.bank hindsight.guidance; do
  printf '%-20s ' "$k"; bash "$RES" "$k" || echo "FAILED"
done

# b) minter resolves and reaches the central tree (read/bash across the boundary)
bash "$NID" spec.onboard-probe.scratch    # expect spec.onboard-probe.scratch.0001 (no file created)

# c) test WRITE into the docs subtree — proves the external_directory write grant
BASE="$(bash "$RES" docs_base)"
mkdir -p "$BASE" && touch "$BASE/.onboard-write-probe" && rm -f "$BASE/.onboard-write-probe" \
  && echo "write-probe: OK" || echo "write-probe: FAILED (external_directory write not granted)"

# d) hindsight.md resolves to an existing file
G="$(bash "$RES" hindsight.guidance)"; [ -f "$G" ] && echo "hindsight.md: $G" || echo "hindsight.md MISSING: $G"

# e) bank reachable
hindsight bank list >/dev/null 2>&1 && echo "bank: reachable" || echo "bank: UNREACHABLE (check url/token)"

# f) beads answers
bd ready >/dev/null 2>&1 && echo "bd ready: OK" || echo "bd ready: FAILED"
```

The **write-probe (c)** is the decisive one — if it fails, the `external_directory`
permission in step 4 is missing or names the wrong path. Fix that before declaring
the satellite onboarded.

## 7. Boundary

Never write the central repo's config, beads, or `hindsight.md`. You read its
`.workflow.yaml` and you write *documents* into its tree through the normal
authoring flow later — but onboarding touches only this satellite's config.
