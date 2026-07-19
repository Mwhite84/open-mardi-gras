import { chmod, copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "bun:test"

const script = join(
  import.meta.dir,
  "..",
  "opencode",
  "skills",
  "omg-misc",
  "scripts",
  "decompose-mint.sh",
)
const tempDirs: string[] = []

// The script shells out to yq/jq for frontmatter parsing; skip (rather than
// fail confusingly) when they are absent from the environment.
const toolsAvailable = Bun.which("yq") !== null && Bun.which("jq") !== null

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

type Adr = { name: string; content: string }

// Stand up a temp docs tree plus a fake `bd` on PATH that logs every
// invocation, a fake resolve-workflow.sh pointing docs_root at the tree, and a
// fake resolve-decompose-spec.sh that passes the spec path through. The real
// decompose-mint.sh is copied beside the fakes so its sibling/relative lookups
// resolve to them instead of the repo's real helpers.
async function fixture(adrs: Adr[]) {
  const root = await mkdtemp(join(tmpdir(), "omg-decompose-mint-"))
  tempDirs.push(root)
  const bin = join(root, "bin")
  const scripts = join(root, "scripts")
  const docs = join(root, "docs")
  await Promise.all([mkdir(bin), mkdir(scripts), mkdir(docs)])

  const log = join(root, "bd.log")
  const countFile = join(root, "create.count")
  await writeFile(log, "")
  await writeFile(
    join(bin, "bd"),
    `#!/usr/bin/env bash
printf 'bd %s\\n' "$*" >> '${log}'
case "$1" in
  list) printf '[]\\n' ;;
  create)
    cat > /dev/null
    n="$(cat '${countFile}' 2>/dev/null || echo 0)"
    n=$((n + 1))
    printf '%s\\n' "$n" > '${countFile}'
    printf 'new-%s\\n' "$n"
    ;;
esac
exit 0
`,
  )
  await chmod(join(bin, "bd"), 0o755)

  await writeFile(
    join(bin, "resolve-workflow.sh"),
    `#!/usr/bin/env bash
case "$1" in
  test) printf 'true\\n' ;;
  docs_root) printf '%s\\n' '${docs}' ;;
  *) exit 1 ;;
esac
`,
  )
  await chmod(join(bin, "resolve-workflow.sh"), 0o755)

  const mint = join(scripts, "decompose-mint.sh")
  await copyFile(script, mint)
  await chmod(mint, 0o755)
  await writeFile(
    join(scripts, "resolve-decompose-spec.sh"),
    `#!/usr/bin/env bash
printf '%s\\n' "$1"
`,
  )
  await chmod(join(scripts, "resolve-decompose-spec.sh"), 0o755)

  const spec = join(docs, "spec.md")
  await writeFile(
    spec,
    `---
id: spec.title-test
title: Title Test Spec
---

# Title Test Spec

Spec body.
`,
  )
  await Promise.all(adrs.map((adr) => writeFile(join(docs, adr.name), adr.content)))
  return { bin, log, mint, spec }
}

async function run(mint: string, spec: string, bin: string) {
  const process = Bun.spawn(["/bin/bash", mint, spec], {
    env: { ...Bun.env, PATH: `${bin}:${Bun.env.PATH}` },
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

describe("decompose-mint.sh ADR bead titles", () => {
  it.skipIf(!toolsAvailable)("uses the frontmatter title verbatim when present", async () => {
    const { bin, log, mint, spec } = await fixture([
      {
        name: "adr-with-title.md",
        content: `---
id: adr.with-title
type: adr
produced_for: spec.title-test
title: Chosen By Frontmatter
---

# Some Other Body Heading

Decision body.
`,
      },
    ])

    const result = await run(mint, spec, bin)

    expect(result.exitCode).toBe(0)
    const calls = await readFile(log, "utf8")
    expect(calls).toContain("bd create ADR: Chosen By Frontmatter -t adr --spec-id adr.with-title")
    expect(calls).not.toContain("ADR: null")
  })

  it.skipIf(!toolsAvailable)(
    "falls back to the body's first heading when the title is absent",
    async () => {
      const { bin, log, mint, spec } = await fixture([
        {
          name: "adr-heading-only.md",
          content: `---
id: adr.heading-only
type: adr
produced_for: spec.title-test
---

# Heading Fallback Title

Decision body.
`,
        },
      ])

      const result = await run(mint, spec, bin)

      expect(result.exitCode).toBe(0)
      const calls = await readFile(log, "utf8")
      expect(calls).toContain("bd create ADR: Heading Fallback Title -t adr --spec-id adr.heading-only")
      expect(calls).not.toContain("ADR: null")
    },
  )

  it.skipIf(!toolsAvailable)(
    "falls back to the ADR id when neither title nor heading exists",
    async () => {
      const { bin, log, mint, spec } = await fixture([
        {
          name: "adr-bare.md",
          content: `---
id: adr.bare
type: adr
produced_for: spec.title-test
---

Plain body without any heading.
`,
        },
      ])

      const result = await run(mint, spec, bin)

      expect(result.exitCode).toBe(0)
      const calls = await readFile(log, "utf8")
      expect(calls).toContain("bd create ADR: adr.bare -t adr --spec-id adr.bare")
      expect(calls).not.toContain("ADR: null")
    },
  )
})
