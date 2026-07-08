---
name: omg-onboard
description: Runbook for wiring a repo into the OMG workflow — setting up its .workflow.yaml (mode, docs_base or central_repo+name, the hindsight block), its beads database, and (for a satellite) its opencode.json references and external-directory permissions, then verifying the wiring end to end. Use when onboarding a solo, centralized, or satellite repo, or when running /omg-onboard.
---

# Onboarding a repo into the OMG workflow

This runbook stands up one repo's place in the topology of
`adr.platform.multi-repo-canon.0001`: a `solo` repo (everything in one tree), the
`centralized` docs hub, or a `satellite` code repo that writes its docs back into
the central tree and ships to the one shared bank.

The work has one shape regardless of mode: **discover what already exists, derive
what you can from it, ask only for the genuine gaps, write what you are permitted
to (emit a snippet for the rest), then verify the wiring actually works.** You
never clobber existing config; you fill gaps and reconcile.

## The prime directive: discover before you ask

Read the ground truth first. Asking the user something the filesystem already
answers is a defect. Before any question, gather:

1. **`.workflow.yaml`** (repo root) — if it exists, read every key. A partial or
   prior setup is the common case; treat onboarding as reconcile-and-complete, not
   create-from-scratch.
2. **`.beads/metadata.json`** and **`.beads/config.yaml`** — does a beads DB
   exist, and in what `dolt_mode` (`jq -r '.dolt_mode' .beads/metadata.json`)?
   `server` vs `embedded` changes the beads setup and the workers' sync discipline.
3. **The project `opencode.json`** — existing `references` and
   `permission.external_directory` entries. opencode reads project config from
   **both** `opencode.json` at the worktree root **and** `.opencode/opencode.json`,
   and **deep-merges** them; they are not an either/or. On a conflicting key the
   `.opencode/opencode.json` value wins (it loads after the root file). So **read
   both** before proposing anything — a `references` or `external_directory` entry
   you think is missing may live in the other file, and a value you add to the root
   file can be silently overridden by the one in `.opencode/`. When you write (see
   below), prefer `.opencode/opencode.json` so your entries are on the winning side;
   if only the root file exists, write there rather than splitting config across two
   places. A satellite needs these entries; check what is already in both files
   before proposing more.
4. **The mode argument** the command passed (`solo` | `centralized` | `satellite`).
   If it contradicts an existing `.workflow.yaml` `mode`, stop and reconcile with
   the user — do not silently switch a repo's role.

Only after this do you ask anything, and you ask only for what discovery could not
supply.

## Load the reference for the mode

The three modes are genuinely different procedures. Load the matching reference and
work it:

- **`solo`** → `reference/solo.md`. One repo holds code, docs, beads, and config;
  defines its own `hindsight` block.
- **`centralized`** → `reference/centralized.md`. The docs hub: a `docs_base`, its
  own `hindsight` block, a `hindsight.md`, and **no beads** (it builds nothing).
- **`satellite`** → `reference/satellite.md`. A code repo: `central_repo` + `name`
  (no path into the tree, no local `hindsight` block), beads against the shared
  remote, and the `opencode.json` references + external-directory permissions that
  let it read and write the central tree.

## The resolver is your oracle

The single source of truth for *derived* config is the resolver,
`.opencode/skills/doc-templates/scripts/resolve-workflow.sh <key>`. After you write
(or stage) a `.workflow.yaml`, the resolver tells you what the effective config
actually is — `mode`, `docs_root`, `docs_base`, `hindsight.url/bank/guidance`,
`central_repo`. It also **fails loud** on every misconfiguration the design forbids
(a satellite with a local `hindsight` block, a missing `central_repo`, an
unresolvable path). Use it as the validator: a clean resolver run is the proof the
`.workflow.yaml` half is correct. Run it before the verification pass.

## Writing config you may not be permitted to write

`.workflow.yaml` and `opencode.json` live at the repo root, which may be outside
your edit scope. Do not pre-flight your own permissions — just attempt the write.
One of three things happens, and all are fine:

- **The write succeeds** (you had access, or the user approved the prompt). Done.
- **The write is refused.** Now you know. Write the proposed file to a temp
  location instead, show the exact content, and tell the user the precise path to
  place it. Then continue — the rest of onboarding (and verification) can proceed
  once they confirm placement.

Never leave the user guessing what to put where. Whatever you could not write, emit
in full with its destination path.

## Beads setup

A `satellite` and a `solo` repo track work in beads; a `centralized` repo does
**not** (it builds nothing — do not init beads there). When beads is needed and
`.beads/` is absent or empty:

- **Fresh git clone or worktree** → `bd bootstrap --yes` (non-destructive). Prefer
  this over `bd init` — `bd init` can create an empty embedded Dolt DB with an
  unrelated history that breaks `bd dolt pull` with "no common ancestor."
- **Connecting to the deployed Dolt server** (the shared remote, server mode) →
  `bd init --server --server-host <host> --server-user <user> --remote ""`. Confirm
  the host/user with the user; the platform's shared remote is the single bank's
  work-tracking peer, so a satellite should point at the same server every other
  satellite uses.

After setup, confirm the mode: `jq -r '.dolt_mode' .beads/metadata.json`. Record it
so the user (and later the kickoff command) knows whether the sync discipline
applies (`embedded`) or not (`server`). `bd dolt remote add` can exceed the shell
timeout while committing config — if it appears to hang, verify with
`bd dolt remote list` and inspect `.beads/config.yaml` rather than rerunning.

## The hindsight block and hindsight.md

- **`solo` / `centralized`** define their own `hindsight` block in `.workflow.yaml`
  (`url`, `bank`). Ask for these if discovery did not find them. They also need a
  **`hindsight.md`** at the repo root (the tagging-intent doc). If it is absent,
  do not invent tags — tell the user to run **`/omg-hindsight-setup`**, which
  routes the hindsight architect to author it against the live bank. Treat that as
  the explicit next step, not something you fabricate here.
- **`satellite`** must **not** define a `hindsight` block — it inherits the central
  bank. If discovery finds one in a satellite's `.workflow.yaml`, that is the error
  the resolver rejects; remove it. The satellite does not get its own
  `hindsight.md` either — it reads the central one (verify it resolves).

## Verification — prove the wiring, do not assume it

Onboarding is not done when the files are placed; it is done when the wiring is
**proven**. These are the things that otherwise fail silently at first real use.
Run the checks for the mode (the references list the exact commands):

- **The resolver yields a complete effective config** — no fail-loud errors for any
  key the mode needs.
- **The minter resolves and reaches the tree** —
  `.opencode/skills/doc-templates/scripts/next-id.sh <a.test.prefix>` returns an id
  without error. For a satellite this proves read/bash reach the central tree
  across the external-directory boundary.
- **A test write into the docs subtree succeeds** — for a satellite, write (then
  remove) a scratch file under the resolved `docs_base` in the central tree. This
  proves the external-directory **write** grant, the single most likely first-run
  break. If it prompts or is denied, the `external_directory` permission is missing.
- **`hindsight.md` resolves** — `resolve-workflow.sh hindsight.guidance` returns a
  path that exists (or you have flagged it as a follow-up).
- **The bank URL is reachable** — a cheap read against the resolved
  `hindsight.url`/`bank` (e.g. `hindsight bank list` or a `GET` that returns the
  bank), proving the connection before a real ship needs it.
- **(satellite) `bd ready` works** — the local beads DB answers, proving work
  tracking is live.

Report each check as pass/fail with the command you ran. A failed check is a
specific, fixable thing — name it; do not paper over it.

## Boundaries

- **A satellite onboarding never mutates the central repo.** It reads the central
  `.workflow.yaml` (to inherit `hindsight` and derive the shared root) and writes
  documents there only through the normal authoring flow — never its config, never
  its beads, never its `hindsight.md`. Onboarding touches only *this* repo's config.
- **You wire; you do not author docs or build.** Onboarding ends at proven wiring.
  The first spec, the first epic, the first ship are separate, later acts.
