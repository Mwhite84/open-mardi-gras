# Changelog

## 0.4.1 - 2026-06-28

### Changed

- Updated bundled workflow commands and docs for current beads and spec workflows.
- Updated model names used by bundled workflow assets.
- Migrated local beads tracking to the remote Dolt server configuration.

### Fixed

- Restored plugin parity between packaged `opencode/` assets and local workflow files.

## 0.4.0 - 2026-04-07

### Changed

- Update workflow files for beads 1.0.0 (`6179920`)

### Fixed

- Fix `npx` setup silently failing due to symlink path mismatch (`59dc8c8`)

## 0.3.1 - 2026-03-17

### Fixed
- Updated the setup CLI to copy the full packaged `opencode/` tree into `.opencode/`, so newly shipped workflow files like `omg-ensure-work-finished` are installed automatically.

### Added
- Added a setup CLI test covering recursive workflow file discovery.
- Added `mise.toml` to pin the Bun version used for local development.

### Changed
- Clarified the README so the setup command documents that it installs the packaged contents of `opencode/`.

## 0.3.0 - 2026-03-05

### Changed
- Migrated bundled beads workflow usage toward Dolt-native `bd` commands.
- Updated shipped workflow assets under `.opencode/` to align with `omg` issue prefix conventions.

### Fixed
- Removed stale beads hook shim files that were no longer used.

## 0.2.1 - 2026-03-01

### Changed
- Refined workflow completion guidance to better enforce finishing and verification steps.

## 0.2.0 - 2026-03-01

### Added
- Added npm plugin entry point for OpenCode auto-loading.

### Changed
- Improved shipped agent display names and cleaned up agent file frontmatter.

## 0.1.0 - 2026-02-26

Initial release of open-mardi-gras.

### Added
- Initial scaffolding with TypeScript build system
- HelloWorldPlugin for validation
- ESLint configuration with TypeScript support
- NPM package configuration for ESM-only distribution
