# Agent Instructions

**Important** ask me at the beginning of every session if I want to discuss how/when to ship the centralized repo docs to the git remote.

This repo is the **source of the OMG family of opencode instruments** — the
agents, skills, and commands that make up the OMG workflow — together with the
supporting beads and then-chaining plugins. Producing those instruments is the
entire point of the repo. It is published as an npm package.

## `opencode/` vs `.opencode/` — read this before touching either

This repo has a meta/recursive character: it both **produces** opencode
instruments and **dogfoods** them. Two directories look alike and are not. Do
not confuse them.

- **`opencode/` (no leading dot) is the PRODUCT.** It is the source of truth for
  the OMG agents, skills, commands, scripts, templates, and reference files this
  repo ships. This repo also dogfoods the product directly by setting
  `OPENCODE_CONFIG_DIR` to this directory, so a shipped instrument should exist
  here and only here.
- **`.opencode/` (leading dot) is the LOCAL HARNESS.** It contains repo-local
  configuration, development plugins, dependencies, and helper instruments used
  only to work on this repo. Examples include the `oc-smith` agent, the `/craft`
  command, the `authoring-opencode` skill, `.opencode/opencode.json`, and the dev
  plugins under `.opencode/plugins/`.

Consequences worth internalizing:

- Do not mirror shipped OMG instruments into `.opencode/`. If an agent, skill,
  command, script, template, or reference file is part of the package users get,
  edit it under `opencode/`.
- Do not move harness-only helpers into `opencode/`. A change to `oc-smith`,
  `/craft`, `authoring-opencode`, local config, package files, or dev plugins is
  repo-local and must not leak into the npm package.
- Some product resources execute from shell snippets. Those snippets must resolve
  `${OPENCODE_CONFIG_DIR:-.opencode}` first and fall back to `.opencode` when the
  resource is not there, so this repo's direct dogfooding and normal installed
  repos both work.

## The workflow flowcharts must not drift

`omg_flowchart.md` is a descriptive map of what the OMG instruments actually do —
the plan phase, the foreman's loop, the builder and tester flows, the summons and
adjudication paths, the review loop. `omg_flowchart.html` is a self-contained,
offline-openable rendering of it with the Mermaid diagrams drawn live.

**Any change to the logic of the workflow must update both files in the same
change as the instrument edit.** This includes a new or removed bead, a changed
dependency edge, a new decision branch or resolution, a changed agent
assignment, a new or retired human gate, and any change to how a phase begins or
ends. If you changed how the workflow *behaves*, the flowcharts are part of that
change — not follow-up work, and not somebody else's.

The Markdown is the source of truth; the HTML is generated from it and is never
hand-edited. After editing `omg_flowchart.md`:

```
just docs-setup    # once: bun install --cwd tools/docs
just docs-build    # regenerate the HTML
```

If `just` is unavailable, the recipe is a thin wrapper and the underlying command
works directly:

```
node tools/docs/build-flowchart-html.mjs
```

The build is deterministic and idempotent — running it when nothing changed
rewrites the same bytes — so **when in doubt, just run it.** There is
deliberately no verifier: everything one could check is already guaranteed by the
builder, which copies the diagram sources verbatim and inlines the Mermaid bundle
so the page needs no network.

**A commit that changes `omg_flowchart.md` without a regenerated
`omg_flowchart.html` is incomplete.** Nothing detects that automatically, and a
stale HTML is the one failure here that does not announce itself — it renders
perfectly and is quietly wrong. Regenerating is one command; run it.

**Never hand-edit `omg_flowchart.html`.** It is generated, and the next build
discards any edit.

Both files live at the repo root and are repo-local documentation, not part of
the shipped package. Their tooling lives in **`tools/docs/`**, with its own
manifest and lockfile — deliberately not in the root `package.json`, whose
dependencies every contributor installs, and deliberately not in `.opencode/`,
whose `package.json` is gitignored plugin scaffolding. It must never be moved
into `opencode/`.

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Beads / Dolt Pitfalls

- The remote Dolt server (`beads.brandondennis.me:3307`) is **multi-tenant**:
  it hosts several databases for different repos — `beads_omg` (this repo),
  `beads_monolith` (a monolith app), and `beads_tf` (a terraform repo), among
  possibly others. These are all **legitimate, active databases**, not cruft.
- `bd doctor` reports the sibling databases (`beads_monolith`, `beads_tf`) under
  a **"Phantom Databases"** warning and suggests "Restart Dolt server to flush
  phantom entries" (GH#2051). This is a **false positive**: bd assumes one
  database per server and misclassifies legitimate siblings as phantoms. Do NOT
  act on this warning — never delete those databases, and never restart the
  shared remote server to "flush" them. Restarting would disrupt the other
  repos that depend on it.
- `bd` resolves its Dolt backend by precedence: `BEADS_DOLT_*` env vars →
  `metadata.json` → `config.yaml`. The connection (host/port/password) lives in
  `BEADS_*` environment variables, NOT in committed config. If those env vars
  are absent, `bd` falls back to `127.0.0.1:0` (a non-existent local server) and
  every command fails — historically with confusing schema errors like
  `no such column: replacement_seq` when an old local standalone store existed.
  `BeadsPlugin`'s `shell.env` hook forwards all `BEADS_*` vars into every shell
  OpenCode spawns (primary and subagent) so dispatched subagents resolve the
  same backend the primary does. Without it, subagent `bd` calls fail.
- `BeadsPlugin` persists one `/omg-build` owner per epic outside the repo under
  `${XDG_STATE_HOME:-~/.local/state}/open-mardi-gras/beads/`, keyed by the
  project directory. A fresh `/omg-build <epic>` session transfers ownership;
  deleting the owning session removes it. Restoring this state must never start
  a background turn at plugin initialization; it only enables later idle-event
  nudges after the user resumes that session. Do not move this runtime state
  into `.opencode/` or inject it into agent prompts.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

## bd Sync

- Do not run `bd dolt push` for this repo's normal workflow. This project no
  longer uses embedded Dolt server sync for beads; commit bead metadata and use
  the normal `git push` path instead.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds


<!-- BEGIN BEADS INTEGRATION -->
## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Dolt-powered version control with native sync
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**

```bash
bd ready --json
```

**Create new issues:**

```bash
bd create "Issue title" --description="Detailed context" -t bug|feature|task -p 0-4 --json
bd create "Issue title" --description="What this issue is about" -p 1 --deps discovered-from:bd-123 --json
```

**Claim and update:**

```bash
bd update <id> --claim --json
bd update bd-42 --priority 1 --json
```

**Complete work:**

```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task atomically**: `bd update <id> --claim`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" --description="Details about what was found" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`

### Auto-Sync

bd automatically syncs via Dolt:

- Each write auto-commits to Dolt history
- Use `bd dolt push`/`bd dolt pull` for remote sync
- No manual export/import needed!

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

For more details, see README.md and docs/QUICKSTART.md.

<!-- END BEADS INTEGRATION -->

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **open-mardi-gras**. Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "master"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/open-mardi-gras/context` | Codebase overview, check index freshness |
| `gitnexus://repo/open-mardi-gras/clusters` | All functional areas |
| `gitnexus://repo/open-mardi-gras/processes` | All execution flows |
| `gitnexus://repo/open-mardi-gras/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
