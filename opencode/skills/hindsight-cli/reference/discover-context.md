# Reference: Discovering context before authoring a document

Before writing a spec, ADR, PRD, or design doc, pull the bank's existing picture
so the document builds on what is already known — prior decisions, risks, the
product vision, related architecture — instead of starting cold. The path:
**orient via a mental model, then pull threads with targeted recall/reflect.**

Throughout, follow the context-explosion discipline from the parent skill:
JSON → temp file → `jq` projections. Set a scratch var once:

```bash
TMP="$(mktemp -d)"   # or your environment's scratch dir
BANK=stacked-chips   # the bank from .workflow.yaml
```

## 1. List the mental models — cheaply

Mental models are curated, fast, reusable views of the bank — the best first
read. **Do not dump the list**; the full JSON carries every model's content and
can exceed 800 KB. Project just id, name, and size:

```bash
hindsight -o json mental-model list "$BANK" > "$TMP/mm.json" 2>/dev/null
jq -r '.items[] | "\(.id)\t\(.name)\t(\((.content // "") | length) chars)"' "$TMP/mm.json"
```

You get a short menu, e.g.:

```
product-vision-and-user-context          Product Vision and User Context          (9069 chars)
engineering-architecture-and-decisions   Engineering Architecture and Decisions   (15417 chars)
current-risks-and-open-questions         Current Risks and Open Questions         (8920 chars)
company-mission-and-strategy             Company Mission and Strategy             (11228 chars)
```

## 2. Pick the model that frames your document, and read its content

Choose by what you are about to write — an ADR pairs with engineering
architecture and current risks; a PRD with product vision and mission. **Read
only `.content`** (the readable markdown), not the whole object — `get` returns
~140 KB of JSON whose bulk is `.reflect_response` raw facts, while `.content` is
~9 KB:

```bash
hindsight -o json mental-model get "$BANK" current-risks-and-open-questions > "$TMP/mm-one.json" 2>/dev/null
jq -r '.content' "$TMP/mm-one.json"
```

That content is a synthesized briefing — a strong, compact orientation. For many
documents, one or two well-chosen models is enough context to start.

## 3. Pull threads the model raised but did not fully answer

A mental model is a summary; it names things without exhausting them. When it
surfaces a decision, risk, or constraint you want more on, pull that thread.

**`recall`** — semantic search for the specific facts behind a thread. Keep the
budget low while exploring; project compact views, do not dump every record:

```bash
hindsight -o json memory recall "$BANK" "metering period billing decision" \
  --budget low --max-tokens 1024 > "$TMP/recall.json" 2>/dev/null
jq -r '.results[] | "[\(.type)] \(.text[0:120])"' "$TMP/recall.json"
```

`.results[]` carries `text`, `type` (`world` / `experience` / `observation`),
`tags`, and `entities`. Filter by tag to scope a thread to a dimension, e.g.
`--tags memory_type:adr --tags-match all`. Widen with `--budget mid` /
`--max-tokens` only when the low pass is too thin.

**`reflect`** — a reasoned answer in the bank's voice when you want synthesis,
not raw facts ("what was decided about X and why?"). Its output is compact
(`.text` + `.usage`), so it is safe to read more directly, but still keep budgets
modest:

```bash
hindsight -o json memory reflect "$BANK" "what did we decide about the metering period, and what's still open?" \
  --budget low --max-tokens 512 > "$TMP/reflect.json" 2>/dev/null
jq -r '.text' "$TMP/reflect.json"
```

Add `--include-facts` if you need to see the source facts a reflection rests on
(this enlarges the output — route through the temp file and project).

## 4. Know when to stop

Pull threads only as far as they inform the document you are about to write. Each
`recall`/`reflect` is another model-call round-trip and more context spent —
recall is for *targeted* follow-up on something a mental model raised, not a
substitute for reading the model. When you have enough to write from the bank's
picture rather than a blank page, stop and author.

## Recap

1. `mental-model list` → project `id`/`name`/size (never dump).
2. `mental-model get` → read `.content` only.
3. `recall` (facts) / `reflect` (synthesis) → low budget, temp file, compact
   projection, optional tag filters.
4. Stop when you have enough to author.
