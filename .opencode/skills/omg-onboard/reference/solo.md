# Reference: onboarding a solo repo

A solo repo is the original single-repo arrangement: code, docs, beads, and config
all in one tree, shipping to its own bank. It is its own center — no satellites, no
`central_repo`, no inheritance. It is the simplest mode and the right choice when
there is only one repo.

## 1. Discover

- Read this repo's `.workflow.yaml` (may be absent or partial).
- Read `.beads/metadata.json` / `config.yaml` — a solo repo tracks work, so beads
  is expected.
- Note where existing docs with `id:` frontmatter live — it suggests the `docs_base`.

## 2. Decide the `docs_base`

A single path within the repo where docs live; the docs **root** (what the minter
scans) is its parent. For a solo repo `docs_base: docs` (root = repo root) or
`docs_base: docs/canon` are both fine — ask the user, or confirm from the existing
layout. Documents are placed at `<docs_base>/<type>/<id>.md` by convention.

## 3. Write (or emit) `.workflow.yaml`

```yaml
mode: solo
docs_base: docs
build:
  mode: one_agent
hindsight:
  url: https://hindsight-api.example.com
  bank: my-bank
```

Ask for `hindsight.url`/`bank` if discovery did not supply them. Attempt the write;
if refused, emit the content and the destination path.

## 4. The `hindsight.md`

A solo repo owns its `hindsight.md` at the root. If absent, tell the user to run
**`/omg-hindsight-setup`** (it routes the hindsight architect to author it against
the live bank) rather than inventing tags. It is the immediate follow-up — agents
need it to fill the `hindsight` block.

## 5. Beads

A solo repo tracks work. If `.beads/` is absent or empty:

- Fresh clone/worktree → `bd bootstrap --yes`.
- Server-mode shared remote →
  `bd init --server --server-host <host> --server-user <user> --remote ""`.

Confirm the mode: `jq -r '.dolt_mode' .beads/metadata.json`.

## 6. Verify (run every check; report pass/fail)

```bash
RES=".opencode/skills/doc-templates/scripts/resolve-workflow.sh"
NID=".opencode/skills/doc-templates/scripts/next-id.sh"

for k in mode docs_root docs_base hindsight.url hindsight.bank hindsight.guidance; do
  printf '%-20s ' "$k"; bash "$RES" "$k" || echo "FAILED"
done

bash "$NID" spec.onboard-probe.scratch          # expect ...0001 (no file created)
G="$(bash "$RES" hindsight.guidance)"; [ -f "$G" ] && echo "hindsight.md: $G" \
  || echo "hindsight.md MISSING — run /omg-hindsight-setup to author it: $G"
hindsight bank list >/dev/null 2>&1 && echo "bank: reachable" || echo "bank: UNREACHABLE"
bd ready >/dev/null 2>&1 && echo "bd ready: OK" || echo "bd ready: FAILED"
```

There is no external-directory write-probe — a solo repo writes to its own tree, so
no boundary is crossed.

## 7. After onboarding

The repo is ready: run `/omg-hindsight-setup` if `hindsight.md` is missing, then
start a spec with `/omg-spec`. If a second repo ever arrives, the migration path is to promote this
repo (or a new docs repo) to `centralized` and re-onboard the code repos as
`satellite` — but that is a later decision, not a thing to pre-build.
