# Using the OMG Workflow

This guide walks you from an empty repo to shipped features using the OMG family
of agents, commands, and skills. There are two journeys:

1. **Setup & onboarding** — stand up your memory bank and wire your repo(s) into
   the workflow. You do this once per repo.
2. **The delivery workflow** — turn an idea into a spec, harden it, decompose it
   into work, build it, review it, and record what shipped. You do this for every
   feature.

Everything is driven by slash commands that route to a specialized agent, which
in turn leans on skills (its runbooks). You mostly type a command and converse;
the agents do the work and ask when they need a decision.

---

## Concepts in one minute

- **Hindsight** is the shared memory bank. Durable documents (specs, ADRs, PRDs,
  build reports) ship to it so any agent on the platform can recall the decisions
  behind the code.
- **Beads** is the work tracker (issues/epics in a Dolt-backed database). Specs
  decompose into an epic of beads; the foreman builds them.
- **Documents are identified by a stable `id`** (`type.domain.topic.NNNN`), not by
  their file path. This is what lets docs move, and lets one repo reference
  another's docs.
- **A repo has a `mode`** declared in `.workflow.yaml`: `solo`, `centralized`, or
  `satellite`. The mode decides where docs live and where the bank connection
  comes from. More below.

---

## Choosing a mode

The first decision is how many repos you're running.

### `solo` — one repo for everything

Code, docs, the beads database, and the bank connection all live in one
repository. Everything in the delivery workflow happens here. **Choose this if you
have a single repo, or you're just starting out.** It's the simplest setup and the
whole workflow runs end to end in one place.

### `centralized` + `satellite` — many code repos, one docs hub

When you have a *platform* of several code repos (a monolith, an infra repo, a
parser library…), you keep **all durable documents in one centralized docs
repository**, and each code repo is a **satellite** that reads from and writes back
into it. There is **one shared memory bank** for the whole platform — that shared
memory is the entire point of this arrangement.

- The **centralized** repo (the hub) holds the docs tree, defines the bank
  connection, and authors platform-wide documents (PRDs, cross-cutting ADRs). It
  has **no beads** — it builds nothing.
- Each **satellite** repo holds code, its own beads database, and writes its specs,
  ADRs, and build reports *into the central tree*. It **inherits** the bank
  connection from the center — it never defines its own.

Why bother: specs in one repo can reference a platform PRD by `id`; an agent
working the monolith can recall decisions made anywhere; and every document lives
under one collision-free identity scheme.

> **Rule of thumb:** one repo → `solo`. A platform of repos that should share
> memory → one `centralized` hub plus a `satellite` per code repo. Don't use
> multiple banks; the OMG family is designed around a single shared bank.

---

## Journey 1 — Setup & onboarding

### Step 0 — Install the instruments

> **Pre-release notice.** The `rearchitect` branch is a pre-release experiment
> that will likely be merged back into `master` in the future. For now it is
> **not** published to npm, so installing directly from the git branch (below) is
> the **only** proper way to install this pre-release. Once it lands on `master`
> and is published, the plain `npx @toady00/open-mardi-gras setup` command will be
> the way to install.

Run the setup command in your project to copy the OMG family — the agents,
commands, and skills — into your `.opencode/` directory. Point `npx` at the git
branch; npm builds it on install:

```
npx 'github:Toady00/open-mardi-gras#rearchitect' setup
```

Re-run it after upgrading to pick up new versions of the workflow files. Then
restart opencode so it loads the agents, commands, and skills. See this repo's
README for installing the plugin itself.

### Step 1 — Set up Hindsight memory

The bank is the foundation — onboarding will verify it's reachable, and the
authoring agents need its tagging vocabulary. Run:

```
/omg-hindsight-setup
```

This routes to the **hindsight architect**. What it does depends on what you have:

- **Nothing set up in Hindsight yet?** The architect designs a bank for you — the
  tag dimensions (provenance, bounded context, discipline, memory type), retain
  strategies, and mental models — and produces a **bank template**. You can ask it
  to **apply that template using the `hindsight` CLI** so the bank actually exists,
  e.g. *"use the hindsight CLI to create this bank from the template."*
- **Already have a bank?** (you created one yourself, or just did the step above) —
  the architect reads its live vocabulary and authors your repo's **`hindsight.md`**,
  the prose tagging-intent doc every authoring agent reads to tag documents
  correctly.

The architect is careful here: it treats the **running bank as the source of truth**
for vocabulary, and if your existing documents' tags disagree with the bank, it
**stops and asks** rather than silently blending them. If you have a directory of
already-tagged docs you want it to honor, tell it.

> **Multi-repo note:** in a `centralized`/`satellite` setup there is **one bank**
> and **one `hindsight.md`**, both owned by the centralized repo. Satellites inherit
> them — you do *not* run `/omg-hindsight-setup` in a satellite.

### Step 2 — Onboard the repo

With the bank reachable, wire the repo into the workflow:

```
/omg-onboard <solo|centralized|satellite>
```

This routes to the **onboarder**, which discovers what already exists, asks only for
the genuine gaps, writes (or hands you) the config, and then **verifies the wiring
actually works** — it doesn't just drop files and hope.

What it sets up per mode:

- **`solo`** — writes `.workflow.yaml` (`mode: solo`, your `docs_base`, the
  `hindsight` connection block), sets up the beads database, and verifies the
  document minter resolves, the bank is reachable, and `bd ready` works.
- **`centralized`** — writes `.workflow.yaml` (`mode: centralized`, `docs_base`,
  the `hindsight` block). **No beads** are created. Verifies the minter and the bank.
- **`satellite`** — asks you **where the centralized repo is** and **this repo's
  name**, then writes a small `.workflow.yaml` (`mode: satellite`, `central_repo`,
  `name` — no bank block, it inherits the center's) plus the `opencode.json`
  **references** and **external-directory permissions** that let it read and write
  the central tree. It sets up local beads and verifies — including a **test write
  into the central docs tree**, which is the single most common thing to get wrong
  (a read reference doesn't grant write access; the external-directory permission
  does).

The onboarder won't fabricate config or clobber what's there. If it can't write a
root file directly, it hands you the exact content and where to place it. If
`hindsight.md` is missing, it tells you to run `/omg-hindsight-setup`.

**Restart opencode** after onboarding so the new config loads.

### Setup, end to end

- **Solo project:** `/omg-hindsight-setup` (design + apply the bank, author
  `hindsight.md`) → `/omg-onboard solo` → restart. Done.
- **Platform:**
  1. In the **docs hub**: `/omg-hindsight-setup` (bank + the one shared
     `hindsight.md`) → `/omg-onboard centralized` → restart.
  2. In **each code repo**: `/omg-onboard satellite` (point it at the hub) →
     restart. No hindsight setup — it inherits.

---

## Journey 2 — From spec to delivered feature

The delivery flow is a pipeline of commands. In **solo** mode it all happens in the
one repo. In a **platform**, the rule for *where you run a step* is one question:
**does this work need to read a codebase?** If it does — and authoring or reviewing
a spec **for a particular code repo** does, because value-in-context and
buildability can't be judged without seeing that repo's code — you run it in that
**satellite**, and its documents land in the satellite's lane. Only *cross-cutting*
work that reads **no single codebase** (a platform-wide PRD, a cross-cutting ADR)
runs in the **centralized** repo. Either way the documents live under the one shared
docs tree, so every repo sees them by `id`.

> **The common case is a feature for one code repo: run the whole pipeline —
> `/omg-spec` through `/omg-build` — in that satellite.** The "run it centrally"
> notes below apply only when the spec or ADR is genuinely platform-wide and tied to
> no single codebase. Running a satellite feature's `/omg-spec` or `/omg-spec-review`
> from the centralized repo is the classic mistake: the resolver then places the
> document in the central lane (`docs/platform/…`) instead of the satellite's lane,
> splitting a spec from its ADRs.

### Step 1 — Write the spec (Product Manager)

```
/omg-spec <what you want to build>
```

Routes to the **product manager**. It interviews you about the problem — who the
user is, what they're trying to accomplish, why it matters — and pushes back on
vagueness before writing anything. Then it writes a spec, judging it for **user
value and scope** (buildability is the architect's job, next). The spec gets a
stable `id` and is placed automatically at `<docs_base>/spec/<id>.md`.

> Platform: run this **in the satellite** that will build the feature — its spec is
> for that codebase, so it lands in the satellite's lane (`docs/<name>/spec/`). Run
> it in the **centralized** repo only for a genuinely platform-wide spec tied to no
> single code repo (then it lands in `docs/platform/spec/`).

### Step 2 — Architectural review (Architect)

```
/omg-spec-review <path-to-spec>
```

Routes to the **architect**. It reviews the spec for **buildability and
verifiability** — can this be built as written, and can the result be checked
against it — without relitigating product scope. When a review surfaces a genuine
architectural decision (a real tradeoff with lasting consequences), the architect
writes an **ADR** for it, linked back to the spec via `produced_for`. If nothing
architecturally significant comes up, it records that the spec holds and stops — it
won't manufacture an ADR.

Iterate `/omg-spec` ↔ `/omg-spec-review` until the product and architecture
questions are settled.

> Platform: run this in the **same repo as the spec** — for a satellite feature,
> the satellite. Any ADR the review writes lands in that same lane, beside its spec,
> because both are authored from the same repo. (A review of a platform-wide spec
> runs centrally, and its ADR lands in `docs/platform/adr/`.)

### Step 3 — Harden into an implementation contract (Implementation Writer)

```
/omg-spec-harden <path-to-spec>
```

Routes to the **implementation writer**. It folds every ADR's *decision* into the
spec as plain requirements, then drives out gaps, contradictions, edge cases, and
missing acceptance criteria — until a coding agent could build it **with no chance
to ask a follow-up question**. Run it as many times as needed.

> **Platform:** for a satellite feature you are already in the satellite (you have
> been since `/omg-spec`), and you stay there for hardening and everything after —
> it must read the actual codebase. Because the satellite references the central
> tree, it reads the spec and ADRs by `id` from the shared docs tree regardless of
> which lane they live in. (If you authored a platform-wide spec centrally, switch
> to the satellite that will build it now.)

### Step 4 — Decompose into work (Decomposer)

```
/omg-decompose <path-to-spec>
```

Routes to the **decomposer**. It mints an **epic** from the spec and breaks it into
child beads with correct dependency wiring, creates ADR beads, and stamps each bead
with the `agent` label that says who works it (builders, the reviewer). It shows you
the structure and waits for your approval before finalizing.

> Platform: in the **satellite**, against that repo's local beads database.

### Step 5 — Build it all (Foreman)

```
/omg-build <epic-id>
```

Routes to the **foreman**, which orchestrates the whole epic to done. It runs the
ready queue and dispatches each bead to the agent its label names — it never does
the work itself. The build/review loop is **emergent**: builders implement beads,
the reviewer reviews and files findings as new beads, those become ready work, get
built, get re-reviewed — until the queue drains.

**Build modes** (set `build.mode` in `.workflow.yaml`) control how the foreman
spawns builders:

- **`one_agent`** (default) — one builder, reused across every bead via its
  `task_id`, so context accumulates. Sequential. The safest choice and the best one
  to prove the chain end to end.
- **`one_agent_fresh_contexts`** — one builder at a time, but a fresh context per
  bead. Sequential, no context bleed between beads.
- **`multi_agents`** — fans out: for a wave of N ready build beads, spawns N
  builders concurrently. Faster, but **experimental** — opencode does not serialize
  concurrent file writes, so the only thing keeping two builders off the same file
  is the decomposer's dependency wiring. Use `one_agent` until you trust your
  decomposition, then consider this for parallelism.

When the queue drains, the foreman **closes the epic**, then **synthesizes a build
report** from the builders' bead comments — capturing the delta between the plan and
what was actually built (the deviations and mid-build decisions). Finally it
**ships** to Hindsight: the epic first, then the build report.

> **Platform: this is the payoff of the seam.** The foreman runs in the satellite,
> but writes the build report **back into the central docs tree** (under the
> satellite's area), and ships it to the shared bank. Plan (spec/ADRs) and outcome
> (build report) end up as linked memories the whole platform can recall.
>
> **Solo:** identical, except the build report lands in the same repo's docs tree.

### Step 6 — It's shipped

The epic is closed, the code is built and reviewed, and memory holds both the spec
and the build report. Recall on the bank now surfaces what was decided *and* what
actually happened.

---

## Quick reference

| Command | Agent | What it does | Where (platform) |
|---|---|---|---|
| `/omg-hindsight-setup` | hindsight architect | Design/apply the bank; author `hindsight.md` | centralized only |
| `/omg-onboard <mode>` | onboarder | Wire the repo into the workflow + verify | every repo |
| `/omg-spec <idea>` | product manager | Write a spec from the problem | satellite (centralized only if platform-wide) |
| `/omg-spec-review <spec>` | architect | Review for buildability; write ADRs | satellite (centralized only if platform-wide) |
| `/omg-spec-harden <spec>` | implementation writer | Turn the spec into a buildable contract | satellite |
| `/omg-decompose <spec>` | decomposer | Mint the epic + child beads | satellite |
| `/omg-build <epic>` | foreman | Build + review the epic, write & ship the build report | satellite |

In **solo** mode, every row runs in the one repo.

## Tips & gotchas

- **Restart opencode** after any `.workflow.yaml` / `opencode.json` / agent / skill
  change — config loads at startup.
- **Start in `one_agent` build mode** to prove a workflow end to end before trying
  `multi_agents`.
- **Satellite write failures** almost always mean the external-directory **write**
  permission is missing — a read reference isn't enough. Re-run `/omg-onboard
  satellite`; its verification catches this.
- **One bank, one `hindsight.md`** per platform. Satellites inherit both; don't
  define a bank in a satellite's `.workflow.yaml` (the tooling rejects it).
- **Documents are identified by `id`, not path** — that's why a satellite can
  reference the hub's docs and why build reports can be written across repos.
