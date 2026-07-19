import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "bun:test"

import { configurePlugin, copyWorkflowFile, getWorkflowFiles } from "../src/cli/setup"

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

describe("copyWorkflowFile", () => {
  it("makes copied shell scripts executable", async () => {
    const root = await mkdtemp(join(tmpdir(), "omg-setup-"))
    tempDirs.push(root)
    const sourceRoot = join(root, "source")
    const destRoot = join(root, "destination")
    const file = join("skills", "example", "script.sh")
    await mkdir(join(sourceRoot, "skills", "example"), { recursive: true })
    await writeFile(join(sourceRoot, file), "#!/bin/sh\n", { mode: 0o600 })

    copyWorkflowFile(sourceRoot, destRoot, file)

    expect((await stat(join(destRoot, file))).mode & 0o111).toBe(0o111)
  })

  it("does not make copied non-shell files executable", async () => {
    const root = await mkdtemp(join(tmpdir(), "omg-setup-"))
    tempDirs.push(root)
    const sourceRoot = join(root, "source")
    const destRoot = join(root, "destination")
    const file = join("skills", "example", "SKILL.md")
    await mkdir(join(sourceRoot, "skills", "example"), { recursive: true })
    await writeFile(join(sourceRoot, file), "# Example\n", { mode: 0o600 })

    copyWorkflowFile(sourceRoot, destRoot, file)

    expect((await stat(join(destRoot, file))).mode & 0o111).toBe(0)
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
    const original = `{
  "$schema": "https://opencode.ai/config.json",
  "disabled_providers": ["amazon-bedrock", "synthetic"],
  "agent": {
    "build":       {"model": "openai/gpt-5.6-terra-fast"},
    "omg-builder": {"model": "openai/gpt-5.6-terra-fast"}
  }
}
`
    await writeFile(join(destRoot, "opencode.json"), original)

    expect(configurePlugin(destRoot)).toBe("added")

    expect(await readFile(join(destRoot, "opencode.json"), "utf-8")).toBe(`{
  "$schema": "https://opencode.ai/config.json",
  "disabled_providers": ["amazon-bedrock", "synthetic"],
  "agent": {
    "build":       {"model": "openai/gpt-5.6-terra-fast"},
    "omg-builder": {"model": "openai/gpt-5.6-terra-fast"}
  },
  "plugin": ["@toady00/open-mardi-gras"]
}
`)
  })

  it("preserves formatting while appending to an existing plugin array", async () => {
    const root = await mkdtemp(join(tmpdir(), "omg-setup-"))
    tempDirs.push(root)
    const destRoot = join(root, ".opencode")
    const original = `{
  "plugin": [
    "another-plugin"
  ],
  "agent": {"build": {"model": "provider/model"}}
}
`
    await mkdir(destRoot)
    await writeFile(join(destRoot, "opencode.json"), original)

    expect(configurePlugin(destRoot)).toBe("added")
    expect(await readFile(join(destRoot, "opencode.json"), "utf-8")).toBe(`{
  "plugin": [
    "another-plugin",
    "@toady00/open-mardi-gras"
  ],
  "agent": {"build": {"model": "provider/model"}}
}
`)
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
