import { describe, expect, it, mock } from "bun:test"
import type { PluginInput } from "@opencode-ai/plugin"
import { BeadsPlugin, collectBeadsEnv } from "./beads.js"

function createMockShell(primeOutput = "mock beads context") {
  const commitCalls: number[] = []
  const primeCalls: number[] = []
  let callCount = 0

  // The $ template tag returns an object with .quiet() and .text() methods
  const $ = (strings: TemplateStringsArray) => {
    const cmd = strings[0]
    callCount++
    if (cmd.includes("bd dolt commit")) {
      commitCalls.push(callCount)
      return { quiet: mock(() => Promise.resolve()) }
    }
    if (cmd.includes("bd prime")) {
      primeCalls.push(callCount)
      return { text: mock(() => Promise.resolve(primeOutput)) }
    }
    return {
      quiet: mock(() => Promise.resolve()),
      text: mock(() => Promise.resolve("")),
    }
  }

  return { $: $ as unknown as PluginInput["$"], commitCalls, primeCalls }
}

function createMockClient() {
  const logCalls: Array<{ level: string; message: string }> = []

  const client = {
    app: {
      log: mock(async (opts: any) => {
        logCalls.push({ level: opts.body.level, message: opts.body.message })
        return {}
      }),
    },
  } as unknown as PluginInput["client"]

  return { client, logCalls }
}

describe("BeadsPlugin", () => {
  it("returns a valid Plugin factory function", () => {
    const plugin = BeadsPlugin()
    expect(typeof plugin).toBe("function")
  })

  it("initializes and returns hooks", async () => {
    const { client } = createMockClient()
    const { $ } = createMockShell()
    const plugin = BeadsPlugin()
    const hooks = await plugin({
      client,
      $,
      directory: "/tmp",
    } as unknown as PluginInput)
    expect(hooks).toBeDefined()
    expect(hooks["experimental.chat.system.transform"]).toBeDefined()
    expect(hooks.event).toBeDefined()
    expect(hooks["shell.env"]).toBeDefined()
    // Should NOT have chat.message (we moved to system.transform)
    expect(hooks["chat.message"]).toBeUndefined()
  })

  describe("experimental.chat.system.transform", () => {
    it("appends beads context to system prompt on first call", async () => {
      const { client } = createMockClient()
      const { $ } = createMockShell("beads prime output")
      const plugin = BeadsPlugin()
      const hooks = await plugin({
        client,
        $,
        directory: "/tmp",
      } as unknown as PluginInput)

      const system: string[] = ["existing system prompt"]
      await hooks["experimental.chat.system.transform"]!(
        { sessionID: "s1" } as any,
        { system },
      )

      expect(system.length).toBe(2)
      expect(system[0]).toBe("existing system prompt")
      expect(system[1]).toContain("<beads-context>")
      expect(system[1]).toContain("beads prime output")
      expect(system[1]).toContain("<beads-guidance>")
    })

    it("caches context and reuses on subsequent calls", async () => {
      const { client } = createMockClient()
      const { $, primeCalls } = createMockShell("cached output")
      const plugin = BeadsPlugin()
      const hooks = await plugin({
        client,
        $,
        directory: "/tmp",
      } as unknown as PluginInput)

      const system1: string[] = []
      const system2: string[] = []
      await hooks["experimental.chat.system.transform"]!(
        { sessionID: "s1" } as any,
        { system: system1 },
      )
      await hooks["experimental.chat.system.transform"]!(
        { sessionID: "s1" } as any,
        { system: system2 },
      )

      // bd prime should only be called once (cached)
      expect(primeCalls.length).toBe(1)
      // Both calls should have the context appended
      expect(system1.length).toBe(1)
      expect(system2.length).toBe(1)
      expect(system1[0]).toContain("cached output")
      expect(system2[0]).toContain("cached output")
    })

    it("handles different sessions independently", async () => {
      const { client } = createMockClient()
      const { $, primeCalls } = createMockShell("session context")
      const plugin = BeadsPlugin()
      const hooks = await plugin({
        client,
        $,
        directory: "/tmp",
      } as unknown as PluginInput)

      const system1: string[] = []
      const system2: string[] = []
      await hooks["experimental.chat.system.transform"]!(
        { sessionID: "s1" } as any,
        { system: system1 },
      )
      await hooks["experimental.chat.system.transform"]!(
        { sessionID: "s2" } as any,
        { system: system2 },
      )

      // Each session triggers its own bd prime call
      expect(primeCalls.length).toBe(2)
      expect(system1.length).toBe(1)
      expect(system2.length).toBe(1)
    })

    it("does not append when bd prime returns empty", async () => {
      const { client } = createMockClient()
      const { $ } = createMockShell("")
      const plugin = BeadsPlugin()
      const hooks = await plugin({
        client,
        $,
        directory: "/tmp",
      } as unknown as PluginInput)

      const system: string[] = ["existing"]
      await hooks["experimental.chat.system.transform"]!(
        { sessionID: "s1" } as any,
        { system },
      )

      // Should not have appended anything
      expect(system.length).toBe(1)
      expect(system[0]).toBe("existing")
    })

    it("skips when sessionID is missing", async () => {
      const { client } = createMockClient()
      const { $, primeCalls } = createMockShell("output")
      const plugin = BeadsPlugin()
      const hooks = await plugin({
        client,
        $,
        directory: "/tmp",
      } as unknown as PluginInput)

      const system: string[] = []
      await hooks["experimental.chat.system.transform"]!(
        {} as any,
        { system },
      )

      expect(primeCalls.length).toBe(0)
      expect(system.length).toBe(0)
    })
  })

  describe("event: session.idle", () => {
    it("runs bd dolt commit on session idle", async () => {
      const { client } = createMockClient()
      const { $, commitCalls } = createMockShell()
      const plugin = BeadsPlugin()
      const hooks = await plugin({
        client,
        $,
        directory: "/tmp",
      } as unknown as PluginInput)

      await hooks.event!({
        event: {
          type: "session.idle",
          properties: { sessionID: "s1" },
        },
      } as any)

      expect(commitCalls.length).toBeGreaterThan(0)
    })
  })

  describe("event: session.compacted", () => {
    it("refreshes context on next system.transform after compaction", async () => {
      const { client } = createMockClient()
      const { $, primeCalls } = createMockShell("prime output")
      const plugin = BeadsPlugin()
      const hooks = await plugin({
        client,
        $,
        directory: "/tmp",
      } as unknown as PluginInput)

      // First system.transform — fetches and caches
      const system1: string[] = []
      await hooks["experimental.chat.system.transform"]!(
        { sessionID: "s1" } as any,
        { system: system1 },
      )
      expect(primeCalls.length).toBe(1)

      // Trigger compaction
      await hooks.event!({
        event: {
          type: "session.compacted",
          properties: { sessionID: "s1" },
        },
      } as any)

      // Next system.transform should re-fetch (cache was invalidated)
      const system2: string[] = []
      await hooks["experimental.chat.system.transform"]!(
        { sessionID: "s1" } as any,
        { system: system2 },
      )

      // bd prime called twice: once initial, once after compaction refresh
      expect(primeCalls.length).toBe(2)
      expect(system2.length).toBe(1)
      expect(system2[0]).toContain("<beads-context>")
    })
  })

  describe("error handling", () => {
    it("does not throw when bd commands fail", async () => {
      const { client, logCalls } = createMockClient()
      const failingShell = ((_strings: TemplateStringsArray) => {
        return {
          quiet: () => Promise.reject(new Error("bd not found")),
          text: () => Promise.reject(new Error("bd not found")),
        }
      }) as unknown as PluginInput["$"]

      const plugin = BeadsPlugin()
      const hooks = await plugin({
        client,
        $: failingShell,
        directory: "/tmp",
      } as unknown as PluginInput)

      // system.transform should not throw
      const system: string[] = []
      await hooks["experimental.chat.system.transform"]!(
        { sessionID: "s1" } as any,
        { system },
      )
      // Nothing appended since bd failed
      expect(system.length).toBe(0)

      // idle event should not throw
      const logCountBefore = logCalls.length
      await hooks.event!({
        event: {
          type: "session.idle",
          properties: { sessionID: "s1" },
        },
      } as any)

      // idle handler should log a warning when bd dolt commit fails
      const idleLogs = logCalls.slice(logCountBefore)
      const warnings = idleLogs.filter((l) => l.level === "warn")
      expect(warnings.length).toBeGreaterThan(0)
      expect(warnings[0].message).toContain("idle flush failed")
    })

    it("caches empty result on failure to avoid retrying every call", async () => {
      const { client } = createMockClient()
      let callCount = 0
      const failingShell = ((_strings: TemplateStringsArray) => {
        callCount++
        return {
          quiet: () => Promise.reject(new Error("bd not found")),
          text: () => Promise.reject(new Error("bd not found")),
        }
      }) as unknown as PluginInput["$"]

      const plugin = BeadsPlugin()
      const hooks = await plugin({
        client,
        $: failingShell,
        directory: "/tmp",
      } as unknown as PluginInput)

      const system1: string[] = []
      const system2: string[] = []
      await hooks["experimental.chat.system.transform"]!(
        { sessionID: "s1" } as any,
        { system: system1 },
      )
      const callsAfterFirst = callCount
      await hooks["experimental.chat.system.transform"]!(
        { sessionID: "s1" } as any,
        { system: system2 },
      )

      // Second call should not invoke shell again (cached empty)
      expect(callCount).toBe(callsAfterFirst)
    })
  })

  describe("collectBeadsEnv", () => {
    it("collects only BEADS_* vars with defined values", () => {
      const result = collectBeadsEnv({
        BEADS_DOLT_SERVER_HOST: "beads.example.com",
        BEADS_DOLT_PASSWORD: "secret",
        BEADS_DIR: "/path/.beads",
        PATH: "/usr/bin",
        HOME: "/home/user",
        BEADS_UNSET: undefined,
      })

      expect(result).toEqual({
        BEADS_DOLT_SERVER_HOST: "beads.example.com",
        BEADS_DOLT_PASSWORD: "secret",
        BEADS_DIR: "/path/.beads",
      })
      expect(result.PATH).toBeUndefined()
      expect(result.HOME).toBeUndefined()
      expect("BEADS_UNSET" in result).toBe(false)
    })

    it("returns empty object when no BEADS_* vars present", () => {
      expect(collectBeadsEnv({ PATH: "/usr/bin" })).toEqual({})
    })
  })

  describe("shell.env", () => {
    it("forwards all BEADS_* vars into the shell environment", async () => {
      const { client } = createMockClient()
      const { $ } = createMockShell()
      const plugin = BeadsPlugin()
      const hooks = await plugin({
        client,
        $,
        directory: "/tmp",
      } as unknown as PluginInput)

      const original = { ...process.env }
      try {
        process.env.BEADS_DOLT_SERVER_HOST = "beads.example.com"
        process.env.BEADS_DOLT_PASSWORD = "secret"
        process.env.BEADS_DIR = "/path/.beads"

        const env: Record<string, string> = {}
        await hooks["shell.env"]!(
          { cwd: "/tmp" } as any,
          { env },
        )

        expect(env.BEADS_DOLT_SERVER_HOST).toBe("beads.example.com")
        expect(env.BEADS_DOLT_PASSWORD).toBe("secret")
        expect(env.BEADS_DIR).toBe("/path/.beads")
      } finally {
        for (const k of ["BEADS_DOLT_SERVER_HOST", "BEADS_DOLT_PASSWORD", "BEADS_DIR"]) {
          if (original[k] === undefined) delete process.env[k]
          else process.env[k] = original[k]
        }
      }
    })

    it("does not overwrite a value the shell already carries", async () => {
      const { client } = createMockClient()
      const { $ } = createMockShell()
      const plugin = BeadsPlugin()
      const hooks = await plugin({
        client,
        $,
        directory: "/tmp",
      } as unknown as PluginInput)

      const original = { ...process.env }
      try {
        process.env.BEADS_DOLT_SERVER_HOST = "from-process"

        const env: Record<string, string> = {
          BEADS_DOLT_SERVER_HOST: "already-set",
        }
        await hooks["shell.env"]!(
          { cwd: "/tmp" } as any,
          { env },
        )

        // Existing value preserved, not clobbered by the primary's env
        expect(env.BEADS_DOLT_SERVER_HOST).toBe("already-set")
      } finally {
        if (original.BEADS_DOLT_SERVER_HOST === undefined)
          delete process.env.BEADS_DOLT_SERVER_HOST
        else process.env.BEADS_DOLT_SERVER_HOST = original.BEADS_DOLT_SERVER_HOST
      }
    })

    it("does not throw when no BEADS_* vars are present", async () => {
      const { client } = createMockClient()
      const { $ } = createMockShell()
      const plugin = BeadsPlugin()
      const hooks = await plugin({
        client,
        $,
        directory: "/tmp",
      } as unknown as PluginInput)

      const env: Record<string, string> = {}
      const result = await hooks["shell.env"]!({ cwd: "/tmp" } as any, { env })
      expect(result).toBeUndefined()
    })
  })
})
