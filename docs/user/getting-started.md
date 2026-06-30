# Getting Started / Memulai

> **⏱️ 2 menit dari nol sampai "Hello World" di browser.**

---

## 1. Install / Instalasi

```bash
npm install -g @raarion/prompt-js
```

**Requirement:** Node.js ≥ 22.0.0. Cek versi dengan `node --version`.

Done. PromptJS adalah **zero runtime dependency** — nggak ada framework tambahan, nggak ada ratusan MB `node_modules`. Cuma compiler yang siap jalan.

---

## 2. Bikin Proyek Pertama / Create Your First Project

```bash
pjs init -t counter
cd counter
```

Perintah ini membuat folder `counter/` berisi:

```
counter/
├── index.pjs       ← kode utama (20 baris yang langsung bisa kamu baca)
└── pjs.config.js   ← konfigurasi (nggak perlu disentuh sekarang)
```

Buka `index.pjs`. Isinya... ini:

```pjs
---
judul: "Counter Pertamaku"
---

Halaman Utama:
    data hitung = 0

    gaya:
        .counter-box
            margin: 40px auto
            padding: 24px
            text-align: center
            max-width: 300px
            font-family: 'Inter', system-ui, sans-serif
            border-radius: 16px
            background: #0f0c29
            color: #e0e0e0
            box-shadow: 0 8px 32px rgba(0,0,0,0.3)

        .angka
            font-size: 4rem
            font-weight: 800
            margin: 16px 0

        tombol
            background: #7dd3fc
            color: #0f0c29
            border: none
            padding: 12px 28px
            border-radius: 10px
            font-size: 1rem
            font-weight: 600
            cursor: pointer
            margin: 4px

        tombol:hover
            background: #38bdf8

    Buat div.counter-box:
        Buat h2: $judul
        Buat div.angka:
            "" + hitung

        Buat tombol: "+"
            Ketika diklik:
                tambahkan 1 ke hitung
        Buat tombol: "Reset"
            Ketika diklik:
                ubah hitung jadi 0
```

**Lo pasti bisa baca ini.** Bahkan kalo lo belum pernah ngoding. `Buat tombol: "+"` → `Ketika diklik: tambahkan 1 ke hitung`. Nggak ada `{}`, `</>`, atau `()=>{}`.

---

## 3. Jalankan / Run It

```bash
pjs serve --port 3000
```

Buka browser di **http://localhost:3000**.

Kamu lihat counter interaktif. Klik "+" — angka naik. Klik "Reset" — balik ke 0. **Tanpa React. Tanpa Vue. Tanpa npm install tambahan.** Hanya kode `.pjs` yang dikompilasi ke vanilla JavaScript.

Kalau kamu edit `index.pjs` dan save — browser **auto-reload**. Coba ubah `"Counter Pertamaku"` jadi `"Proyek Pertama E-Raa"` — lihat perubahannya instan.

---

## 🎉 Kamu Baru Aja...

- Menulis kode dalam **bahasa yang kamu pahami** — Indonesia, Inggris, atau campuran
- Menulis **seperti prompt** — tanpa simbol sintaks, tanpa kurung kurawal
- Tetap mengikuti **aturan coding yang disiplin** — indentasi, struktur blok
- Menghasilkan **vanilla JavaScript production-ready** — zero dependencies

Ini inti dari PromptJS: **coding, vibe coding, dan prompting dalam satu alur.**

---

## Ngoding Lebih Lanjut / Going Further

Ganti `index.pjs` dan eksplor:

### Variabel & Reaktivitas

```pjs
data nama = "Raa"
data klik = 0

Buat h2: "Halo, " + nama + "!"
Buat tombol: "Klik (" + klik + ")"
    Ketika diklik:
        tambahkan 1 ke klik
```

Simpan → browser auto-refresh. Klik tombol — `klik` naik. Itu reaktivitas. PromptJS otomatis update DOM setiap kali `data` berubah. Nggak perlu `setState()`, nggak perlu `useState()`. Cuma deklarasi `data` dan pakai nilainya.

### Kondisi / Conditions

```pjs
data login = salah

Jika login:
    Buat p: "Selamat datang!"
Lainnya:
    Buat tombol: "Login"
        Ketika diklik:
            ubah login jadi benar
```

`Jika` / `Lainnya` = `If` / `Else`. Keyword bilingual: bisa juga `If` / `Else`.

### Perulangan / Loops

```pjs
data daftar = ["Apel", "Pisang", "Melon"]

Untuk setiap buah di daftar:
    Buat p: "🍉 " + buah
```

`Untuk setiap x di y:` = loop over array. Bisa juga `For each x in y:`.

---

## Command Penting / Essential Commands

| Command | Fungsi |
|---|---|
| `pjs init -t counter` | Scaffold proyek baru (6 template: `counter`, `blank`, `todo`, `spa`, `auth`, `full`) |
| `pjs serve --port 3000` | Dev server + live reload |
| `pjs compile index.pjs --stdout` | Kompilasi satu file, lihat JS output |
| `pjs build --adapter static` | Build production → folder `out/` |

---

## Arsitektur 5 Tahap / 5-Stage Pipeline

Di balik `pjs compile`, ada pipeline yang menerjemahkan `.pjs` → vanilla JS:

```
Source (.pjs) → Lexer → Parser → Resolver → Analyzer → Compiler → JavaScript
```

| Tahap | Apa yang terjadi |
|---|---|
| **Lexer** | Tokenisasi. `Buat h1:` → `[KEYWORD:BUAT, TAG:h1, COLON]`. Keyword bilingual di-resolve di sini. |
| **Parser** | Token stream → AST (Abstract Syntax Tree). Struktur pohon dari blok dan indentasi. |
| **Resolver** | Validasi referensi. `$judul` dipastikan ada di `data` atau `turunan`. |
| **Analyzer** | Analisis semantik. Deteksi: "variabel `hitung` dipakai tapi nggak dideklarasi." 70+ error/warning bilingual. |
| **Compiler** | Codegen. AST → vanilla JavaScript. Tree-shaking — hanya helper yang dipakai yang di-emit. |

---

## Fitur Penting Lainnya / Other Key Features

Setelah nyaman dengan dasar-dasar, eksplorasi:

| Fitur | Deskripsi Singkat | Baca |
|---|---|---|
| 🧩 **Komponen** | `Komponen Kartu(props):` → reusable building blocks | [Components](../language/components.md) |
| 🗺️ **SPA Router** | `router: benar` — multi-page tanpa reload | [Routing](../language/routing.md) |
| 🔐 **Auth Guard** | `butuhAuth: benar` — client-side access control | [Auth](../language/auth.md) |
| 📦 **Adapters** | Build ke `static` / `node` / `vercel` | [Adapters](../language/adapters.md) |
| 🔌 **Plugin** | Custom transform hooks | [Plugins](../language/plugins.md) |
| 🛡️ **CSP Mode** | `--csp` flag — production hardening | [Security](../language/security.md) |

---

## FAQ Cepat / Quick FAQ

**Q: Apakah PromptJS butuh React/Vue/Svelte?**  
A: Nggak. Nol. Output-nya vanilla JavaScript. Nggak ada runtime dependency.

**Q: Bisa campur keyword Indonesia + Inggris?**  
A: Bisa. `Buat h1:` sama dengan `Create h1:`. `Jika` = `If`. Dalam satu file yang sama.

**Q: Apakah output-nya bisa production?**  
A: Bisa. `pjs build --adapter static` menghasilkan folder `out/` yang siap deploy ke CDN mana pun. CSP-ready, minified, hashed assets.

**Q: Apa bedanya sama vibe coding (pakai ChatGPT)?**  
A: Vibe coding = kamu prompt AI, AI yang nulis kode. PromptJS = kamu nulis kode, tapi dalam format yang *terasa* seperti prompt. Kamu tetap memegang kendali penuh atas logika aplikasi — compiler yang menerjemahkan, bukan AI yang menebak.

**Q: Kenapa indentasi? Kenapa nggak pakai kurung?**  
A: Indentasi = struktur yang dipaksakan. Nggak mungkin ada kode ambigu karena indentasi. Lebih sedikit simbol = lebih sedikit yang perlu diingat. (Ini prinsip yang sama dengan Python.)

---

## Siap ke Tahap Berikutnya?

| Ingin | Buka |
|---|---|
| Tutorial lengkap dari nol sampai app jadi | [First App](first-app.md) |
| Referensi lengkap semua keyword & sintaks | [Syntax Reference](../language/syntax-reference.md) |
| Deploy ke production | [Deployment](deployment.md) |
| Lihat contoh nyata | [Examples](../../examples/) |

---

← [Kembali ke README](../../README.md)
