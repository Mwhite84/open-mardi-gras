import { describe, expect, it, mock } from "bun:test"
import { mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { PluginInput } from "@opencode-ai/plugin"
import { coordinator } from "../coordination.js"
import { ThenChainingPlugin } from "./then-chaining.js"

describe("ThenChainingPlugin foreman gate", () => {
  it("does not dispatch a follow-up until the session gate opens", async () => {
    const directory = await mkdtemp(join(tmpdir(), "omg-chain-gate-"))
    const commandsDirectory = join(directory, ".opencode", "commands")
    await mkdir(commandsDirectory, { recursive: true })
    await writeFile(
      join(commandsDirectory, "build.md"),
      "---\nthen: /follow-up\n---\nBuild the epic.\n",
      "utf8",
    )

    const blocked = new Set(["gated-foreman"])
    const commandCalls: string[] = []
    coordinator.registerChainGate({ isChainBlocked: (sessionID) => blocked.has(sessionID) })

    const client = {
      app: { log: mock(async () => ({})) },
      session: {
        command: mock(async (input: { body: { command: string } }) => {
          commandCalls.push(input.body.command)
          return { data: { info: {}, parts: [] } }
        }),
      },
    } as unknown as PluginInput["client"]
    const hooks = await ThenChainingPlugin()({ client, directory } as unknown as PluginInput)

    await hooks["command.execute.before"]!(
      { command: "build", sessionID: "gated-foreman", arguments: "" },
      { parts: [] },
    )
    await hooks.event!({
      event: { type: "session.idle", properties: { sessionID: "gated-foreman" } },
    } as any)
    expect(commandCalls).toHaveLength(0)

    blocked.delete("gated-foreman")
    coordinator.notifyChainUnblocked("gated-foreman")
    await Bun.sleep(0)
    expect(commandCalls).toEqual(["follow-up"])
  })
})
