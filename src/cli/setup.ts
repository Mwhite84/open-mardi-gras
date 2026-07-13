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

export function configurePlugin(destRoot: string): "added" | "present" {
  const configPath = join(destRoot, "opencode.json")
  let config: Record<string, unknown> = {}

  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf-8")) as unknown
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
  const schemaWasMissing = config.$schema === undefined
  config.$schema ??= "https://opencode.ai/config.json"
  if (!pluginAlreadyConfigured) {
    config.plugin = [...pluginEntries, PLUGIN_PACKAGE]
  }

  if (!pluginAlreadyConfigured || schemaWasMissing) {
    mkdirSync(destRoot, { recursive: true })
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`)
  }
  return pluginAlreadyConfigured ? "present" : "added"
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
