import { copyFileSync, mkdirSync, readFileSync, readdirSync, realpathSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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
  return collectRelativeFiles(sourceRoot)
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

  console.log(`\nNext steps:`)
  console.log(`  1. Open opencode in this project.`)
  console.log(`  2. Run /omg-hindsight-setup to set up the project's Hindsight memory.`)
  console.log(`  3. Run /omg-onboard {solo|centralized|satellite} to wire up the rest`)
  console.log(`     of the workflow (it will create the proper .workflow.yaml).`)
}

function main(): void {
  const command = process.argv[2]

  if (command === "setup") {
    setup()
  } else {
    console.error("Usage: @toady00/open-mardi-gras setup")
    console.error("")
    console.error("Commands:")
    console.error("  setup  Copy workflow files (commands, agents, skills) into .opencode/")
    process.exit(1)
  }
}

if (process.argv[1] !== undefined && realpathSync(resolve(process.argv[1])) === __filename) {
  main()
}
