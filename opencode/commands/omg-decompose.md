---
description: Mint the epic from a spec and drive the full plan phase over it
agent: omg-decomposer
---

!`OMG_CONFIG_DIR="${OPENCODE_CONFIG_DIR:-.opencode}"; [ -f "$OMG_CONFIG_DIR/skills/omg-misc/scripts/decompose-mint.sh" ] || OMG_CONFIG_DIR=".opencode"; "$OMG_CONFIG_DIR/skills/omg-misc/scripts/decompose-mint.sh" "$1"`

Drive the plan phase over the epic identified above, using the `omg-decompose` skill end to end. Pass the mode reported above — fresh mint or refinement pass — through to each planner, and follow the skill's fresh/refinement handling for the review and report-writer beads. When the graph is built and validated, show me the final structure and stop for my review.
