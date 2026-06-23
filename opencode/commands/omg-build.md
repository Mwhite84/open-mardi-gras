---
description: Run an epic end to end — dispatch its ready queue, drive the build/review loop, close it, then write the build report and ship to Hindsight
agent: omg-foreman
then: /omg-ensure-work-finished
---

Run epic `$1` from its ready queue all the way to shipped memory.

Two settings govern how you work — use these values, do not re-derive them:

- **build mode:** `!`yq -r '.build.mode // "one_agent"' .workflow.yaml 2>/dev/null || echo one_agent`` —
  one of `one_agent` (one builder reused across beads via `task_id`),
  `one_agent_fresh_contexts` (one builder at a time, fresh context each bead), or
  `multi_agents` (fan out one builder per ready bead, concurrent; experimental).
- **dolt mode:** `!`jq -r '.dolt_mode // "embedded"' .beads/metadata.json 2>/dev/null || echo embedded`` —
  `server` (every `bd` write lands immediately; never run `bd dolt commit/push/pull`)
  or `embedded` (follow the sync discipline). Pass this to every worker.

Drive the work with the `omg-foreman` skill end to end:

1. Loop the epic's ready queue. For each ready bead, read its `agent` label
   (`bd state <id> agent`) and dispatch it to that agent as a subagent, in the
   concurrency shape the build mode dictates. Never special-case any bead — the
   label routes everything, including the review bead.
2. When the queue drains and the epic is closeable, close the epic.
3. Synthesize the build report from the child bead comments against the
   `doc-templates` `build-report` template, with `produced_for` set to the spec's
   `id`. Mint its `id` (`build-report.<domain>.<topic>.NNNN`) and write it to the
   path computed from that id per the `doc-templates` "Placing the document" rule
   (`<docs_base>/build-report/<id>.md`, via the resolver — which for a satellite
   lands in the central tree). Always write it; give it a `hindsight` block only if
   it carries something worth remembering.
4. Ship with the `hindsight-cli` references, in order: the epic first (from its
   bead), then the build report (only if it has a `hindsight` block). If a ship
   fails, stop and surface it.

Report what you completed: beads built, findings the reviewer raised and how they
resolved, what the report captured, and what shipped.
