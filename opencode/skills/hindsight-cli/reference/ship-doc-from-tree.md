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
     async: true
   }' > "$TMP/retain.json"
```

### 4. POST it

```bash
CURL_AUTH=()
[ -z "${HINDSIGHT_API_KEY:-}" ] || CURL_AUTH=(-H "Authorization: Bearer $HINDSIGHT_API_KEY")

if ! HTTP_CODE="$(curl -sS -X POST "$URL/v1/default/banks/$BANK/memories" \
  -H "Content-Type: application/json" \
  "${CURL_AUTH[@]}" \
  --data-binary @"$TMP/retain.json" \
  -o "$TMP/retain-response.json" \
  -w '%{http_code}')"; then
  echo "$ID: retain request failed" >&2
  exit 1
fi

if [[ "$HTTP_CODE" != 2* ]]; then
  echo "$ID: retain returned HTTP $HTTP_CODE" >&2
  jq . "$TMP/retain-response.json" >&2
  exit 1
fi

jq -r '[.operation_id, ((.operation_ids // [])[])]
       | map(select(. != null)) | unique[]' \
  "$TMP/retain-response.json" > "$TMP/operation-ids"
[ -s "$TMP/operation-ids" ] || { echo "$ID: retain returned no operation id" >&2; exit 1; }
```

The API can return multiple operation IDs when a request contains multiple retain
strategies. Track every returned ID. Source an auth token from the environment;
never hardcode it.

### 5. Wait for every operation

An accepted request is queued, not shipped. Poll each operation until it reaches a
terminal state. Do not resubmit while it is `pending` or `processing`.

```bash
while IFS= read -r OP; do
  while true; do
    if ! curl -sS "${CURL_AUTH[@]}" \
      "$URL/v1/default/banks/$BANK/operations/$OP" > "$TMP/operation.json"; then
      echo "$ID: could not read operation $OP; resume polling it later" >&2
      exit 1
    fi

    STATUS="$(jq -r '.status // empty' "$TMP/operation.json")"
    case "$STATUS" in
      completed) break ;;
      failed|cancelled)
        echo "$ID: operation $OP ended $STATUS" >&2
        jq '{status, error_message, retry_count, next_retry_at, progress}' \
          "$TMP/operation.json" >&2
        exit 1
        ;;
      pending|processing) sleep 2 ;;
      *) echo "$ID: operation $OP returned invalid status: $STATUS" >&2; exit 1 ;;
    esac
  done
done < "$TMP/operation-ids"
```

If polling is interrupted, keep the operation IDs and resume polling. Submitting
the document again would create more work while the original operation may still
complete.

### 6. Verify

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

If submission fails, an operation fails, or verification shows untagged facts,
**surface the error to the user** with the response body and the document `id`.
Do not work around it. A failed ship is a clean, recoverable state; a half-shipped
mis-tagged document is not.
