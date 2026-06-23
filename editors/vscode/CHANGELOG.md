# Changelog

All notable changes to the PromptJS VS Code extension are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] — 2026-06-23

### Added

- **Extension version** bumped to 0.4.0 to sync with main PromptJS release.
- **Support for Wave H-L features** (all handled at engine level, no grammar changes needed):
  - Module system keywords (`kirim`, `terima`, `share`, `get`, `dari`, `from`) — already recognized by existing front-matter grammar
  - CSS blocks (`Gaya`, `Style`) — recognized as generic indented blocks
  - Multi-page routing directives — no new keywords, handled by builder

### Changed

- No TextMate grammar changes required — all v0.4.0 features work seamlessly with existing v0.3.0 grammar
- Updated badge/metadata to reflect v0.4.0 alignment

### Notes

- v0.4.0 PromptJS adds multi-file projects, CSS support, and module system at the **engine/CLI level**
- The VS Code **extension grammar remains compatible** — no new token types needed
- Users can write multi-page apps with CSS blocks and module imports without any extension updates

---

## [0.3.0] — 2026-06-21

### Added

- **Initial release** of the PromptJS VS Code extension.
- **TextMate grammar** (`syntaxes/promptjs.tmLanguage.json`) covering:
  - 56+ bilingual keywords (`Buat`/`Create`, `Jika`/`If`, `Ulangi`/`Loop`, …)
  - Front-matter block (`--- … ---`) dengan YAML-like highlighting
  - Event alias (`on_klik`, `on_diketik`, …)
  - External reference (`$nama.path`)
  - Tag aliases (`tombol`, `paragraf`, `gambar`, …)
  - Prose operators (`sama dengan`, `lebih dari`, `tambah`, `kali`, …)
  - Booleans & null (`benar`/`true`, `salah`/`false`, `kosong`/`null`)
- **Language configuration** (`language-configuration.json`):
  - `//` line comments
  - Bracket matching `[`, `(`, `'`, `"`
  - Auto-closing pairs
  - Indentation rules: increase on `:\s*$`, decrease on `Lainnya`/`Else`/`Berhenti`/`Kembalikan`
- **Snippets** (`snippets/promptjs.json`):
  - `halaman` → page scaffold dengan front-matter
  - `komponen` → component declaration
  - `buat` → DOM element
  - `data`, `turunan` → reactive state
  - `jika` → conditional
  - `ulangi` → for-in loop
  - `ulangi-kali` → range loop
  - `saat`, `ketika` → watcher & event handler
  - `dipasang` → mounted lifecycle
  - `simpan` → assignment
  - `fm` → empty front-matter block

[Unreleased]: https://github.com/raarion/promptjs/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/raarion/promptjs/releases/tag/v0.4.0
[0.3.0]: https://github.com/raarion/promptjs/releases/tag/v0.3.0
