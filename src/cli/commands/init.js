// @ts-check

/**
 * PromptJS v0.9.9 — CLI: `init` Command / Perintah `init`
 * ============================================================================
 *
 * Scaffold proyek PromptJS baru. Buat folder `src/`, `src/pages/`,
 * `src/components/`, file contoh, dan `package.json` minimal.
 *
 * Template yang tersedia: `basic`, `counter`, `gallery`, `spa`, `fullstack`, `blog`.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { makeColors } = require('../utils');

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
`,
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
`,
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
`,
  },

  spa: {
    'index.pjs': `---
judul: "Aplikasi SPA"
router: benar
---
Halaman:
    Buat nav#navigasi:
        Buat tombol[data-halaman="beranda"]: "Beranda"
        Buat tombol[data-halaman="tentang"]: "Tentang"
        Buat tombol[data-halaman="kontak"]: "Kontak"
    Buat div#konten:
        Buat h2: "Selamat Datang"
`,
    'pages/beranda.pjs': `---
judul: "Beranda"
---
Halaman Beranda:
    Buat judul.utama: "Selamat Datang di Beranda"
    Buat paragraf: "Ini adalah halaman beranda aplikasi SPA PromptJS."
`,
    'pages/tentang.pjs': `---
judul: "Tentang"
---
Halaman Tentang:
    Buat judul.utama: "Tentang Kami"
    Buat paragraf: "PromptJS adalah mini-DSL yang mengompail .pjs menjadi JavaScript vanilla."
`,
    'pages/kontak.pjs': `---
judul: "Kontak"
---
Halaman Kontak:
    Buat judul.utama: "Hubungi Kami"
    Buat paragraf: "Kirim pesan melalui formulir di bawah."
    Buat formulir:
        Buat input#nama[placeholder="Nama"]: ""
        Buat input#email[placeholder="Email"]: ""
        Buat tombol: "Kirim"
`,
    'README.md': `# PromptJS SPA

A single-page application with client-side routing built with PromptJS.

## Features

- Client-side routing via \`router: benar\` directive
- Multiple pages with navigation
- Zero dependencies — compiles to vanilla JS

## Run

\`\`\`bash
pjs serve
\`\`\`

Click navigation buttons to switch between pages without full reload.
`,
  },

  fullstack: {
    'index.pjs': `butuhAuth: benar
redirect: "/login"
token: localStorage
tokenKey: auth_token
peran: admin
router: benar
---
Halaman Dashboard:
    data hitung = 0
    data nama = ""

    Ketika muat:
        simpan localStorage.getItem("user_name") ke nama

    Buat nav#navigasi:
        Buat span: "Dashboard Admin"
        Buat tombol[data-halaman="dashboard"]: "Dashboard"
        Buat tombol[data-halaman="pengaturan"]: "Pengaturan"
        Buat tombol#keluar: "Keluar"
    Buat div#konten:
        Buat h2: "Halo, " + $nama
        Buat div.kontainer:
            Buat tombol#kurang: "Kurang"
            Buat span#nilai: $hitung
            Buat tombol#tambah: "Tambah"
`,
    'pages/login.pjs': `---
judul: "Masuk"
---
Halaman Login:
    data nama = ""
    data sandi = ""

    Buat div.kartu:
        Buat h2: "Masuk ke Akun"
        Buat formulir:
            Buat label: "Nama Pengguna"
            Buat input#nama[placeholder="admin"]: ""
            Buat label: "Kata Sandi"
            Buat input#sandi[type="password"]: ""
            Buat tombol#masuk: "Masuk"
`,
    'pages/pengaturan.pjs': `---
judul: "Pengaturan"
---
Halaman Pengaturan:
    Buat judul.utama: "Pengaturan"
    Buat div.pengaturan:
        Buat label: "Tema"
        Buat pilih#tema:
            Buat opsi[value="terang"]: "Terang"
            Buat opsi[value="gelap"]: "Gelap"
`,
    'data/users.json': `[
  {
    "nama": "admin",
    "peran": "admin"
  },
  {
    "nama": "editor",
    "peran": "editor"
  }
]`,
    'README.md': `# PromptJS Fullstack

A full-stack pattern app with auth guard, role-based access, and SPA routing.

## Features

- Auth guard via \`butuhAuth: benar\` directive
- Role-based access via \`peran: admin\` directive
- Custom token key via \`tokenKey: auth_token\`
- Client-side routing via \`router: benar\`
- Login page, dashboard, and settings

## Auth Flow

1. User visits dashboard → auth guard checks \`localStorage.getItem('auth_token')\`
2. If no token → redirect to \`/login\`
3. If token exists but wrong role → redirect to \`/login\`
4. On successful login → set \`localStorage.setItem('auth_token', ...)\`

## Run

\`\`\`bash
pjs serve
\`\`\`
`,
  },

  blog: {
    'index.pjs': `---
judul: "Blog PromptJS"
---
Halaman:
    Buat judul.utama: "Blog PromptJS"
    Buat div.daftar-artikel:
        Ulangi untuk artikel dari $artikel:
            Buat artikel.kartu:
                Buat h2: $artikel.judul
                Buat span.tanggal: $artikel.tanggal
                Buat p: $artikel.ringkasan
                Buat tombol: "Baca Selengkapnya"
`,
    'pages/artikel.pjs': `---
judul: "Detail Artikel"
---
Halaman Artikel:
    Buat judul.utama: "Judul Artikel"
    Buat span.tanggal: "1 Januari 2025"
    Buat div.konten:
        Buat p: "Isi artikel lengkap ada di sini."
`,
    'data/artikel.json': `[
  {
    "judul": "Memulai dengan PromptJS",
    "tanggal": "2025-01-15",
    "ringkasan": "Pelajari dasar-dasar PromptJS dan buat halaman pertamamu dalam hitungan menit."
  },
  {
    "judul": "Autentikasi dengan butuhAuth",
    "tanggal": "2025-02-01",
    "ringkasan": "Lindungi halamanmu dengan auth guard bawaan PromptJS — tanpa library eksternal."
  },
  {
    "judul": "SPA Routing di PromptJS",
    "tanggal": "2025-03-10",
    "ringkasan": "Buat aplikasi satu halaman dengan routing klien menggunakan direktif router: benar."
  }
]`,
    'README.md': `# PromptJS Blog

A simple blog template with data-driven article listing built with PromptJS.

## Features

- Data-driven article list from \`data/artikel.json\`
- Loop rendering with \`Ulangi\` construct
- Article detail page
- Clean, minimal design

## Run

\`\`\`bash
pjs serve
\`\`\`

Articles are rendered from the JSON data file. Add more entries to see them appear.
`,
  },
};

/**
 * Jalankan command `pjs init`.
 *
 * @param {Object} argv - Parsed args dari `parseArgs` (field: `template`, `name`, `dir`)
 * @returns {void}
 */
function runInit(argv) {
  const projectName = argv._[0] || null;
  const template = argv.template || argv.t || 'basic';
  const force = argv.force || false;

  const { green, cyan, bold, gray, reset } = makeColors({ stream: process.stdout });

  // Validate template
  if (!TEMPLATES[template]) {
    process.stderr.write(
      `Error: Unknown template '${template}'. Available: ${Object.keys(TEMPLATES).join(', ')}\n`
    );
    process.exit(1);
  }

  // Determine target directory
  const targetDir = projectName ? path.join(process.cwd(), projectName) : process.cwd();

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
    const entries = fs.readdirSync(targetDir).filter((e) => !e.startsWith('.'));
    if (entries.length > 0 && !force) {
      process.stderr.write(`Warning: Current directory is not empty. Use --force to overwrite.\n`);
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
