This is the terminal report-writer bead for the epic. When you execute it:

1. **Read every child bead's comments** (`bd comments <id>`) — the workers'
   deviations, discoveries, decisions, and any Mode-2 adjudications recorded there.
   This is your source; do not report from memory.
2. **Synthesize the build report** — the delta between plan and what was built —
   using the `doc-templates` `build-report` template. Mint its `id` with
   `next-id.sh` as `build-report.<domain>.<topic>.NNNN`, `type: build-report`, and
   `produced_for: <spec-id>`.
3. **Write it to the docs tree** at the resolver-computed path
   (`<docs_base>/build-report/<id>.md`). Give it a `hindsight` block **iff** the
   build carried something worth remembering (deltas worth recalling); otherwise
   omit the block so it stays in Git without adding memory noise.
4. **Stop.** Do not ship to Hindsight, do not close the epic, do not touch any
   other bead. Writing the report is the whole job; shipping is a separate
   human-invoked command.
