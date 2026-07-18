---
name: tpm-alignment
description: Runbook for the TPM to run the product-architecture alignment workflow in beads — cooking and pouring the tpm-alignment formula, delegating each step to the omg-product-manager or omg-architect, driving the TPM reconciliation gates, and fanning out into per-spec refinement molecules. Use when starting or running an alignment workflow for an initiative.
---

# TPM Alignment Workflow

This is the TPM's runbook for taking an initiative through product-architecture
alignment using beads. The **workflow itself lives in a beads formula**
(`tpm-alignment`), not here. This skill is how *you*, the TPM, drive that formula:
when to pour it, how to seed and delegate each step, how to work the
reconciliation gates that are your actual job, and how to fan out into specs.

It is intended for the **omg-technical-program-manager** agent. If you are not
the omg-technical-program-manager, do not run this — delegate to the
`omg-technical-program-manager` agent.

## Get the live beads syntax from beads, not from here

This skill deliberately does **not** reproduce `bd` command syntax — beads is the
source of truth and its flags change. Before you run the workflow:

- Run `bd prime` for the current beads orientation, and `bd <cmd> --help` (e.g.
  `bd cook --help`, `bd pour --help`, `bd mol show --help`) for exact flags.
- Trust `docs/MOLECULES.md` and `bd --help` over any prose — some published beads
  docs describe a stale wisp model. When in doubt, check the command's `--help`.

## The mental model you are operating

- A **formula** is the recipe (`tpm-alignment`). You never edit it mid-run; you
  cook and pour it.
- **Cook** compiles the formula into a **proto** (a frozen template epic).
- **Pour** instantiates the proto into a **molecule** — a real epic plus child
  step-issues wired by dependencies, git-synced and durable.
- This workflow pours a **liquid molecule**, not a wisp. The PRD, design, and
  reconciliation decisions are durable artifacts you will want in history. Wisps
  are vapor (git-ignored, throwaway) and are wrong for this. Only use a wisp for
  a genuinely disposable spike *inside* a step.

## The workflow shape

The `tpm-alignment` formula encodes this DAG (one step-issue each):

```
prd (omg-product-manager)
  → prd-review (omg-architect)
    → prd-reconcile (TPM)          ← your seam
      → design (omg-architect)
        → design-review (omg-product-manager)
          → design-reconcile (TPM) ← your seam
            → spec-planning (TPM: fan out into per-spec molecules)
```

Each step blocks the next, so the molecule cannot race past an unresolved
review or reconciliation.

## Running it

1. **Confirm the inputs.** You need the initiative and enough context for the PM
   to start a PRD — the user problem and any known goals or constraints. If these
   are missing or vague, get them before you pour. Pouring on a blurry problem
   just defers the ambiguity into the work.

2. **Pour the molecule.** Cook/pour the `tpm-alignment` formula with the
   `initiative` variable set. Check `bd pour --help` for the exact var-passing
   syntax. Use `bd cook ... --dry-run` first if you want to preview the tree.

3. **Work the molecule step by step.** Use `bd mol show` / `bd mol ready` (check
   `--help`) to see which step is unblocked. For each step, do what its
   description says:
   - **Delegation steps** (`prd`, `prd-review`, `design`, `design-review`):
     delegate to the named agent via the Task tool — `omg-product-manager` or
     `omg-architect`. Hand it the artifacts and findings from prior steps. Let
     the expert work in its own voice and its own skill; do not do their job for
     them. Record the result on the step issue and close it.
   - **Reconciliation steps** (`prd-reconcile`, `design-reconcile`): these are
     yours. See below.

4. **Fan out at `spec-planning`.** Once both reconciliations hold, decide how
   many specs the initiative needs and what each covers — you cannot know this
   until the PRD and design exist, which is why specs are not hardcoded in the
   parent formula. Pour one `spec-refinement` molecule per spec, seeding each
   with the relevant slice of the reconciled PRD and design. Then this molecule
   is done; the spec molecules carry the work forward.

## Working a reconciliation gate (your real job)

At each `*-reconcile` step you hold the seam. Do not rubber-stamp it.

1. **Read the review honestly.** Did it surface a real conflict between product
   intent and technical reality, or just notes? If there is no real conflict,
   record that the artifact holds and proceed.

2. **Try to align before you decide.** Most conflicts are missing context, not
   true tradeoffs. Convene the `omg-product-manager` and `omg-architect` via the
   Task tool, surface what each actually needs and what actually binds them, and
   look for the option that serves both. Aligning is the goal; deciding is the
   fallback.

3. **Decide only when alignment genuinely fails.** When user value and technical
   reality truly cannot both be fully served, choose. State plainly what is being
   traded away and why. Own it.

4. **Capture the outcome on the step issue** — aligned, or decided-with-tradeoff
   and the rationale — before you close it. An unrecorded resolution gets
   relitigated; a recorded one holds. Do not advance the molecule on an
   unresolved conflict.

## Failure modes to avoid

- **Pouring a wisp instead of a molecule.** This work is durable. A wisp would
  discard the PRD, design, and your decisions. Pour liquid.
- **Skipping the reconciliation.** Closing a `*-reconcile` step without actually
  working the conflict defeats the entire point of the workflow and of you.
- **Doing the experts' work.** At delegation steps, convene the
  `omg-product-manager` or `omg-architect`; do not write the PRD or grade the
  design yourself. You own the seam, not their domains.
- **Hardcoding specs.** Do not try to bake the spec list into the parent formula
  or guess it before the design exists. Fan out at `spec-planning`.
- **Reproducing bd syntax from memory.** Flags drift. Pull them from
  `bd <cmd> --help` each run.
- **Advancing on an unresolved conflict.** The dependency chain exists so the
  molecule waits. Resolve, record, then proceed.
