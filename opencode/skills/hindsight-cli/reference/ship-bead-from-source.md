# Reference: Shipping a bead to Hindsight

Some documents are **bead-sourced**: the frozen authority is the bead, not the
tree file (per `adr.platform.memory-lifecycle.0001` — a doc is bead-sourced iff a
bead carries its `id`; on conflict the bead wins). Specs and ADRs work this way —
they become beads at decomposition, and the bead is what ships to memory.

Shipping a bead is the **same retain call** as shipping a tree doc
(`reference/ship-doc-from-tree.md`) — same HTTP API, same `jq --rawfile`
assembly, same one-call requirement, same "no fallback, surface failures" rule.
**Read that reference first.** Only the *source* of the five retain arguments
differs: they come from `bd show <id> --json`, not from file frontmatter.

| Retain argument | Source on the bead |
|---|---|
| `bank_id`     | the resolver (`resolve-workflow.sh hindsight.bank`) — inherits the central bank in a satellite |
| `document_id` | the bead's `spec_id` (the document's stable `id`) |
| `strategy`    | `.metadata.hindsight.strategy` |
| `tags`        | `.metadata.hindsight.tags` (+ any `.metadata.tags`) |
| `content`     | the bead's `description` (the stripped document body) |

The frontmatter the document carried was captured verbatim into the bead's
`--metadata` at mint time (see the `omg-commands` skill), so the `hindsight`
block lives at `.metadata.hindsight`. The body became the bead `description`.

## The ship queue

The shipper's pending queue is beads in the `hindsight=pending` state:

```bash
bd -C "$MONOREPO" list --label hindsight:pending --json | jq -r '.[].id'
```

Ship each, then advance its state to `shipped` (the freeze point). The retract
queue (`hindsight:tombstoned`) is a separate flow — supersession, covered in
`omg-commands`.

> `bd` runs against the repo holding the `.beads` database — the satellite (or
> solo) repo, **not** the centralized docs repo, which has no beads. Use
> `bd -C <repo>` or run from that repo. Never modify or delete a bead you did not
> create.

## The steps

For one bead id from the queue:

```bash
TMP="$(mktemp -d)"
BEAD="sc-7acd"
# Resolve the connection through the resolver, never raw yq (satellite inherits
# the central bank/url).
OMG_CONFIG_DIR="${OPENCODE_CONFIG_DIR:-.opencode}"
[ -f "$OMG_CONFIG_DIR/skills/doc-templates/scripts/resolve-workflow.sh" ] || OMG_CONFIG_DIR=".opencode"
RES="$OMG_CONFIG_DIR/skills/doc-templates/scripts/resolve-workflow.sh"
URL="$(bash "$RES" hindsight.url)"
BANK="$(bash "$RES" hindsight.bank)"
```

### 1. Pull the bead as JSON

`bd show` returns a one-element array — unwrap with `.[0]`:

```bash
bd -C "$MONOREPO" show "$BEAD" --json | jq '.[0]' > "$TMP/bead.json"
```

### 2. Extract the retain fields

```bash
# document_id: spec_id is authoritative; .metadata.id is the same value, a fallback
ID="$(jq -r '.spec_id // .metadata.id' "$TMP/bead.json")"
STRATEGY="$(jq -r '.metadata.hindsight.strategy // ""' "$TMP/bead.json")"
TAGS_JSON="$(jq -c '((.metadata.hindsight.tags // []) + (.metadata.tags // [])) | unique' "$TMP/bead.json")"
jq -r '.description' "$TMP/bead.json" > "$TMP/body.md"
```

Guardrails before shipping:

```bash
# must have a hindsight block — no block means not memory
jq -e '.metadata.hindsight' "$TMP/bead.json" >/dev/null \
  || { echo "$BEAD has no hindsight metadata — not shippable"; exit 1; }

# spec_id and metadata.id must agree if both are present (a mismatch is a mint bug)
jq -e '(.spec_id == null) or (.metadata.id == null) or (.spec_id == .metadata.id)' \
  "$TMP/bead.json" >/dev/null || { echo "$BEAD: spec_id != metadata.id — stop"; exit 1; }

# an id is required as the upsert key
[ -n "$ID" ] && [ "$ID" != "null" ] || { echo "$BEAD: no document id — stop"; exit 1; }
```

### 3. Assemble and POST

Identical to the tree-doc reference — `jq --rawfile` embeds the body, `strategy`
is included only when set:

```bash
jq -n \
  --rawfile content "$TMP/body.md" \
  --arg id "$ID" \
  --arg strategy "$STRATEGY" \
  --argjson tags "$TAGS_JSON" \
  '{ items: [ ( { content: $content, document_id: $id, tags: $tags }
       + ( if $strategy == "" then {} else { strategy: $strategy } end ) ) ],
     async: false }' > "$TMP/retain.json"

curl -sS -X POST "$URL/v1/default/banks/$BANK/memories" \
  -H "Content-Type: application/json" \
  --data-binary @"$TMP/retain.json" \
  -w '\nHTTP %{http_code}\n'
```

As in the tree-doc reference: if the POST is non-200, or a verify shows untagged
facts, **surface the error** with the bead id, document id, and response body. Do
not fall back to the CLI retain commands — there is no safe fallback.

### 4. Advance the bead's state

A successful ship is the **freeze point**. Record it by moving the state label
from `pending` to `shipped`:

```bash
bd -C "$MONOREPO" set-state "$BEAD" hindsight=shipped \
  --reason "Shipped $ID to Hindsight bank $BANK"
```

`set-state` is atomic and event-backed (it writes an audit event and swaps the
label). Only do this **after** a confirmed 200 — the label is the record that the
bead is now immutable memory. If the ship failed, leave the bead `pending` so the
next run retries it.

### 5. Verify

```bash
hindsight -o json document list "$BANK" > "$TMP/docs.json" 2>/dev/null
jq --arg id "$ID" '(.items // .)[] | select(.id==$id) | {id, tags}' "$TMP/docs.json"
```

The document should be present with its tags; a tag-filtered recall (see the
tree-doc reference) should return its facts.

## Bead-sourced vs. tree-sourced

If both a bead and a tree file carry the same `id`, the **bead wins** — it is the
frozen authority; the tree file is the mutable working copy that fed it. Ship from
the bead. The two queues are independent: `hindsight:pending` beads ship from
`bd`; tree-sourced docs (PRDs, HLDs, vision — memory but not work) ship from the
tree per the other reference. A given `id` belongs to exactly one queue.

## Idempotency and supersession

Re-posting the same `document_id` upserts (no duplicate). But a `shipped` bead is
frozen: do not re-ship to "edit" it. A change is a **supersession** — new doc with
a new `id` and `supersedes:`, a new bead, the old bead tombstoned and then
retracted. That retract flow is a separate queue (`hindsight:tombstoned`),
documented in `omg-commands` (Immutability and Supersession).
