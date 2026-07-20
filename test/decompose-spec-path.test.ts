import { chmod, mkdtemp, mkdir, realpath, rm, writeFile } from "node:fs/promises"
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
  "resolve-decompose-spec.sh",
)
const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function fixture(mode: "solo" | "satellite") {
  const root = await mkdtemp(join(tmpdir(), "omg-decompose-"))
  tempDirs.push(root)
  const local = join(root, "local")
  const central = join(root, "central")
  const resolver = join(root, "resolve-workflow.sh")
  await mkdir(local)
  await mkdir(central)
  await writeFile(
    resolver,
    `#!/usr/bin/env bash
case "$1" in
  mode) printf '%s\\n' '${mode}' ;;
  central_repo) printf '%s\\n' '${central}' ;;
  *) exit 1 ;;
esac
`,
  )
  await chmod(resolver, 0o755)
  return { central, local, resolver }
}

async function resolve(cwd: string, resolver: string, input: string) {
  const process = Bun.spawn([script, input, resolver], { cwd, stdout: "pipe", stderr: "pipe" })
  const [exitCode, stdout, stderr] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ])
  return { exitCode, stderr, stdout }
}

describe("resolve-decompose-spec.sh", () => {
  it("resolves @-prefixed local files before consulting the central repo", async () => {
    const { central, local, resolver } = await fixture("satellite")
    await mkdir(join(local, "docs"))
    await mkdir(join(central, "docs"))
    await writeFile(join(local, "docs", "spec.md"), "local")
    await writeFile(join(central, "docs", "spec.md"), "central")

    const process = await resolve(local, resolver, "@docs/spec.md")

    expect(process.exitCode).toBe(0)
    expect(process.stdout.trim()).toBe(await realpath(join(local, "docs", "spec.md")))
  })

  it("accepts an existing absolute path", async () => {
    const { local, resolver } = await fixture("solo")
    const spec = join(local, "spec.md")
    await writeFile(spec, "local")

    const process = await resolve(local, resolver, spec)

    expect(process.exitCode).toBe(0)
    expect(process.stdout.trim()).toBe(await realpath(spec))
  })

  it("resolves a missing relative path from the satellite central repo", async () => {
    const { central, local, resolver } = await fixture("satellite")
    await mkdir(join(central, "docs"))
    await writeFile(join(central, "docs", "spec.md"), "central")

    const process = await resolve(local, resolver, "docs/spec.md")

    expect(process.exitCode).toBe(0)
    expect(process.stdout.trim()).toBe(await realpath(join(central, "docs", "spec.md")))
  })

  it("names local and central attempted locations when neither exists", async () => {
    const { central, local, resolver } = await fixture("satellite")

    const process = await resolve(local, resolver, "docs/missing.md")

    expect(process.exitCode).toBe(1)
    expect(process.stderr).toContain("attempted: docs/missing.md")
    expect(process.stderr).toContain(join(central, "docs", "missing.md"))
  })
})
