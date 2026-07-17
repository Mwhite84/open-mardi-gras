# Reference: onboarding the centralized docs repo

The centralized repo is the docs hub. It holds the shared docs tree (its own
`docs_base` plus every satellite's sibling folder under the shared root), authors
platform-wide documents, defines the one shared `hindsight` connection, and has
**no beads** — it builds nothing.

## 1. Discover

- Read this repo's `.workflow.yaml` (may be absent or partial).
- Note the existing docs layout (where `*.md` with `id:` frontmatter already live) —
  it tells you the intended `docs_base` and whether a migration is implied.
- There should be **no `.beads/`**; if one exists, flag it — a centralized repo
  builds nothing and should not track work.

## 2. Decide the `docs_base`

`docs_base` is a path within this repo; the shared docs **root** is its parent
(derived, never specified). Ask the user (or confirm from discovery) what the
platform docs folder is called — commonly `platform`. With `docs_base: platform`,
the root is the repo root, so the root contains `platform/` (this hub's docs) and
each satellite's sibling folder (`monolith/`, `terraform/`, …).

If existing docs sit somewhere that does not match the chosen `docs_base`, note the
migration to the user (move them under `<docs_base>/<type>/`), but do not move files
unless asked — placement of *existing* content is a content decision.

## 3. Write (or emit) `.workflow.yaml`

```yaml
mode: centralized
docs_base: platform
build:
  mode: one_agent          # used only if this repo ever builds; harmless otherwise
hindsight:
  url: https://hindsight-api.example.com   # the one shared bank's API
  bank: stacked-chips                      # the one shared bank id
```

Ask for `hindsight.url` and `hindsight.bank` if discovery did not supply them. These
are the platform singletons every satellite will inherit — get them right here, once.
Attempt the write; if refused, emit the content and the destination path.

## 4. The `hindsight.md` (tagging intent)

The centralized repo owns the single `hindsight.md` at its root — the prose tagging
intent every authoring agent (here and in every satellite) reads. If it is absent,
do **not** invent tags: tell the user to run **`/omg-hindsight-setup`**, which
routes the hindsight architect to author it against the live bank. Treat authoring
it as the immediate follow-up to onboarding — the docs lane is not fully live until
it exists, because agents need it to fill the `hindsight` block.

## 5. No beads

Do not run `bd init`/`bootstrap` here. If asked to, explain that the hub builds
nothing — work tracking lives in the satellites.

## 6. Verify (run every check; report pass/fail)

```bash
OMG_CONFIG_DIR="${OPENCODE_CONFIG_DIR:-.opencode}"
[ -f "$OMG_CONFIG_DIR/skills/doc-templates/scripts/resolve-workflow.sh" ] || OMG_CONFIG_DIR=".opencode"
RES="$OMG_CONFIG_DIR/skills/doc-templates/scripts/resolve-workflow.sh"
NID="$OMG_CONFIG_DIR/skills/doc-templates/scripts/next-id.sh"

# a) resolver yields a complete effective config
for k in mode docs_root docs_base hindsight.url hindsight.bank hindsight.guidance; do
  printf '%-20s ' "$k"; bash "$RES" "$k" || echo "FAILED"
done

# b) minter resolves and scans the tree
bash "$NID" spec.onboard-probe.scratch    # expect ...0001 (no file created)

# c) hindsight.md present
G="$(bash "$RES" hindsight.guidance)"; [ -f "$G" ] && echo "hindsight.md: $G" \
  || echo "hindsight.md MISSING — run /omg-hindsight-setup to author it: $G"

# d) bank reachable
hindsight bank list >/dev/null 2>&1 && echo "bank: reachable" || echo "bank: UNREACHABLE"
```

## 7. After onboarding

The hub is ready to author platform-wide docs and to be the center satellites point
at. The natural next steps are: run `/omg-hindsight-setup` (if `hindsight.md` is
missing), then write the first platform spec/ADR; and onboard the first satellite
(`/omg-onboard satellite` from that repo, pointing `central_repo` here).
