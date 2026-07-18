import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PLUGIN_PACKAGE = "@toady00/open-mardi-gras"
const WORKFLOW_DIRECTORIES = ["agents", "commands", "skills"] as const

function collectRelativeFiles(root: string, currentDir = root): string[] {
  const entries = readdirSync(currentDir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = join(currentDir, entry.name)

    if (entry.isDirectory()) {
      files.push(...collectRelativeFiles(root, fullPath))
      continue
    }

    if (entry.isFile()) {
      files.push(fullPath.slice(root.length + 1))
    }
  }

  return files.sort()
}

export function getWorkflowFiles(sourceRoot = resolve(__dirname, "../../opencode")): string[] {
  return WORKFLOW_DIRECTORIES.flatMap((directory) =>
    collectRelativeFiles(join(sourceRoot, directory)).map((file) => join(directory, file)),
  ).sort()
}

function isConfiguredPlugin(entry: unknown): boolean {
  const packageName: unknown = Array.isArray(entry) ? (entry as unknown[])[0] : entry
  return (
    typeof packageName === "string" &&
    (packageName === PLUGIN_PACKAGE || packageName.startsWith(`${PLUGIN_PACKAGE}@`))
  )
}

function findStringEnd(source: string, start: number): number {
  let escaped = false
  for (let index = start + 1; index < source.length; index++) {
    if (!escaped && source[index] === '"') return index
    escaped = !escaped && source[index] === "\\"
    if (source[index] !== "\\") escaped = false
  }
  throw new Error("unterminated JSON string")
}

function findTopLevelProperty(source: string, name: string): { keyStart: number; valueStart: number } {
  let depth = 0
  for (let index = 0; index < source.length; index++) {
    const character = source[index]
    if (character === '"') {
      const end = findStringEnd(source, index)
      if (depth === 1 && JSON.parse(source.slice(index, end + 1)) === name) {
        let colon = end + 1
        while (/\s/.test(source[colon] ?? "")) colon++
        if (source[colon] === ":") {
          let valueStart = colon + 1
          while (/\s/.test(source[valueStart] ?? "")) valueStart++
          return { keyStart: index, valueStart }
        }
      }
      index = end
    } else if (character === "{" || character === "[") {
      depth++
    } else if (character === "}" || character === "]") {
      depth--
    }
  }
  throw new Error(`top-level "${name}" property was not found`)
}

function findArrayEnd(source: string, start: number): number {
  let depth = 0
  for (let index = start; index < source.length; index++) {
    const character = source[index]
    if (character === '"') {
      index = findStringEnd(source, index)
    } else if (character === "[") {
      depth++
    } else if (character === "]" && --depth === 0) {
      return index
    }
  }
  throw new Error("plugin array was not closed")
}

function addPluginToSource(source: string, config: Record<string, unknown>): string {
  const serializedPlugin = JSON.stringify(PLUGIN_PACKAGE)
  const plugins = config.plugin
  if (Array.isArray(plugins)) {
    const { valueStart } = findTopLevelProperty(source, "plugin")
    const arrayEnd = findArrayEnd(source, valueStart)
    const inside = source.slice(valueStart + 1, arrayEnd)
    if (inside.trim() === "") {
      return `${source.slice(0, valueStart + 1)}${serializedPlugin}${source.slice(valueStart + 1)}`
    }

    const trailingWhitespace = inside.match(/\s*$/)?.[0] ?? ""
    const insertionAt = arrayEnd - trailingWhitespace.length
    const newline = source.includes("\r\n") ? "\r\n" : "\n"
    let separator = ", "
    if (inside.includes("\n")) {
      const currentLine = source.slice(source.lastIndexOf("\n", insertionAt - 1) + 1, insertionAt)
      const indentation = currentLine.match(/^\s*/)?.[0] ?? ""
      separator = `,${newline}${indentation}`
    }
    return `${source.slice(0, insertionAt)}${separator}${serializedPlugin}${source.slice(insertionAt)}`
  }

  const objectEnd = source.lastIndexOf("}")
  const beforeEnd = source.slice(0, objectEnd)
  const trailingWhitespace = beforeEnd.match(/\s*$/)?.[0] ?? ""
  const insertionAt = objectEnd - trailingWhitespace.length
  const hasProperties = Object.keys(config).length > 0
  if (!source.includes("\n")) {
    const separator = hasProperties ? ", " : ""
    return `${source.slice(0, insertionAt)}${separator}"plugin": [${serializedPlugin}]${source.slice(insertionAt)}`
  }

  const newline = source.includes("\r\n") ? "\r\n" : "\n"
  let indentation = "  "
  if (hasProperties) {
    const firstKey = Object.keys(config)[0]
    const { keyStart } = findTopLevelProperty(source, firstKey)
    indentation = source.slice(source.lastIndexOf("\n", keyStart - 1) + 1, keyStart)
  }
  const separator = hasProperties ? "," : ""
  return `${source.slice(0, insertionAt)}${separator}${newline}${indentation}"plugin": [${serializedPlugin}]${source.slice(insertionAt)}`
}

export function configurePlugin(destRoot: string): "added" | "present" {
  const configPath = join(destRoot, "opencode.json")
  let config: Record<string, unknown> = {}
  let source: string | undefined

  try {
    source = readFileSync(configPath, "utf-8")
    const parsed = JSON.parse(source) as unknown
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("the top-level value must be a JSON object")
    }
    config = parsed as Record<string, unknown>
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Cannot update ${configPath}: ${message}`)
    }
  }

  const plugins = config.plugin
  if (plugins !== undefined && !Array.isArray(plugins)) {
    throw new Error(`Cannot update ${configPath}: "plugin" must be an array`)
  }

  const pluginEntries: unknown[] = Array.isArray(plugins) ? (plugins as unknown[]) : []
  const pluginAlreadyConfigured = pluginEntries.some(isConfiguredPlugin)
  if (pluginAlreadyConfigured) return "present"

  mkdirSync(destRoot, { recursive: true })
  const updatedSource =
    source === undefined
      ? `${JSON.stringify(
          { $schema: "https://opencode.ai/config.json", plugin: [PLUGIN_PACKAGE] },
          null,
          2,
        )}\n`
      : addPluginToSource(source, config)
  writeFileSync(configPath, updatedSource)
  return "added"
}

export function setup(): void {
  const sourceRoot = resolve(__dirname, "../../opencode")
  const destRoot = resolve(process.cwd(), ".opencode")
  const filesToCopy = getWorkflowFiles(sourceRoot)

  console.log("Setting up Open Mardi Gras workflow files...\n")

  let copied = 0
  const errors: string[] = []
  for (const file of filesToCopy) {
    const src = join(sourceRoot, file)
    const dest = join(destRoot, file)

    try {
      mkdirSync(dirname(dest), { recursive: true })
      copyFileSync(src, dest)
      console.log(`  copied: .opencode/${file}`)
      copied++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  FAILED: .opencode/${file} — ${msg}`)
      errors.push(file)
    }
  }

  // Read package version
  let version = "unknown"
  try {
    const pkgPath = resolve(__dirname, "../../package.json")
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string }
    version = pkg.version ?? "unknown"
  } catch {
    // If package.json can't be read, continue with "unknown"
  }

  console.log(`\n@toady00/open-mardi-gras v${version}`)
  console.log(`Copied ${copied} files to .opencode/`)

  if (errors.length > 0) {
    console.error(`\nFailed to copy ${errors.length} file(s). Re-run setup or copy them manually.`)
    process.exit(1)
  }

  try {
    const pluginStatus = configurePlugin(destRoot)
    console.log(
      pluginStatus === "added"
        ? `Added ${PLUGIN_PACKAGE} to .opencode/opencode.json`
        : `${PLUGIN_PACKAGE} is already configured in .opencode/opencode.json`,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`\nFailed to configure the plugin: ${message}`)
    process.exit(1)
  }

  console.log(`\nNext steps:`)
  console.log(`  1. Restart or open opencode in this project.`)
  console.log(`  2. Run /omg-onboard {solo|centralized|satellite}.`)
  console.log(`  3. Follow the onboarder's instructions to finish and verify the wiring.`)
}

function main(): void {
  const command = process.argv[2]

  if (command === "setup") {
    setup()
  } else {
    console.error("Usage: @toady00/open-mardi-gras setup")
    console.error("")
    console.error("Commands:")
    console.error("  setup  Install workflow instruments and configure the plugin")
    process.exit(1)
  }
}

if (process.argv[1] !== undefined && realpathSync(resolve(process.argv[1])) === __filename) {
  main()
}
