# Instalasi / Installation

> docs/user/ > Installation

---

## Persyaratan / Requirements

| Kebutuhan / Requirement | Versi / Version | Sumber / Source |
|-------------------------|-----------------|-----------------|
| **Node.js** | ≥ 20.19.0 | Field `engines` di `package.json` |
| **npm** | (bundled dengan Node.js) | - |
| **OS** | Windows, macOS, Linux | CLI murni JavaScript |

PromptJS tidak memerlukan runtime dependency — output kompilasi adalah JavaScript vanilla yang berjalan di browser manapun. Dependency hanya dibutuhkan saat pengembangan (testing dengan Vitest, linting dengan ESLint, type checking dengan TypeScript JSDoc).

PromptJS requires no runtime dependencies — compiled output is vanilla JavaScript that runs in any browser. Dependencies are only needed during development (testing with Vitest, linting with ESLint, type checking with TypeScript JSDoc).

---

## Metode Instalasi / Installation Methods

### 1. Dari npm / From npm

```bash
npm install prompt-js
```

Setelah instalasi, CLI `pjs` tersedia sebagai binary. Package name di npm adalah `prompt-js` (karena `promptjs` sudah diambil). Setelah instalasi, perintah `pjs` bisa dipanggil langsung dari terminal.

After installation, the `pjs` CLI is available as a binary. The npm package name is `prompt-js` (since `promptjs` is already taken). After installing, the `pjs` command can be called directly from the terminal.

**Bukti / Evidence:** Field `"bin"` di `package.json` mendefinisikan `"pjs": "src/cli/index.js"`.

### 2. Dari Source / From Source

```bash
git clone https://github.com/raarion/promptjs.git
cd promptjs
npm install
```

Jika menginstall dari source, CLI diakses melalui:

If installing from source, the CLI is accessed via:

```bash
node src/cli/index.js compile file.pjs
# atau / or
npm run pjs -- compile file.pjs
```

Atau, untuk mengakses `pjs` langsung, gunakan `npm link`:

Or, to access `pjs` directly, use `npm link`:

```bash
npm link
pjs compile file.pjs
```

---

## Memverifikasi Instalasi / Verifying Installation

```bash
pjs version
```

Output yang diharapkan / Expected output:

```
PromptJS v1.0.0
```

Perintah `pjs help` menampilkan daftar lengkap semua command dan opsi yang tersedia.

The `pjs help` command displays a complete list of all available commands and options.

---

## File yang Terinstall / Installed Files

Saat menginstall dari npm, file-file berikut disertakan (sesuai field `"files"` di `package.json`):

When installing from npm, the following files are included (per the `"files"` field in `package.json`):

```
prompt-js/
├── src/                          # Seluruh source code compiler & engine
├── examples/*.pjs                # Contoh file tunggal (counter, gallery, todo)
├── examples/dashboard-app/       # Contoh SPA + auth
│   ├── *.pjs
│   └── README.md
├── examples/todo-app/            # Contoh reactive CRUD
│   ├── *.pjs
│   └── README.md
├── examples/multi-page/          # Contoh MPA
│   └── *.pjs
├── assets/                       # Aset logo
├── README.md
├── CHANGELOG.md
├── LICENSE
└── CONTRIBUTING.md
```

File yang **tidak** disertakan dalam package npm (di-exclude oleh `.npmignore`): `doc-dev/`, `tests/`, konfigurasi dev (`.eslintrc`, `jsconfig.json`, `vitest.config.js`), dan `node_modules/`.

Files **not** included in the npm package (excluded by `.npmignore`): `doc-dev/`, `tests/`, dev configs, and `node_modules/`.

---

## Editor Support

Syntax highlighting untuk VS Code tersedia di folder `editors/vscode/` dalam repo. Lihat `editors/vscode/README.md` untuk petunjuk instalasi.

VS Code syntax highlighting is available in the `editors/vscode/` folder of the repository. See `editors/vscode/README.md` for installation instructions.

---

## Troubleshooting

### `pjs: command not found`

Pastikan `node_modules/.bin` ada di `PATH` kamu. Atau gunakan `npx pjs`:

Make sure `node_modules/.bin` is in your `PATH`. Or use `npx pjs`:

```bash
npx pjs compile file.pjs
```

Jika menginstall global, gunakan `npm install -g prompt-js`.

If installing globally, use `npm install -g prompt-js`.

### `Error: Node.js version too old`

PromptJS memerlukan Node.js ≥ 20.19.0. Cek versi kamu:

PromptJS requires Node.js ≥ 20.19.0. Check your version:

```bash
node --version
```

Jika perlu, upgrade via [nodejs.org](https://nodejs.org) atau [nvm](https://github.com/nvm-sh/nvm).

If needed, upgrade via [nodejs.org](https://nodejs.org) or [nvm](https://github.com/nvm-sh/nvm).

---

← [Getting Started](getting-started.md) · [Quick Start →](quick-start.md)