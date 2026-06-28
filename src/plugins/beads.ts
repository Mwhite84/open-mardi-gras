/**
 * BeadsPlugin — integrates the beads issue tracker with OpenCode.
 *
 * Features:
 * - Context injection via `bd prime` appended to the system prompt
 * - Uses experimental.chat.system.transform to inject on every LLM call
 * - Automatic refresh after compaction via `session.compacted` event
 * - Automatic flush of pending beads state on session idle
 * - Recovery commit before prime on every refresh (catches hard exits)
 * - Propagates BEADS_* env vars into every shell OpenCode constructs
 *   (via shell.env) so dispatched subagents resolve the same Dolt
 *   backend the primary process does
 *
 * The system.transform approach eliminates race conditions with
 * ThenChainingPlugin because system prompt injection never creates
 * extra user messages or LLM turns.
 *
 * The shell.env hook fixes a class of bug where a dispatched subagent's
 * `$` shell ran without the primary process's BEADS_* environment. `bd`
 * resolves its Dolt backend by precedence (BEADS_DOLT_* env vars ->
 * metadata.json -> config.yaml); with the env vars missing, the subagent
 * fell back to a non-existent local server (127.0.0.1:0) or a stale local
 * standalone store, so every `bd` write failed (e.g. the confusing schema
 * error `no such column: replacement_seq`). Forwarding all BEADS_* vars
 * makes every shell resolve the same backend the primary does.
 */

import type { Plugin } from "@opencode-ai/plugin"
import { createPluginLogger } from "../logging.js"

type ShellCommand = {
  quiet(): Promise<unknown>
  text(): Promise<string>
}

type Shell = (strings: TemplateStringsArray, ...values: unknown[]) => ShellCommand

/**
 * Collect every BEADS_* environment variable from the given source
 * (the primary OpenCode process environment). Returns a plain record
 * of only the defined string values.
 *
 * This deliberately forwards ALL `BEADS_*` vars, not just BEADS_DOLT_*:
 * other setups carry connection details (host, port, password, database,
 * actor, etc.) across the full prefix, and a remote password belongs in an
 * env var rather than committed config. Forwarding the whole prefix keeps
 * subagent shells in lockstep with the primary without enumerating keys.
 */
export function collectBeadsEnv(
  source: Record<string, string | undefined> = process.env,
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(source)) {
    if (key.startsWith("BEADS_") && value !== undefined) {
      result[key] = value
    }
  }
  return result
}

/**
 * Run `bd dolt commit` then `bd prime` and return the formatted beads context.
 * Returns null if bd is not installed, not initialized, or prime is empty.
 */
async function fetchBeadsContext(
  $: Shell,
  logger: (level: "info" | "warn" | "error", message: string) => Promise<void>,
): Promise<string | null> {
  try {
    // Flush any unsaved state before reading — recovers from hard exits
    await $`bd dolt commit`.quiet()

    const primeOutput: string = await $`bd prime`.text()
    if (!primeOutput?.trim()) return null

    return `<beads-context>
${primeOutput.trim()}
</beads-context>

<beads-guidance>
There is no native bd tool. Use the bash tool to run bd commands.
Always use --json flag for structured output when parsing results.
</beads-guidance>`
  } catch (err) {
    await logger(
      "warn",
      `BeadsPlugin: failed to fetch context: ${err instanceof Error ? err.message : String(err)}`,
    )
    return null
  }
}

export function BeadsPlugin(): Plugin {
  return async ({ client, $ }) => {
    const shell = $ as unknown as Shell

    /**
     * Cached beads context per session. Populated on first LLM call
     * (via system.transform) and refreshed after compaction.
     *
     * Key: sessionID, Value: formatted beads context string
     */
    const sessionContextCache = new Map<string, string>()

    /**
     * Sessions that need a context refresh on the next system.transform
     * call. Set by the compaction handler and consumed by the transform.
     */
    const pendingRefresh = new Set<string>()

    const logger = createPluginLogger(client)

    await logger("info", "BeadsPlugin initialized")

    return {
      // Propagate the primary process's BEADS_* environment into every
      // shell OpenCode constructs — including a dispatched subagent's `$`
      // and the bash tool. Without this, a subagent shell can run without
      // BEADS_DOLT_* set, causing `bd` to fall back to a non-existent local
      // server (127.0.0.1:0) or a stale local store instead of the primary's
      // remote backend. We never overwrite a value the shell already carries
      // — the forwarded vars only fill gaps.
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
          await logger(
            "info",
            `BeadsPlugin: forwarded ${injected} BEADS_* env var(s) into shell`,
          )
        }
      },

      // Append beads context to the system prompt on every LLM call.
      // This is purely additive — existing system prompt strings are
      // untouched. The beads context appears as system instructions,
      // not as a user message, so it cannot race with then-chains or
      // trigger extra LLM turns.
      "experimental.chat.system.transform": async (input, output) => {
        const sessionID = input.sessionID
        if (!sessionID) return

        // Check if a refresh is pending (post-compaction)
        if (pendingRefresh.has(sessionID)) {
          pendingRefresh.delete(sessionID)
          sessionContextCache.delete(sessionID)
        }

        // Fetch and cache beads context on first call per session
        if (!sessionContextCache.has(sessionID)) {
          const context = await fetchBeadsContext(shell, logger)
          if (context) {
            sessionContextCache.set(sessionID, context)
            await logger("info", "BeadsPlugin: cached beads context for session")
          } else {
            // Mark as empty so we don't retry every call
            sessionContextCache.set(sessionID, "")
          }
        }

        const cached = sessionContextCache.get(sessionID)
        if (cached) {
          output.system.push(cached)
        }
      },

      // Refresh beads context after compaction; auto-commit on idle
      event: async ({ event }) => {
        if (event.type === "session.compacted") {
          const sessionID = event.properties.sessionID
          // Flag this session for refresh on the next system.transform call.
          // The actual bd prime fetch happens lazily in the transform hook
          // so there's no race with other hooks or chain state.
          pendingRefresh.add(sessionID)
          await logger(
            "info",
            "BeadsPlugin: flagged session for context refresh after compaction",
          )
        }

        // Flush beads state after every agent turn.
        // bd dolt commit is idempotent, cheap, and a no-op when auto-commit
        // is on or beads isn't initialized.
        if (event.type === "session.idle") {
          try {
            await shell`bd dolt commit`.quiet()
          } catch (err) {
            await logger(
              "warn",
              `BeadsPlugin: idle flush failed: ${err instanceof Error ? err.message : String(err)}`,
            )
          }
        }
      },
    }
  }
}
