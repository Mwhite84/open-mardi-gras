import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "bun:test"

import { configurePlugin, getWorkflowFiles } from "../src/cli/setup"

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  )
})

describe("getWorkflowFiles", () => {
  it("returns every file under opencode recursively in stable order", async () => {
    const root = await mkdtemp(join(tmpdir(), "omg-setup-"))
    tempDirs.push(root)

    await mkdir(join(root, "commands"), { recursive: true })
    await mkdir(join(root, "agents"), { recursive: true })
    await mkdir(join(root, "skills", "omg-commands"), { recursive: true })
    await mkdir(join(root, "unrelated"), { recursive: true })

    await writeFile(join(root, "commands", "omg-zeta.md"), "zeta\n")
    await writeFile(join(root, "commands", "omg-alpha.md"), "alpha\n")
    await writeFile(join(root, "agents", "omg-build.md"), "build\n")
    await writeFile(join(root, "skills", "omg-commands", "SKILL.md"), "skill\n")
    await writeFile(join(root, "unrelated", "not-an-instrument.md"), "ignore\n")

    expect(getWorkflowFiles(root)).toEqual([
      "agents/omg-build.md",
      "commands/omg-alpha.md",
      "commands/omg-zeta.md",
      "skills/omg-commands/SKILL.md",
    ])
  })
})

describe("configurePlugin", () => {
  it("creates .opencode/opencode.json with the plugin", async () => {
    const root = await mkdtemp(join(tmpdir(), "omg-setup-"))
    tempDirs.push(root)
    const destRoot = join(root, ".opencode")

    expect(configurePlugin(destRoot)).toBe("added")

    expect(JSON.parse(await readFile(join(destRoot, "opencode.json"), "utf-8"))).toEqual({
      $schema: "https://opencode.ai/config.json",
      plugin: ["@toady00/open-mardi-gras"],
    })
  })

  it("preserves existing config while adding the plugin", async () => {
    const root = await mkdtemp(join(tmpdir(), "omg-setup-"))
    tempDirs.push(root)
    const destRoot = join(root, ".opencode")
    await mkdir(destRoot)
    await writeFile(
      join(destRoot, "opencode.json"),
      JSON.stringify({ model: "provider/model", plugin: ["another-plugin"] }),
    )

    expect(configurePlugin(destRoot)).toBe("added")

    expect(JSON.parse(await readFile(join(destRoot, "opencode.json"), "utf-8"))).toEqual({
      model: "provider/model",
      plugin: ["another-plugin", "@toady00/open-mardi-gras"],
      $schema: "https://opencode.ai/config.json",
    })
  })

  it("does not duplicate an existing pinned plugin entry", async () => {
    const root = await mkdtemp(join(tmpdir(), "omg-setup-"))
    tempDirs.push(root)
    const destRoot = join(root, ".opencode")
    const config = {
      $schema: "https://opencode.ai/config.json",
      plugin: ["@toady00/open-mardi-gras@0.4.2"],
    }
    await mkdir(destRoot)
    await writeFile(join(destRoot, "opencode.json"), JSON.stringify(config))

    expect(configurePlugin(destRoot)).toBe("present")
    expect(JSON.parse(await readFile(join(destRoot, "opencode.json"), "utf-8"))).toEqual(config)
  })
})
