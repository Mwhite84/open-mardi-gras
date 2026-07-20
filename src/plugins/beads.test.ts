import { describe, expect, it, mock } from "bun:test"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { PluginInput } from "@opencode-ai/plugin"
import { BeadsPlugin, collectBeadsEnv } from "./beads.js"

let nextID = 0

async function stateDirectory(): Promise<string> {
  return mkdtemp(join(tmpdir(), `omg-beads-${nextID++}-`))
}

function createMockShell(options?: {
  ready?: Record<string, string>
  readyError?: Error
  readyPromise?: Promise<string>
  commitError?: Error
}) {
  const commands: string[] = []

  const $ = (strings: TemplateStringsArray, ...values: unknown[]) => {
    const command = strings.reduce(
      (result, part, index) => result + part + (index < values.length ? String(values[index]) : ""),
      "",
    )
    commands.push(command)

    if (command.startsWith("bd ready")) {
      const epicID = String(values[0])
      return {
        text: mock(() => {
          if (options?.readyError) return Promise.reject(options.readyError)
          if (options?.readyPromise) return options.readyPromise
          return Promise.resolve(options?.ready?.[epicID] ?? "[]")
        }),
        quiet: mock(() => Promise.resolve()),
      }
    }

    return {
      text: mock(() => Promise.resolve("")),
      quiet: mock(() =>
        options?.commitError ? Promise.reject(options.commitError) : Promise.resolve(),
      ),
    }
  }

  return { $: $ as unknown as PluginInput["$"], commands }
}

function createMockClient(options?: { promptError?: Error; abortError?: Error }) {
  const logs: Array<{ level: string; message: string }> = []
  const prompts: Array<{ sessionID: string; agent?: string; text: string }> = []
  const aborts: string[] = []
  const client = {
    app: {
      log: mock(async (input: { body: { level: string; message: string } }) => {
        logs.push(input.body)
        return {}
      }),
    },
    session: {
      promptAsync: mock(async (input: { path: { id: string }; body: { agent?: string; parts: Array<{ text: string }> } }) => {
        if (options?.promptError) throw options.promptError
        prompts.push({
          sessionID: input.path.id,
          agent: input.body.agent,
          text: input.body.parts[0].text,
        })
        return { data: undefined }
      }),
      abort: mock(async (input: { path: { id: string } }) => {
        aborts.push(input.path.id)
        if (options?.abortError) throw options.abortError
        return { data: true }
      }),
    },
  } as unknown as PluginInput["client"]

  return { client, logs, prompts, aborts }
}

async function createHooks(options?: {
  stateDirectory?: string
  ready?: Record<string, string>
  readyError?: Error
  readyPromise?: Promise<string>
  commitError?: Error
  promptError?: Error
  abortError?: Error
}) {
  const state = options?.stateDirectory ?? (await stateDirectory())
  const shell = createMockShell(options)
  const client = createMockClient(options)
  const hooks = await BeadsPlugin({ stateDirectory: state })({
    client: client.client,
    $: shell.$,
    directory: "/project",
  } as unknown as PluginInput)
  return { hooks, state, ...shell, ...client }
}

async function runBuild(
  hooks: Awaited<ReturnType<typeof createHooks>>["hooks"],
  sessionID: string,
  epicID: string,
) {
  await hooks["command.execute.before"]!(
    { command: "omg-build", sessionID, arguments: epicID },
    { parts: [] },
  )
}

async function idle(
  hooks: Awaited<ReturnType<typeof createHooks>>["hooks"],
  sessionID: string,
) {
  await hooks.event!({
    event: { type: "session.idle", properties: { sessionID } },
  } as any)
  await Bun.sleep(0)
}

describe("BeadsPlugin", () => {
  it("does not expose a system transform or invoke bd prime", async () => {
    const { hooks, commands } = await createHooks()
    expect(hooks["experimental.chat.system.transform"]).toBeUndefined()
    expect(commands.some((command) => command.includes("bd prime"))).toBe(false)
  })

  it("nudges only an omg-build owner with ready work", async () => {
    const { hooks, prompts, commands } = await createHooks({
      ready: { "omg-epic": '[{"id":"omg-work"}]' },
    })
    await hooks["command.execute.before"]!(
      { command: "other", sessionID: "other-session", arguments: "omg-epic" },
      { parts: [] },
    )
    await idle(hooks, "other-session")
    await runBuild(hooks, "foreman-session", "omg-epic")
    await idle(hooks, "foreman-session")

    expect(prompts).toHaveLength(1)
    expect(prompts[0]).toEqual({
      sessionID: "foreman-session",
      agent: "omg-foreman",
      text: expect.stringContaining("bd ready --parent omg-epic --json"),
    })
    expect(commands).toContain("bd ready --parent omg-epic --json")
  })

  it("does not nudge after a valid empty ready queue", async () => {
    const { hooks, prompts } = await createHooks({ ready: { "omg-empty": "[]" } })
    await runBuild(hooks, "empty-session", "omg-empty")
    await idle(hooks, "empty-session")
    expect(prompts).toHaveLength(0)
  })

  it("rejects a missing or unsafe epic id", async () => {
    const { hooks, logs, commands } = await createHooks()
    await hooks["command.execute.before"]!(
      { command: "omg-build", sessionID: "bad-session", arguments: "$(unsafe)" },
      { parts: [] },
    )
    await idle(hooks, "bad-session")
    expect(commands.some((command) => command.startsWith("bd ready"))).toBe(false)
    expect(logs.some((log) => log.message.includes("requires a valid epic id"))).toBe(true)
  })

  it("keeps failures and invalid JSON from nudging", async () => {
    const invalid = await createHooks({ ready: { "omg-invalid": "not-json" } })
    await runBuild(invalid.hooks, "invalid-session", "omg-invalid")
    await idle(invalid.hooks, "invalid-session")
    expect(invalid.prompts).toHaveLength(0)
    expect(invalid.logs.some((log) => log.message.includes("invalid bd ready JSON"))).toBe(true)

    const failed = await createHooks({ readyError: new Error("bd unavailable") })
    await runBuild(failed.hooks, "failed-session", "omg-failed")
    await idle(failed.hooks, "failed-session")
    expect(failed.prompts).toHaveLength(0)
    expect(failed.logs.some((log) => log.message.includes("readiness check failed"))).toBe(true)

    const nonArray = await createHooks({ ready: { "omg-object": "{}" } })
    await runBuild(nonArray.hooks, "object-session", "omg-object")
    await idle(nonArray.hooks, "object-session")
    expect(nonArray.prompts).toHaveLength(0)
    expect(nonArray.logs.some((log) => log.message.includes("non-array JSON"))).toBe(true)

    const promptFailure = await createHooks({
      ready: { "omg-prompt": '[{"id":"work"}]' },
      promptError: new Error("session unavailable"),
    })
    await runBuild(promptFailure.hooks, "prompt-session", "omg-prompt")
    await idle(promptFailure.hooks, "prompt-session")
    expect(promptFailure.logs.some((log) => log.message.includes("readiness check failed"))).toBe(true)
  })

  it("deduplicates concurrent idle readiness checks", async () => {
    let resolveReady!: (value: string) => void
    const readyPromise = new Promise<string>((resolve) => {
      resolveReady = resolve
    })
    const fixture = await createHooks({ readyPromise })
    await runBuild(fixture.hooks, "concurrent-session", "omg-concurrent")

    await Promise.all([
      fixture.hooks.event!({ event: { type: "session.idle", properties: { sessionID: "concurrent-session" } } } as any),
      fixture.hooks.event!({ event: { type: "session.idle", properties: { sessionID: "concurrent-session" } } } as any),
    ])
    resolveReady('[{"id":"work"}]')
    await Bun.sleep(0)

    expect(fixture.commands.filter((command) => command.startsWith("bd ready"))).toHaveLength(1)
    expect(fixture.prompts).toHaveLength(1)
  })

  it("restores an owner without running it until that session becomes idle", async () => {
    const state = await stateDirectory()
    const first = await createHooks({ stateDirectory: state })
    await runBuild(first.hooks, "restored-session", "omg-restored")

    const second = await createHooks({
      stateDirectory: state,
      ready: { "omg-restored": '[{"id":"work"}]' },
    })
    await Bun.sleep(10)

    expect(second.commands.some((command) => command.startsWith("bd ready"))).toBe(false)
    expect(second.prompts).toHaveLength(0)

    await idle(second.hooks, "restored-session")

    expect(second.prompts).toHaveLength(1)
    expect(second.prompts[0].sessionID).toBe("restored-session")
  })

  it("transfers an epic to a fresh session and aborts the previous owner", async () => {
    const fixture = await createHooks({ ready: { "omg-transfer": '[{"id":"work"}]' } })
    await runBuild(fixture.hooks, "old-session", "omg-transfer")
    await runBuild(fixture.hooks, "new-session", "omg-transfer")
    await idle(fixture.hooks, "old-session")
    await idle(fixture.hooks, "new-session")

    expect(fixture.aborts).toEqual(["old-session"])
    expect(fixture.prompts).toHaveLength(1)
    expect(fixture.prompts[0].sessionID).toBe("new-session")
  })

  it("removes ownership when its session is deleted", async () => {
    const state = await stateDirectory()
    const first = await createHooks({ stateDirectory: state })
    await runBuild(first.hooks, "deleted-session", "omg-deleted")
    await first.hooks.event!({
      event: { type: "session.deleted", properties: { info: { id: "deleted-session" } } },
    } as any)

    const second = await createHooks({
      stateDirectory: state,
      ready: { "omg-deleted": '[{"id":"work"}]' },
    })
    await Bun.sleep(10)
    await idle(second.hooks, "deleted-session")
    expect(second.prompts).toHaveLength(0)
  })

  it("flushes on idle and treats flush errors as warnings", async () => {
    const fixture = await createHooks({ commitError: new Error("commit failed") })
    await idle(fixture.hooks, "plain-session")
    expect(fixture.commands).toContain("bd dolt commit")
    expect(fixture.logs.some((log) => log.message.includes("idle flush failed"))).toBe(true)
  })

  describe("collectBeadsEnv", () => {
    it("collects only defined BEADS_* values", () => {
      expect(
        collectBeadsEnv({
          BEADS_DOLT_SERVER_HOST: "beads.example.com",
          BEADS_DOLT_PASSWORD: "secret",
          PATH: "/usr/bin",
          BEADS_UNSET: undefined,
        }),
      ).toEqual({
        BEADS_DOLT_SERVER_HOST: "beads.example.com",
        BEADS_DOLT_PASSWORD: "secret",
      })
    })
  })

  it("forwards BEADS_* values without overwriting existing shell values", async () => {
    const { hooks } = await createHooks()
    const original = process.env.BEADS_DOLT_SERVER_HOST
    try {
      process.env.BEADS_DOLT_SERVER_HOST = "from-process"
      const env = { BEADS_DOLT_SERVER_HOST: "already-set" }
      await hooks["shell.env"]!({ cwd: "/tmp" }, { env })
      expect(env.BEADS_DOLT_SERVER_HOST).toBe("already-set")
    } finally {
      if (original === undefined) delete process.env.BEADS_DOLT_SERVER_HOST
      else process.env.BEADS_DOLT_SERVER_HOST = original
    }
  })
})
