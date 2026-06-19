/**
 * PromptJS v0.2 — CLI `init` Command
 * ============================================================================
 * Scaffolds a new PromptJS project with sample files.
 *
 * Usage:
 *   pjs init                    — create project in current directory
 *   pjs init my-project         — create project in new directory
 *   pjs init --template basic   — use specific template
 *
 * Templates:
 *   - basic:    Single page with front-matter data
 *   - counter:  Interactive counter with state and event handlers
 *   - gallery:  Data-driven gallery with loop rendering
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── Template definitions ──────────────────────────────────────────────────

const TEMPLATES = {
  basic: {
    'index.pjs': `---
judul: "Halo Dunia"
deskripsi: "Proyek PromptJS pertamaku"
---

Halaman:
    Buat judul.utama#judul: $judul
    Buat paragraf: $deskripsi
`,
    'data/produk.json': `[
  {
    "nama": "Kopi Aceh",
    "harga": 45000,
    "stok": 12
  },
  {
    "nama": "Teh Gayo",
    "harga": 32000,
    "stok": 8
  }
]`,
    'README.md': `# PromptJS Project

Built with [PromptJS](https://github.com/promptjs) — a mini-DSL template engine.

## Getting Started

\`\`\`bash
# Start dev server
pjs serve

# Build for production
pjs build

# Compile single file
pjs compile index.pjs
\`\`\`

## Project Structure

\`\`\`
├── index.pjs         — Main page
├── data/
│   └── produk.json   — Data source
└── README.md
\`\`\`
`
  },

  counter: {
    'index.pjs': `---
judul: "Penghitung"
nilai: 0
---
Halaman:
    Buat judul.utama: "Penghitung Interaktif"
    Buat div.kontainer:
        Buat tombol#kurang: "Kurang"
        Buat span#nilai: $nilai
        Buat tombol#tambah: "Tambah"
`,
    'README.md': `# PromptJS Counter

An interactive counter built with PromptJS.

## Run

\`\`\`bash
pjs serve
\`\`\`

The counter displays a value that can be incremented and decremented.
Event handlers will be added as the language evolves.
`
  },

  gallery: {
    'index.pjs': `---
produk: ./data/produk.json
---
Halaman:
    Buat judul.utama: "Galeri Produk"
    Buat div.galeri:
        Ulangi untuk item dari $produk:
            Buat div.kartu:
                Buat h3: $item.nama
                Buat span.harga: "Rp " + $item.harga
                Jika $item.stok > 0:
                    Buat span.stok: "Stok: " + $item.stok
                Lainnya:
                    Buat span.habis: "Habis"
`,
    'data/produk.json': `[
  {
    "nama": "Kopi Aceh Gayo",
    "harga": 45000,
    "stok": 12
  },
  {
    "nama": "Teh Gunung Lewu",
    "harga": 32000,
    "stok": 0
  },
  {
    "nama": "Madu Hutan Kalimantan",
    "harga": 85000,
    "stok": 5
  },
  {
    "nama": "Rempah Maluku",
    "harga": 28000,
    "stok": 20
  }
]`,
    'README.md': `# PromptJS Gallery

A data-driven product gallery built with PromptJS.

## Run

\`\`\`bash
pjs serve
\`\`\`

The gallery renders products from \`data/produk.json\` using the Ulangi (loop) construct.
`
  }
};

function runInit(argv) {
  const projectName = argv._[0] || null;
  const template = argv.template || argv.t || 'basic';
  const force = argv.force || false;

  const useColor = true;
  const green = '\x1b[32m';
  const cyan = '\x1b[36m';
  const bold = '\x1b[1m';
  const gray = '\x1b[90m';
  const reset = '\x1b[0m';

  // Validate template
  if (!TEMPLATES[template]) {
    process.stderr.write(
      `Error: Unknown template '${template}'. Available: ${Object.keys(TEMPLATES).join(', ')}\n`
    );
    process.exit(1);
  }

  // Determine target directory
  const targetDir = projectName
    ? path.join(process.cwd(), projectName)
    : process.cwd();

  // Check if directory already has files
  if (projectName && fs.existsSync(targetDir)) {
    const entries = fs.readdirSync(targetDir);
    if (entries.length > 0 && !force) {
      process.stderr.write(
        `Error: Directory '${projectName}' already exists and is not empty.\n` +
        `  Use --force to overwrite.\n`
      );
      process.exit(1);
    }
  } else if (!projectName) {
    const entries = fs.readdirSync(targetDir).filter(e => !e.startsWith('.'));
    if (entries.length > 0 && !force) {
      process.stderr.write(
        `Warning: Current directory is not empty. Use --force to overwrite.\n`
      );
    }
  }

  // Create target directory
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Write template files
  const files = TEMPLATES[template];
  const created = [];

  for (const [relPath, content] of Object.entries(files)) {
    const filePath = path.join(targetDir, relPath);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(filePath) && !force) {
      process.stderr.write(`  ${gray}skip${reset} ${relPath} (already exists)\n`);
      continue;
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    created.push(relPath);
    process.stderr.write(`  ${green}✓${reset} ${relPath}\n`);
  }

  // Summary
  process.stderr.write(`\n${bold}${green}Project initialized!${reset}\n`);
  process.stderr.write(`  Template: ${cyan}${template}${reset}\n`);
  process.stderr.write(`  Location: ${cyan}${targetDir}${reset}\n`);

  if (projectName) {
    process.stderr.write(`\n  ${gray}Next steps:${reset}\n`);
    process.stderr.write(`    cd ${projectName}\n`);
  }

  process.stderr.write(`    pjs serve\n`);
  process.stderr.write(`\n`);

  process.exit(0);
}

module.exports = { runInit, TEMPLATES };
