---
name: authoring-opencode
description: Runbook for crafting and refining opencode instruments — agents (the who), skills (the how), and commands (the ask). Use when creating or revising any file under .opencode/ — an agent persona, a skill runbook, a slash command, or an inline agent/command in opencode.json.
---

# Authoring opencode Instruments

This runbook covers all three opencode instruments at once, because you cannot
craft one well without knowing which of the three you are actually building.
First classify the instrument, then follow the craft guidance for that kind.

## The mental model: who, how, ask

Three instruments, and the lines between them do not blur.

- **An agent is a *who*.** The hire. Identity, judgment, values, disposition —
  how this agent thinks, what it cares about, what it refuses, how it carries
  itself when things are ambiguous. An agent is not a task list. Step-by-step
  procedure in an agent means you reached for the wrong instrument.

- **A skill is a *how*.** The runbook the hire reaches for: the step-by-step,
  the checklist, the worked example, "here is a thing we do often and here is
  exactly how to do it." A skill teaches procedure, not identity. Some skills
  belong to one agent; some are generic and cut across agents.

- **A command is an *ask*.** The instruction you hand the hire to get a specific
  job moving. It packages "go do this" with arguments that aim it at a target,
  and it routes to the right agent. A command names the work and the target; it
  does not re-teach the work.

## Classify before you write

Run two tests, in order.

### Test 1 — which instrument? (who / how / ask)

- Is it **identity** — values, judgment, posture, what it refuses? → **agent**.
- Is it **reusable procedure** — ordered steps to get a recurring job done? →
  **skill** or **command** (go to Test 2).
- Is it a **specific, parameterized request** aimed at a target — "go do X on
  Y"? → **command** (go to Test 2).

If a single request mixes these, **split it**: a lean agent (who), a skill
(how), and/or a command (ask), each placed correctly. Say so rather than fusing
them into one instrument.

### Test 2 — skill vs command: who should be able to invoke it?

This is the load-bearing distinction, and it is about **invocation and
discoverability**, not just content:

- A **skill is agent-discoverable.** Its name and description sit in the agent's
  context (the `<available_skills>` block), so the agent can decide on its own
  to load it. You can trigger it too, but the defining property is that the
  agent *could* reach for it autonomously. **Cost:** every skill permanently
  spends context-window space and attention — the agent weighs it on every turn.

- A **command is user-invoked only.** It is invisible to the agent until *you*
  explicitly fire `/name`. It costs the agent zero context until invoked. The
  defining property is that **only you** decide when it runs.

So the question is: **should the agent be able to start this on its own?**

- **No, never** → it is a **command** (a self-contained one). A destructive,
  opinionated, or one-shot workflow you would never want an agent to
  self-initiate (e.g. "delete every merged branch on the remote") belongs in a
  command, with the procedure **inline in the command body**. Do not make it a
  skill — that would waste context and invite the agent to fire it unprompted.
  A good tell that something is truly command-only: it makes no sense for it to
  need different reference files for different flavors of the job. If it *would*
  benefit from progressive disclosure across variants (e.g. a testing runbook
  with a reference per framework), that is a skill, not a command.

- **Yes, it may** → it is a **skill** (a reusable how the agent can load). You
  may *also* wrap it in a command — see below.

### The two command shapes (they coexist)

1. **Self-contained command** — the procedure should never be agent-discoverable,
   so the steps live **inline in the command body**. No backing skill. Branching
   logic *can* live in a command, but when it gets hairy, push back: it is
   probably really a skill (or a skill plus a thin wrapper).

2. **Wrapper command** — the procedure lives in a skill the agent could also use
   autonomously; the command is a thin body that states the ask, takes
   arguments, and points at the skill. Create a wrapper when:
   - You keep retyping the same few-sentence prompt that references a skill with
     only minor tweaks each time. Strong wrapper candidate.
   - **There is a dedicated agent for that skill.** Then the wrapper should
     almost always exist: pinning `agent:` in the command takes the routing
     cognitive load off you (e.g. `/craft` pinning `oc-smith`). Rule of thumb:
     *user-invokes-a-skill + a-dedicated-agent-exists-for-it ⇒ make a command
     that ties them together.*
   - If the skill is **generic / cross-cutting** (no dedicated agent), a wrapper
     is optional — often skip it.

---

## Crafting an agent (the *who*)

You are hiring a person and describing who they are. You are not writing a task
list. If you catch yourself writing "first do X, then do Y," stop — that is a
skill.

1. **Name the role in one sentence.** "You are a senior X who Y." Everything
   else elaborates this anchor.
2. **Write to who they are, not what they do.** Speak in disposition, judgment,
   and posture. Address the agent directly ("You value...", "You refuse...",
   "When things are ambiguous, you..."). Avoid imperative step lists.
3. **State values *and* anti-values.** What the agent refuses, ignores, or
   deprioritizes defines it as much as what it pursues. Always include the
   negative space.
4. **Describe judgment under ambiguity.** Does it ask or guess? Optimize for
   speed or correctness? Disagree with the user when evidence warrants? This is
   the highest-leverage content in the prompt.
5. **Point to skills and commands without inlining them.** Tell the agent it has
   runbooks and to reach for the right one; do not copy their steps in.
6. **Set boundaries.** What it will not touch, decide, or modify. Tie these to
   permissions where relevant.
7. **Cut everything that does no work.** Motivational padding and "be helpful"
   filler dilute the words that carry identity.

**Smells to reject:** procedure in the prompt (→ skill); a wall of "you can do
X" capabilities (that is the *what*, not the *who*); all values and no
anti-values (mushy identity); filler ("world-class, highly capable...").

**Worked contrast.** Wrong (a *how*): "When given a bug, reproduce it, write a
failing test, fix the code, then run the suite." Right (a *who*): "You distrust
a fix you cannot prove. You reach for a failing test before a patch, because a
bug you can't reproduce is a bug you haven't understood. You would rather be
slow and certain than fast and wrong."

**Mechanics:** project agents live at `.opencode/agent(s)/<name>.md`; the file
body is the prompt (do not also set `prompt:` in frontmatter). Name agents
lowercase-hyphenated (`oc-smith`, not `oc_smith`). For the exact frontmatter
fields and permission semantics, load the `customize-opencode` skill — it is the
source of truth; do not guess, opencode hard-fails on invalid config.

---

## Crafting a skill (the *how*)

A skill answers "here is a thing we do often; here is exactly how to do it." It
teaches procedure, not identity. If you find yourself describing who the agent
is or what it values, pull it back out — that is an agent.

**Scope first.** Decide whether the skill is agent-specific (one agent uses it;
say so in the description) or generic/cross-cutting (write it so it stands alone
without assuming one agent's identity). When in doubt, prefer the reusable
framing — never at the cost of clarity.

**The two things that make or break a skill:**
1. **The description (the trigger).** A skill the model never loads, or loads on
   the wrong thing, has failed regardless of its body. Cover *what* it does and
   *when* to use it, in third person, front-loading the literal keywords and
   filenames the user will say. Gate with "Use ONLY when..." to stay quiet on
   adjacent topics.
2. **The body (the procedure).** Concrete, ordered, followable. Steps over
   prose. A worked example beats a paragraph.

**Steps:**
1. **Confirm it's a how** the agent may self-initiate. If it is identity, it is
   an agent; if it should never be agent-discoverable, it is a command.
2. **Write the description last, and sweat it.** Name the job and the trigger
   words after the body exists.
3. **Make the body a runbook.** Numbered steps, checklists, decision points —
   each an action or a check, not a meditation.
4. **Include at least one worked example** — input and correct output, or a
   right/wrong contrast.
5. **Call out failure modes and gotchas** — the thing that looks done but isn't,
   the permission that silently blocks, the order that matters.
6. **Reference, don't duplicate.** Point at authoritative detail elsewhere
   rather than copying it; duplicated procedure drifts.
7. **Bundle resources alongside.** Scripts, templates, references live in the
   skill's own folder; relative paths resolve from there. Use them for anything
   long or executable rather than inlining.

**Smells to reject:** a personality in a skill (→ agent); a vague description
("Helps with documents"); prose where steps belong; no worked example;
duplicated authority.

**Mechanics:** a skill is a folder named after the skill containing `SKILL.md`
exactly: `.opencode/skills/<name>/SKILL.md`. For the recognized frontmatter
fields, the `name` validation rules, and the description requirements, load the
`customize-opencode` skill — it is the source of truth.

---

## Crafting a command (the *ask*)

A command is "go do this on that." Decide its shape from Test 2 above —
self-contained (procedure inline) or wrapper (points at a skill) — then write it
lean.

**A wrapper command does three things, briefly:**
1. **States the ask**, parameterized by `$ARGUMENTS` / `$1`, `$2`, ... so it
   works on different targets.
2. **Routes** — runs as the right agent via `agent:` so the right *who* acts.
3. **Points at the skill** — names the skill to use rather than restating it.

When you point an agent at a specific instrument it should load, **call it "the
`<name>` skill," not "the `<name>` runbook."** The word "skill" is what tells the
agent this is a loadable skill to reach for; "runbook" is flavor that does not
trigger the reach. Reserve "runbook" for describing a skill's *nature* in the
abstract, never as the label for a concrete skill an agent must pick up.

**A self-contained command** instead carries the procedure in its body, because
the agent should never self-initiate it and there is no backing skill.

**Steps:**
1. **Confirm it's an ask** (Test 1) and pick its shape (Test 2).
2. **Name the command for the verb** — `/security-update`, `/review-changes`.
   The file name is the invocation. Lowercase-hyphenated.
3. **Design the arguments.** `$ARGUMENTS` for one free-form blob; positional
   `$1`, `$2`, `$3` for distinct inputs. Document the expected call.
4. **Route to the right agent** with `agent:`. Use `subtask: true` to keep it
   out of the primary context. Override `model:` only with reason.
5. **For a wrapper, point at the skill — don't inline it.** "Use the `<skill>`
   skill to do this on $1." For a self-contained command, write the procedure
   inline (and if that procedure grows hairy with branching, reconsider whether
   it should be a skill).
6. **Inject live context when it helps.** !`shell command` splices command
   output (e.g. !`git log --oneline -10`); `@path/to/file` includes file
   contents. They run at invocation from the project root.
7. **Keep it lean.** A wrapper is not an essay. The agent brings judgment, the
   skill brings procedure, the command brings the ask and the target.

**Smells to reject:** a runbook inlined into what should be a *wrapper* (move it
to the skill it references); no arguments where a target varies; wrong or
missing `agent:`; an essay where a few sentences would do.

**Mechanics & frontmatter:** start from the annotated template at
`template/command.md` (in this skill's folder) — it documents every field and
placeholder. (`customize-opencode` covers agent and skill frontmatter but not
command frontmatter, which is why this template exists.) In brief:

- Markdown form: `.opencode/commands/<name>.md`; file name is the command name;
  the body is the template (required content). JSON form: a `command` object in
  `opencode.json` where `template` holds the prompt string.
- Frontmatter: `description` (TUI list), `agent` (executor; defaults to current
  agent; a subagent triggers a subagent invocation), `subtask` (`true` forces a
  subagent invocation even for a primary agent), `model` (override).
- Placeholders: `$ARGUMENTS`, `$1`/`$2`/`$3`, !`command` (shell output),
  `@path` (file contents).
- Authoritative reference: `https://opencode.ai/docs/commands/`.

**Worked example (wrapper).** `.opencode/commands/security-update.md`:

```markdown
---
description: Run security updates against a target system
agent: build
subtask: true
---

Perform security updates on the system: $ARGUMENTS

Use the `security-update` skill to carry this out end to end. Report what was
updated, anything that required manual intervention, and anything you skipped.
```

Invoked as `/security-update system-x`. The command supplies the ask and target;
the `build` agent supplies judgment; the `security-update` skill supplies the
how.
