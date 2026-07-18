# Reference: Shipping an in-tree document to Hindsight

A tree-sourced document carries everything the retain call needs in its
frontmatter (per `adr.platform.frontmatter-schema.0001`). Shipping turns that
frontmatter + body into one Hindsight memory:

| Retain argument | Source in the document |
|---|---|
| `bank_id`     | the resolver (`resolve-workflow.sh hindsight.bank`) — inherits the central bank in a satellite; not in frontmatter |
| `document_id` | the top-level `id` (the stable upsert key) |
| `strategy`    | `hindsight.strategy` (omit → bank default extraction) |
| `tags`        | `hindsight.tags` merged with any top-level `tags`, verbatim |
| `content`     | the document body (everything after the frontmatter) |

A document ships **iff** it carries a `hindsight` block. No block → it stays in
Git only; do not ship it.

## Use the HTTP API, not the CLI retain commands

**Verified the hard way:** no single `hindsight` CLI subcommand can set
`document_id` + `strategy` + item-level `tags` together. Worse, the CLI
workaround (`retain-files --strategy` then `document update --tags`) tags the
*document* record but leaves the extracted **memory facts untagged** — and
recall/reflect filter on **item-level** tags, so those facts never surface under
a tag filter. That silently defeats the reason you tagged at all.

The HTTP `POST .../memories` endpoint sets all four on the memory item in **one
call**, and the tags land on the facts (confirmed: a `--tags memory_type:adr`
recall returns them). So ship via the API. Build the body with `jq --rawfile`,
which embeds the whole document body with correct JSON escaping — no
shell-quoting a multi-KB doc.

## The steps

Pull the pieces from the document, then assemble and POST. Use a scratch dir for
the body file (never inline a doc into the shell or your context).

```bash
TMP="$(mktemp -d)"
DOC="docs/decisions/adr.platform.frontmatter-schema.0001.md"   # the file to ship
# Resolve the connection through the resolver, never raw yq — a satellite has no
# local hindsight block; it inherits the central one.
OMG_CONFIG_DIR="${OPENCODE_CONFIG_DIR:-.opencode}"
[ -f "$OMG_CONFIG_DIR/skills/doc-templates/scripts/resolve-workflow.sh" ] || OMG_CONFIG_DIR=".opencode"
RES="$OMG_CONFIG_DIR/skills/doc-templates/scripts/resolve-workflow.sh"
URL="$(bash "$RES" hindsight.url)"
BANK="$(bash "$RES" hindsight.bank)"
```

### 1. Split frontmatter from body

The body is everything after the second `---`. The frontmatter is the YAML
between the two fences — parse the fields you need from it.

```bash
# body = everything after the closing frontmatter fence
awk 'f{print} /^---[[:space:]]*$/{c++} c==2 && !f{f=1}' "$DOC" > "$TMP/body.md"

# frontmatter = the block between the first two fences
awk 'c==1{print} /^---[[:space:]]*$/{c++}' "$DOC" > "$TMP/fm.yaml"
```

### 2. Read the retain fields from the frontmatter

```bash
ID="$(yq '.id' "$TMP/fm.yaml")"
STRATEGY="$(yq '.hindsight.strategy // ""' "$TMP/fm.yaml")"
# tags: hindsight.tags plus any top-level tags, as a JSON array
TAGS_JSON="$(yq -o=json '((.hindsight.tags // []) + (.tags // [])) | unique' "$TMP/fm.yaml")"
```

Confirm a `hindsight` block exists before going further — no block means do not
ship:

```bash
yq -e '.hindsight' "$TMP/fm.yaml" >/dev/null || { echo "no hindsight block — not memory, skip"; exit 0; }
```

### 3. Assemble the retain body with `jq --rawfile`

`--rawfile` reads the body file as a single JSON-escaped string, so arbitrary
document content is embedded safely. Include `strategy` only when set (omitting
it uses the bank default):

```bash
jq -n \
  --rawfile content "$TMP/body.md" \
  --arg id "$ID" \
  --arg strategy "$STRATEGY" \
  --argjson tags "$TAGS_JSON" \
  '{
     items: [
       ( { content: $content, document_id: $id, tags: $tags }
         + ( if $strategy == "" then {} else { strategy: $strategy } end ) )
     ],
     async: false
   }' > "$TMP/retain.json"
```

For a large document, set `async: true` to queue background processing.

### 4. POST it

```bash
curl -sS -X POST "$URL/v1/default/banks/$BANK/memories" \
  -H "Content-Type: application/json" \
  --data-binary @"$TMP/retain.json" \
  -w '\nHTTP %{http_code}\n'
```

If the server requires auth, add `-H "Authorization: Bearer $HINDSIGHT_API_KEY"`
(source the token from the environment; never hardcode it). A success response is
`{"success":true,...,"items_count":1}` with HTTP 200.

### 5. Verify

```bash
hindsight -o json document list "$BANK" > "$TMP/docs.json" 2>/dev/null
jq --arg id "$ID" '(.items // .)[] | select(.id==$id) | {id, tags}' "$TMP/docs.json"
# spot-check the facts are tag-filterable:
hindsight -o json memory recall "$BANK" "<a phrase from the doc>" \
  --budget low --max-tokens 512 --tags "<one of the doc's tags>" --tags-match all \
  > "$TMP/r.json" 2>/dev/null
jq -r '.results[] | "tags=[\(.tags|join(","))] :: \(.text[0:60])"' "$TMP/r.json"
```

The recalled facts should carry the doc's tags. Empty fact tags mean something
shipped through the wrong path — recheck step 3.

## Idempotency and re-shipping

Re-posting with the **same `document_id`** upserts: it reprocesses that document
rather than creating a duplicate (verified — doc count stays 1 across re-ships).
The top-level `id` is therefore the stable key that makes shipping repeatable.

Per the memory-lifecycle ADR, a *shipped* tree-sourced doc is frozen — a change
is a supersession (new `id`, `supersedes:`, retract the old `id`, ship the new),
not an in-place re-ship. Re-shipping the same `id` is for correcting a failed or
partial ship, not for editing shipped memory.

## If the API call fails, stop — do not fall back to the CLI

There is deliberately **no CLI fallback** for shipping. The CLI retain commands
cannot tag memory facts at the item level (see above), so a "fallback" would
produce memory that looks shipped but is invisible to tag-filtered recall — a
silent, surprising corruption that is worse than not shipping.

If the `POST` fails (non-200, or a verify in step 5 shows untagged facts),
**surface the error to the user** with the response body and the document `id`.
Do not work around it. A failed ship is a clean, recoverable state; a half-shipped
mis-tagged document is not.
