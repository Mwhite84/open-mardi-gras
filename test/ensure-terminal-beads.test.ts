import { chmod, copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterEach, describe, expect, it } from "bun:test"

const script = join(
  import.meta.dir,
  "..",
  "opencode",
  "skills",
  "omg-misc",
  "scripts",
  "ensure-terminal-beads.sh",
)
const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

type Child = { id: string; title: string }

// Stand up a fake `bd` on PATH that logs every invocation and serves a fixed
// children snapshot, so the script's flow can be asserted without a real
// beads database.
async function fixture(children: Child[]) {
  const root = await mkdtemp(join(tmpdir(), "omg-terminal-beads-"))
  tempDirs.push(root)
  const bin = join(root, "bin")
  await mkdir(bin)
  const log = join(root, "bd.log")
  const childrenFile = join(root, "children.json")
  const countFile = join(root, "create.count")
  await writeFile(log, "")
  await writeFile(childrenFile, JSON.stringify(children))
  await writeFile(
    join(bin, "bd"),
    `#!/usr/bin/env bash
printf 'bd %s\\n' "$*" >> '${log}'
case "$1" in
  children) cat '${childrenFile}' ;;
  create)
    n="$(cat '${countFile}' 2>/dev/null || echo 0)"
    n=$((n + 1))
    printf '%s\\n' "$n" > '${countFile}'
    printf 'new-%s\\n' "$n"
    ;;
  dep)
    if [ "$2" = "add" ] && [ "$3" = "--file" ]; then
      while IFS= read -r line; do printf 'dep-file %s\\n' "$line" >> '${log}'; done
    fi
    ;;
esac
exit 0
`,
  )
  await chmod(join(bin, "bd"), 0o755)
  return { bin, log }
}

async function run(scriptPath: string, args: string[], env: Record<string, string> = {}) {
  const process = Bun.spawn(["/bin/bash", scriptPath, ...args], {
    env: { ...Bun.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ])
  return { exitCode, stderr, stdout }
}

describe("ensure-terminal-beads.sh", () => {
  it("fails with usage when no epic id is given", async () => {
    const result = await run(script, [])

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain("usage: ensure-terminal-beads.sh <epic-id>")
  })

  it("fails loud when bd is not on PATH", async () => {
    const result = await run(script, ["bd-1"], { PATH: "/dev/null" })

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain("bd not found")
  })

  it("fails naming the missing canonical body when run from a copy without bead-content", async () => {
    const { bin } = await fixture([])
    const root = await mkdtemp(join(tmpdir(), "omg-terminal-beads-copy-"))
    tempDirs.push(root)
    const orphan = join(root, "scripts", "ensure-terminal-beads.sh")
    await mkdir(dirname(orphan))
    await copyFile(script, orphan)
    await chmod(orphan, 0o755)

    const result = await run(orphan, ["bd-1"], { PATH: `${bin}:${Bun.env.PATH}` })

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain("canonical review bead body not found")
    expect(result.stderr).toContain(`${join(root, "scripts")}/../bead-content/review-bead.md`)
  })

  it("stops before any mutation and names the ids when Review beads are duplicated", async () => {
    const { bin, log } = await fixture([
      { id: "bd-2", title: "Review" },
      { id: "bd-3", title: "Review" },
      { id: "bd-4", title: "Write build report" },
    ])

    const result = await run(script, ["bd-1"], { PATH: `${bin}:${Bun.env.PATH}` })

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain("multiple Review beads on bd-1: bd-2, bd-3")
    const calls = await readFile(log, "utf8")
    expect(calls).not.toContain("bd create")
    expect(calls).not.toContain("bd set-state")
    expect(calls).not.toContain("bd dep")
  })

  it("stops before any mutation and names the ids when report-writer beads are duplicated", async () => {
    const { bin, log } = await fixture([
      { id: "bd-2", title: "Review" },
      { id: "bd-3", title: "Write build report" },
      { id: "bd-4", title: "Write build report" },
    ])

    const result = await run(script, ["bd-1"], { PATH: `${bin}:${Bun.env.PATH}` })

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain("multiple report-writer beads on bd-1: bd-3, bd-4")
    const calls = await readFile(log, "utf8")
    expect(calls).not.toContain("bd create")
    expect(calls).not.toContain("bd set-state")
    expect(calls).not.toContain("bd dep")
  })

  it("reuses existing terminal beads without rewriting them and reconciles the edges", async () => {
    const { bin, log } = await fixture([
      { id: "bd-2", title: "Implement widget" },
      { id: "bd-3", title: "Test widget" },
      { id: "bd-4", title: "Review" },
      { id: "bd-5", title: "Write build report" },
    ])

    const result = await run(script, ["bd-1"], { PATH: `${bin}:${Bun.env.PATH}` })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("review: bd-4")
    expect(result.stdout).toContain("report: bd-5")
    const calls = await readFile(log, "utf8")
    expect(calls).not.toContain("bd create")
    expect(calls).toContain("bd set-state bd-4 agent=omg-reviewer --reason Review bead")
    expect(calls).toContain("bd set-state bd-5 agent=omg-reviewer --reason Report-writer bead")
    expect(calls).toContain("bd dep remove bd-4 bd-5")
    expect(calls).toContain('dep-file {"from":"bd-4","to":"bd-2"}')
    expect(calls).toContain('dep-file {"from":"bd-4","to":"bd-3"}')
    expect(calls).not.toContain('"to":"bd-5"')
    expect(calls).toContain("bd dep add bd-5 bd-4")
  })

  it("creates missing terminal beads from the canonical bodies and prints the new ids", async () => {
    const { bin, log } = await fixture([{ id: "bd-2", title: "Implement widget" }])

    const result = await run(script, ["bd-1"], { PATH: `${bin}:${Bun.env.PATH}` })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("review: new-1")
    expect(result.stdout).toContain("report: new-2")
    const calls = await readFile(log, "utf8")
    expect(calls).toContain("bd create Review -t task --parent bd-1 --no-inherit-labels --body-file")
    expect(calls).toContain("review-bead.md --silent")
    expect(calls).toContain(
      "bd create Write build report -t task --parent bd-1 --no-inherit-labels --body-file",
    )
    expect(calls).toContain("report-bead.md --silent")
    expect(calls).toContain("bd dep add new-2 new-1")
  })
})
