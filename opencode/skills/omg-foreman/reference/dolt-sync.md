# Reference: Beads sync by Dolt mode

Beads stores its data in Dolt, and how that Dolt is hosted changes which sync
commands are valid. The kickoff command auto-detects the mode and hands it to the
foreman as `dolt_mode`; the foreman passes it to every worker. Respect it — the
wrong commands either error or are pointless.

## Detecting the mode (the kickoff does this)

The authoritative signal is `.beads/metadata.json`:

```bash
DOLT_MODE="$(jq -r '.dolt_mode // "embedded"' .beads/metadata.json 2>/dev/null || echo embedded)"
```

- `server` — beads talks to a remote Dolt **server**. Writes (`bd update`,
  `bd close`, `bd set-state`, `bd create`) land on the server **immediately**.
- `embedded` — beads uses a local file-backed Dolt in `.beads/`. Writes are local
  until explicitly committed and pushed.

## `server` mode — do NOT commit/push/pull

In server mode, every `bd` write is already persisted on the server. The
`bd dolt commit` / `bd dolt push` / `bd dolt pull` commands are **not no-ops** —
`bd dolt push` actively **errors** (it tries to reach a git remote that server
mode does not use). So:

- Workers: claim and close your bead normally (`bd update --claim`, `bd close`).
  That is the whole sync — nothing else.
- Foreman: close the epic normally. Do **not** run `bd dolt commit/push/pull`
  anywhere.

## `embedded` mode — follow the sync discipline

In embedded mode, writes are local until pushed, so the existing discipline
applies:

- Pull before starting a batch of work (`bd dolt pull`) so local state matches the
  remote.
- Commit pending beads changes at controlled sync points (`bd dolt commit`).
- Push to share them (`bd dolt push`).

Keep these at the points the existing runbooks specify; do not sprinkle them per
bead.

## Who owns what, in both modes

Independent of dolt mode:

- **Workers own their own bead lifecycle** — claim and close their bead
  themselves. This is required so that in `multi_agents` mode each worker drives
  its own bead without contending with the foreman.
- **The foreman owns only the epic close**, never the workers' beads.
- **The foreman never pushes in `server` mode**, and in `embedded` mode keeps
  sync at controlled points rather than per-bead.
