# PromptJS — VS Code Extension

Syntax highlighting and snippets for [PromptJS](https://github.com/raarion/promptjs) (`.pjs`) — a bilingual ID/EN DSL that compiles to vanilla JS.

## Features

- **Syntax highlighting** for all 56+ bilingual keywords (`Buat`/`Create`, `Jika`/`If`, `Ulangi`/`Loop`, …)
- **Front-matter** block recognition (`--- … ---`)
- **Event alias** highlighting (`on_klik`, `on_diketik`, …)
- **External reference** highlighting (`$judul`, `$items.url`, …)
- **Tag alias** highlighting (`tombol`, `paragraf`, `gambar`, …)
- **Prose operator** highlighting (`sama dengan`, `lebih dari`, `tambah`, `kali`, …)
- **Booleans & null** literals (`benar`/`true`, `salah`/`false`, `kosong`/`null`)
- **Snippets** for scaffold cepat: `Halaman`, `Komponen`, `Buat`, `Data`, `Jika`, `Ulangi`, `Saat`, `Ketika`, `Dipasang`, …

## Installation

### Opsi A — Install dari VSIX (manual)

```bash
cd editors/vscode
npm install
npm run package      # menghasilkan promptjs-0.3.0.vsix
code --install-extension promptjs-0.3.0.vsix
```

### Opsi B — Install dari Marketplace (setelah publish)

1. Buka VS Code
2. Buka Extensions panel (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search "PromptJS"
4. Click Install

## Publish ke VS Code Marketplace

Prasyarat:

1. Buat Personal Access Token di https://dev.azure.com (Publisher: `raarion`)
2. Login: `npx vsce login raarion`
3. Publish: `npm run package && npx vsce publish`

Lihat [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) untuk detail lengkap.

## File Structure

```
editors/vscode/
├── package.json                       # Extension manifest
├── language-configuration.json        # Bracket matching, indentation rules
├── syntaxes/
│   └── promptjs.tmLanguage.json       # TextMate grammar
├── snippets/
│   └── promptjs.json                  # Code snippets
├── images/
│   └── promptjs-logo.png              # Extension icon (perlu di-supply)
├── .vscodeignore                      # Files excluded dari .vsix package
├── README.md
├── CHANGELOG.md
└── LICENSE
```

> **Catatan**: `images/promptjs-logo.png` perlu di-supply secara manual (128x128 PNG). Sementara pakai `assets/PromptJS-logo.svg` dari repo root — konversi ke PNG via `rsvg-convert` atau Figma export.

## Development

Untuk iterasi grammar secara live:

1. Buka folder `editors/vscode/` di VS Code
2. Press `F5` → launches Extension Development Host
3. Buka file `.pjs` di host → lihat highlighting
4. Edit `syntaxes/promptjs.tmLanguage.json` → reload window (`Ctrl+R` di host) untuk lihat perubahan

Untuk test grammar terhadap examples:

```bash
cd /path/to/promptjs
code --install-extension editors/vscode/promptjs-0.3.0.vsix
code examples/counter.pjs
```

## License

MIT — sama dengan repo root PromptJS.
