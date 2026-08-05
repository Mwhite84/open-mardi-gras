# Handoff — Product Manager's Lens

The form of a handoff — its sections — lives in the `doc-templates` skill
(`templates/handoff.md`). This file covers what the **product manager** does
within that form.

A handoff records obligations and their owners. **It never describes how to
discharge them.** OMG carries work to a built repository and stops there; the
stage after that is deliberately undesigned, so steps, sequencing, schedules, or
procedure in this document would be OMG quietly designing operations it does not
own. The instinct to be helpful is what produces them — this is a register, not
a plan.

## What the PM checks

- **Each obligation names an outcome, not a task.** "The induced-failure alarm
  has fired and the evidence is recorded," never "run the alarm exercise." How
  it gets done is the owner's to decide.
- **Why it left cites the bound it failed.** Name the reason this repository
  could not verify it — usually that verifying it requires the system to be
  running — rather than gesturing at scope.
- **The owner is a real, named party.** A team, a role, or a person who could
  read the entry and recognize the obligation as theirs. "Operations" as an
  abstraction and "TBD" are not owners; either belongs in Unowned Obligations.
- **What would show it satisfied is an observable, not a method.** State what the
  owner could point at, not how they would produce it.
- **What this repository supplies is written for the receiving owner.** The same
  fact also appears in the source spec's Relocated Requirements, and that
  duplication is deliberate — it stops a relocation from dragging repository work
  out with it there, and tells the owner what they are being handed here. If the
  two ever disagree, the **spec** is authoritative for what the repository
  supplies and the **handoff** is authoritative for the obligation and its owner.

## Never invent an owner

An obligation with no owner is a signal about the system decomposition, and
surfacing it is the whole value of relocation — the point was always that
relocating a requirement forces its owner to be named. Filling Unowned
Obligations with a plausible-sounding party to empty the section destroys
exactly what the section exists to produce. Leave it unowned and raise it with
the user.

## Review backstop

Two checks nothing upstream can make:

- **Every obligation traces to a relocated requirement in a source spec.** One
  that does not has arrived from somewhere it should not have.
- **Nothing here is something the repository could have verified itself.** An
  obligation of that kind is a scoping error upstream — send it back to the spec
  rather than accepting it here. This is the one place over-aggressive relocation
  becomes visible.
