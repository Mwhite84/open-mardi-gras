/**
 * BeadsPlugin integrates durable Beads workflow state with OpenCode.
 *
 * It deliberately does not inject `bd prime` or any other blanket context.
 * Agent skills own command guidance. The plugin owns environment propagation,
 * persistence flushing, and keeping an `/omg-build` foreman moving while its
 * epic still has ready work.
 */

import { createHash, randomUUID } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import type { Plugin } from "@opencode-ai/plugin"
import { coordinator } from "../coordination.js"
import { createPluginLogger, type PluginLogger } from "../logging.js"

type ShellCommand = {
  quiet(): Promise<unknown>
  text(): Promise<string>
}

type Shell = (strings: TemplateStringsArray, ...values: unknown[]) => ShellCommand

type PersistedState = {
  version: 1
  owners: Record<string, string>
}

export interface BeadsPluginConfig {
  /** Override the runtime state directory. Primarily useful for isolated installations and tests. */
  stateDirectory?: string
}

export function collectBeadsEnv(
  source: Record<string, string | undefined> = process.env,
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(source)) {
    if (key.startsWith("BEADS_") && value !== undefined) result[key] = value
  }
  return result
}

function parseEpicID(argumentsValue: string): string | undefined {
  const value = argumentsValue.trim().split(/\s+/, 1)[0]
  if (!value) return undefined

  const unquoted =
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
      ? value.slice(1, -1)
      : value

  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(unquoted) ? unquoted : undefined
}

function stateFileFor(directory: string, stateDirectory?: string): string {
  const root =
    stateDirectory ??
    process.env.XDG_STATE_HOME ??
    join(homedir(), ".local", "state")
  const project = createHash("sha256").update(directory).digest("hex").slice(0, 24)
  return join(root, "open-mardi-gras", "beads", `${project}.json`)
}

async function loadOwners(file: string, logger: PluginLogger): Promise<Map<string, string>> {
  try {
    const parsed = JSON.parse(await readFile(file, "utf8")) as unknown
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("version" in parsed) ||
      parsed.version !== 1 ||
      !("owners" in parsed) ||
      typeof parsed.owners !== "object" ||
      parsed.owners === null
    ) {
      await logger("warn", "BeadsPlugin: ignored invalid persisted foreman state")
      return new Map()
    }

    return new Map(
      Object.entries(parsed.owners).filter(
        (entry): entry is [string, string] =>
          parseEpicID(entry[0]) === entry[0] && typeof entry[1] === "string",
      ),
    )
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "ENOENT") return new Map()
    await logger(
      "warn",
      `BeadsPlugin: failed to load foreman state: ${err instanceof Error ? err.message : String(err)}`,
    )
    return new Map()
  }
}

async function saveOwners(
  file: string,
  owners: Map<string, string>,
  logger: PluginLogger,
): Promise<void> {
  const state: PersistedState = {
    version: 1,
    owners: Object.fromEntries(owners),
  }
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`

  try {
    await mkdir(dirname(file), { recursive: true })
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8")
    await rename(temporary, file)
  } catch (err) {
    await logger(
      "warn",
      `BeadsPlugin: failed to persist foreman state: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}

export function BeadsPlugin(config?: BeadsPluginConfig): Plugin {
  return async ({ client, $, directory }) => {
    const shell = $ as unknown as Shell
    const logger = createPluginLogger(client)
    const stateFile = stateFileFor(directory, config?.stateDirectory)
    const ownersByEpic = await loadOwners(stateFile, logger)
    const epicBySession = new Map<string, string>()
    const blockedSessions = new Set<string>()
    const inFlight = new Set<string>()

    for (const [epicID, sessionID] of ownersByEpic) {
      epicBySession.set(sessionID, epicID)
      blockedSessions.add(sessionID)
    }

    coordinator.registerChainGate({
      isChainBlocked: (sessionID) => blockedSessions.has(sessionID),
    })

    async function persist(): Promise<void> {
      await saveOwners(stateFile, ownersByEpic, logger)
    }

    function releaseChain(sessionID: string): void {
      if (!blockedSessions.delete(sessionID)) return
      coordinator.notifyChainUnblocked(sessionID)
    }

    async function checkReady(sessionID: string): Promise<void> {
      const epicID = epicBySession.get(sessionID)
      if (!epicID || ownersByEpic.get(epicID) !== sessionID || inFlight.has(sessionID)) return

      inFlight.add(sessionID)
      try {
        const output = await shell`bd ready --parent ${epicID} --json`.text()
        let ready: unknown
        try {
          ready = JSON.parse(output)
        } catch (err) {
          await logger(
            "warn",
            `BeadsPlugin: invalid bd ready JSON for epic ${epicID}: ${err instanceof Error ? err.message : String(err)}`,
          )
          return
        }

        if (!Array.isArray(ready)) {
          await logger("warn", `BeadsPlugin: bd ready returned non-array JSON for epic ${epicID}`)
          return
        }

        // Ownership can transfer while bd is running. Never wake a stale owner.
        if (ownersByEpic.get(epicID) !== sessionID) return

        if (ready.length === 0) {
          releaseChain(sessionID)
          return
        }

        await client.session.promptAsync({
          path: { id: sessionID },
          body: {
            agent: "omg-foreman",
            parts: [
              {
                type: "text",
                text: `Epic ${epicID} still has ready beads. Continue the foreman loop now. Run bd ready --parent ${epicID} --json and dispatch the returned work. Do not yield while that ready queue is nonempty.`,
              },
            ],
          },
        })
        await logger("info", `BeadsPlugin: resumed foreman for epic ${epicID}`)
      } catch (err) {
        await logger(
          "warn",
          `BeadsPlugin: foreman readiness check failed: ${err instanceof Error ? err.message : String(err)}`,
        )
      } finally {
        inFlight.delete(sessionID)
      }
    }

    function scheduleReadyCheck(sessionID: string): void {
      void checkReady(sessionID).catch((err) =>
        logger(
          "warn",
          `BeadsPlugin: deferred readiness check failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      )
    }

    await logger("info", "BeadsPlugin initialized")

    return {
      "shell.env": async (_input, output) => {
        const beadsEnv = collectBeadsEnv()
        let injected = 0
        for (const [key, value] of Object.entries(beadsEnv)) {
          if (output.env[key] === undefined) {
            output.env[key] = value
            injected++
          }
        }
        if (injected > 0) {
          await logger("info", `BeadsPlugin: forwarded ${injected} BEADS_* env var(s) into shell`)
        }
      },

      "command.execute.before": async (input) => {
        if (input.command !== "omg-build") return

        const epicID = parseEpicID(input.arguments)
        if (!epicID) {
          await logger("warn", "BeadsPlugin: /omg-build requires a valid epic id as its first argument")
          return
        }

        const sessionID = input.sessionID
        const previousEpic = epicBySession.get(sessionID)
        if (previousEpic && previousEpic !== epicID) ownersByEpic.delete(previousEpic)

        const previousOwner = ownersByEpic.get(epicID)
        if (previousOwner && previousOwner !== sessionID) {
          epicBySession.delete(previousOwner)
          blockedSessions.delete(previousOwner)
          coordinator.cancelChainUnblocked(previousOwner)
          try {
            await client.session.abort({ path: { id: previousOwner } })
          } catch (err) {
            await logger(
              "warn",
              `BeadsPlugin: failed to abort previous owner for epic ${epicID}: ${err instanceof Error ? err.message : String(err)}`,
            )
          }
        }

        ownersByEpic.set(epicID, sessionID)
        epicBySession.set(sessionID, epicID)
        blockedSessions.add(sessionID)
        await persist()
        await logger("info", `BeadsPlugin: session now owns foreman epic ${epicID}`)
      },

      event: async ({ event }) => {
        if (event.type === "session.deleted") {
          const sessionID = event.properties.info.id
          const epicID = epicBySession.get(sessionID)
          epicBySession.delete(sessionID)
          blockedSessions.delete(sessionID)
          inFlight.delete(sessionID)
          coordinator.cancelChainUnblocked(sessionID)
          if (epicID && ownersByEpic.get(epicID) === sessionID) {
            ownersByEpic.delete(epicID)
            await persist()
          }
          return
        }

        if (event.type !== "session.idle") return

        const sessionID = event.properties.sessionID
        try {
          await shell`bd dolt commit`.quiet()
        } catch (err) {
          await logger(
            "warn",
            `BeadsPlugin: idle flush failed: ${err instanceof Error ? err.message : String(err)}`,
          )
        }

        scheduleReadyCheck(sessionID)
      },
    }
  }
}
