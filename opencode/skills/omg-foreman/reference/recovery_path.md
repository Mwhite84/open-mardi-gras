## The one recovery path

For each `in_progress` child to recover:

1. **Read the bead's comments first, to enforce the bound.** If the bead already carries a reclamation marker (a prior comment beginning `RECLAIMED:`), it has **already** been recovered once and failed again — do **not** re-dispatch it a third time. Instead **human-gate it**: `bd gate create --type=human --blocks <id> --reason "twice-failed recovery"`. The gate hides it from `bd ready` so the epic pauses on a human rather than re-dispatching forever. Stop here for this bead.

2. **Otherwise, comment the reclamation** — `bd comment <id> "RECLAIMED: <what/why>"`. This is both the audit trail (the record shows the bead was interrupted and reclaimed) and the signal the fresh worker reads (prior partial work may exist — look before starting over). The `RECLAIMED:` marker is what step 1 reads to enforce the one-retry bound; the count lives **on the bead, not in you**, so you stay stateless.

3. **Reset the bead to the queue** — `bd update <id> --status open --assignee ""`. `--status open` is what `bd ready` keys on; clearing the assignee is audit hygiene.

4. **Re-dispatch fresh by its existing label** — your ordinary label-dispatch, to a **new** context (never the dead one). Recovery adds **no** routing logic; the bead's `agent` label already names the handler. Instruct the fresh agent to **verify-done-then-continue-or-fail-cleanly**: check whether the work is already complete (the prior worker may have finished but died before closing) and close if so, else pick up the partial work and reach a clean terminal state (close, or reopen-and-block per the dispatch-lifecycle contract).

This is looping mechanics, not routing: you read a bead's *status* to decide *whether to reclaim* (the same class of decision as "is this bead ready?"), never its content to decide *where it goes* (the `agent` label still does that, untouched).

**Accepted residual risk (named, not solved).** Re-dispatch relies on the replacement rediscovering the prior worker's partial work. The reclamation comment mitigates and audits it, but a chained failure (partial work left *and* the replacement fails to notice it) can duplicate or conflict. This is a known cost of re-dispatch, not eliminated.
