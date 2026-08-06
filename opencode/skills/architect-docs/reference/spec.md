# Spec — Architect's Lens

The form of a spec — its sections — lives in the `doc-templates` skill
(`templates/spec.md`). This file covers what the **architect** does within that
form: it judges a spec for **buildability and verifiability** — can this be
implemented as written, and can the result be checked against it. (The
omg-product-manager reviewing the same spec judges it for user value and scope;
that is a different lens, in `pm-docs`.)

## What the architect checks

- **Every requirement is verifiable.** Each states an observable behavior or
  property someone could test. "Retries should be sensible" is not a requirement;
  "a retryable failure is retried at most three times with exponential backoff,
  and a non-retryable failure is never retried" is.
- **Inputs and outputs are defined.** For every behavior, what goes in, what comes
  out, and the shape of each. Undefined data shapes are gaps.
- **Preconditions are stated.** The conditions under which the behavior holds and
  what is assumed going in.
- **The edges are covered.** What happens on invalid input, failure, timeout, or
  limit. A happy-path-only spec is incomplete — the edges are where specs earn
  their keep.
- **It can actually be built.** Nothing required is technically infeasible or
  self-contradictory.

## Smells the architect flags

- **Unfalsifiable requirements.** "Robust," "scalable," "user-friendly" with no
  measurable criterion. Flag each and ask for the testable form.
- **Ambiguous quantifiers.** "Fast," "soon," "large," "most" — replace with
  numbers or defined thresholds.
- **Sharpening that needs the system running.** Both fixes above fork: "scalable"
  becomes either "handles 10k rps," which belongs to whoever operates the system,
  or "the handler holds no in-process session state, so any replica can serve any
  request," which two instances and a fake can test. Prefer the reading that
  captures what was meant — usually the second. Sharpened the wrong way, the
  requirement is relocated out of the spec and the real one goes with it.
- **Happy-path-only.** No error cases, no limits, no failure behavior.
- **Implementation leaking in.** A spec says *what*, not *how*. Prescribing the
  internal design over-constrains the builder; flag it unless the mechanism is
  itself a requirement.
- **Untestable acceptance.** If you cannot describe how a requirement would be
  verified, it is not yet a requirement.
