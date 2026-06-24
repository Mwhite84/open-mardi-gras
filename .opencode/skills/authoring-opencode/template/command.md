---
# Optional but recommended. Shown in the TUI command list when you type "/".
description: One-line statement of what this command does.

# Optional. Which agent executes the command; defaults to the current agent.
# If it names a subagent, it triggers a subagent invocation by default.
agent: oc-smith

# Optional. true forces a subagent invocation even for a primary agent, keeping
# the work out of your primary context.
# subtask: true

# Optional. provider/model-id to override the model for this command only.
# model: provider/model-id

# Plugins can extend command frontmatter beyond the published schema. In this
# project, the open-mardi-gras ThenChainingPlugin adds `then:` — a follow-up
# (a prompt, a "/command", or an ordered list) fired after the command
# completes. Do not strip unknown keys as invalid without checking the loaded
# plugins first. Caveat: a chained command receives no positional arguments
# unless they are written into the entry itself (e.g. then: "/deploy staging");
# follow-ups fired via then: must work from session context, not $1.
# then: /follow-up-command
---

# The file body is the prompt template (required content). Keep it lean: state
# the ask, aim it at the target via arguments, and point at the skill that holds
# the procedure (for a wrapper command), or carry the procedure inline (for a
# self-contained command). See the authoring-opencode SKILL.md body for how to
# write this well.
#
# Placeholders:
#   $ARGUMENTS   everything passed after the command
#   $1, $2, $3   positional arguments
#   !`command`   inject shell output (runs from project root at invocation)
#   @path/file   inject file contents

Do <the job> on: $ARGUMENTS

Use the `<skill-name>` skill to carry this out end to end, then report what
was done, anything needing manual intervention, and anything deliberately
skipped.
