# Perjalanan Onboarding / The Onboarding Journey

> docs/user/ > Getting Started (Narrative Companion)
>
> Pendamping naratif untuk [getting-started.md](getting-started.md), [installation.md](installation.md), [quick-start.md](quick-start.md), dan [first-app.md](first-app.md). Halaman ini menceritakan *alur* belajar — bukan menggantikan referensi teknis, melainkan merangkainya menjadi satu perjalanan.
>
> A narrative companion to the reference pages. This page tells the *story* of learning PromptJS — it does not replace the technical reference, it threads those pages into a single journey.

---

## Untuk Siapa Halaman Ini? / Who Is This For?

Kalau ini pertama kalinya kamu mendengar PromptJS, mulailah dari sini. Halaman ini ditulis untuk kamu yang baru, yang mungkin pernah merasa belajar pemrograman itu seperti menembus tembok: terlalu banyak simbol, terlalu banyak aturan, terlalu sedikit yang masuk akal di awal. PromptJS dibangun justru untuk meruntuhkan tembok itu — menjadikan bahasa sebagai jembatan, bukan penghalang.

If this is your first time hearing about PromptJS, start here. This page is written for newcomers — for anyone who has felt that learning to program is like hitting a wall: too many symbols, too many rules, too little that makes sense at the start. PromptJS was built precisely to break down that wall — to make language a bridge, not a barrier.

Tidak ada prasyarat selain rasa ingin tahu. Kamu tidak perlu sudah jago JavaScript. Kamu tidak perlu hafal istilah. Yang kamu butuhkan cuma satu: kemauan untuk menulis baris pertama.

There are no prerequisites beyond curiosity. You don't need to know JavaScript already. You don't need to memorize jargon. All you need is one thing: the willingness to write your first line.

---

## Lima Perhentian dalam Perjalananmu / Five Stops on Your Journey

Bayangkan onboarding PromptJS sebagai perjalanan dengan lima perhentian. Setiap perhentian punya satu tujuan kecil yang jelas, dan setiap perhentian sudah punya halaman referensinya sendiri. Tugas halaman ini adalah memberitahumu *kenapa* kamu berhenti di sana dan *apa* yang kamu bawa ke perhentian berikutnya.

Picture PromptJS onboarding as a journey with five stops. Each stop has one small, clear goal, and each already has its own reference page. This page's job is to tell you *why* you stop there and *what* you carry to the next stop.

### Perhentian 1 — Memahami "Kenapa" / Stop 1 — Understanding the "Why"

Sebelum mengetik apa pun, luangkan lima menit untuk membaca [Getting Started](getting-started.md). Di sana kamu akan tahu bahwa PromptJS adalah bahasa frontend deklaratif dwibahasa yang dikompilasi menjadi JavaScript vanilla — tanpa framework, tanpa virtual DOM, tanpa runtime dependency. File `.pjs` kamu melewati pipeline lima tahap (Lexer, Parser, Resolver, Analyzer, Compiler) dan keluar sebagai kode JS murni yang langsung memanipulasi DOM.

Before typing anything, spend five minutes reading [Getting Started](getting-started.md). There you'll learn that PromptJS is a bilingual declarative frontend language that compiles to vanilla JavaScript — no framework, no virtual DOM, no runtime dependency. Your `.pjs` file travels through a five-stage pipeline (Lexer, Parser, Resolver, Analyzer, Compiler) and comes out as pure JS that manipulates the DOM directly.

Yang perlu kamu bawa dari perhentian ini hanyalah satu kalimat — motto bahasa ini:

The only thing you need to carry from this stop is one sentence — the language's motto:

> Tulis dengan Bahasa yang Kamu Pahami, dan Hasilkan Kode yang Dunia Mengerti.
>
> Write in the Language You Understand, and Produce Code the World Understands.

Kalau kamu paham kalimat itu, kamu sudah paham jiwa PromptJS. Sisanya tinggal latihan.

If you understand that sentence, you already understand the soul of PromptJS. The rest is just practice.

### Perhentian 2 — Menyiapkan Alat / Stop 2 — Setting Up the Tools

Perhentian kedua adalah [Installation](installation.md). Di sinilah niat berubah menjadi kesiapan. Yang kamu butuhkan cuma **Node.js ≥ 20.19.0** dan npm yang sudah menyertai Node. Tidak ada lagi yang harus dipasang di sisi *runtime* — karena output PromptJS adalah JavaScript vanilla yang jalan di browser mana pun.

The second stop is [Installation](installation.md). This is where intent becomes readiness. All you need is **Node.js ≥ 20.19.0** and the npm that ships with Node. Nothing else needs to be installed on the *runtime* side — because PromptJS output is vanilla JavaScript that runs in any browser.

Cara tercepat memasangnya adalah lewat npm:

The fastest way to install is via npm:

```bash
npm install prompt-js
```

Perhatikan: nama paket di npm adalah `prompt-js` (dengan tanda hubung), tapi perintah yang kamu jalankan tetap `pjs`. Setelah terpasang, satu perintah membuktikan semuanya beres:

Note: the npm package name is `prompt-js` (with a hyphen), but the command you run is still `pjs`. Once installed, one command proves everything is ready:

```bash
pjs version
```

Kalau terminal membalas `PromptJS v1.0.0`, kamu sudah resmi siap. Kalau belum, halaman [Installation](installation.md) punya bagian *Troubleshooting* untuk dua masalah paling umum: `pjs: command not found` dan versi Node yang terlalu lama.

If the terminal replies `PromptJS v1.0.0`, you are officially ready. If not, the [Installation](installation.md) page has a *Troubleshooting* section for the two most common issues: `pjs: command not found` and an outdated Node version.

### Perhentian 3 — Lima Menit Pertama / Stop 3 — Your First Five Minutes

Sekarang bagian yang menyenangkan. [Quick Start](quick-start.md) membawamu dari nol ke halaman PromptJS pertama yang hidup di browser, dalam lima langkah. Tidak perlu menulis dari awal — CLI menyediakan enam template siap pakai, dari `counter` yang sederhana sampai `fullstack` dengan auth dan routing.

Now the fun part. [Quick Start](quick-start.md) takes you from zero to your first PromptJS page living in a browser, in five steps. You don't have to write from scratch — the CLI provides six ready-to-use templates, from the simple `counter` to a `fullstack` one with auth and routing.

Alurnya terasa seperti ritme: *scaffold, lalu lihat, lalu ubah*.

The flow feels like a rhythm: *scaffold, then look, then change*.

```bash
pjs init -t counter aplikasi-saya   # buat proyek / scaffold
cd aplikasi-saya
pjs serve                            # jalankan dev server / run dev server
```

Buka `http://localhost:3000`, dan di situlah keajaiban kecilnya: dev server mengompilasi file `.pjs` secara *on-the-fly*, lalu memuat ulang browser otomatis lewat WebSocket setiap kali kamu menyimpan perubahan. Ubah satu kata, simpan, dan layar langsung memperbarui dirinya. Inilah saat banyak pemula pertama kali merasa, "Oh, ini aku yang mengendalikan."

Open `http://localhost:3000`, and there's the small magic: the dev server compiles `.pjs` files *on-the-fly*, then auto-reloads the browser via WebSocket every time you save. Change a word, save, and the screen updates itself. This is the moment many beginners first feel, "Oh — *I* am the one in control."

Jangan terburu-buru ke perhentian berikutnya. Di perhentian ketiga ini, izinkan dirimu bermain: ganti angka, ganti teks, klik tombol, dan amati. Eksperimen yang berani jauh lebih berharga daripada hafalan yang rapi.

Don't rush to the next stop. At this third stop, let yourself play: change numbers, change text, click buttons, and observe. Brave experimentation is worth far more than tidy memorization.

### Perhentian 4 — Membangun yang Pertama dengan Sungguh-sungguh / Stop 4 — Building Your First, for Real

Saat template sudah terasa nyaman, [First App](first-app.md) mengajakmu membangun sesuatu yang benar-benar milikmu. Di sinilah konsep-konsep inti PromptJS mulai berkenalan satu per satu: cara `Buat`/`Create` melahirkan elemen, cara `data` membuat keadaan menjadi reaktif, cara `Saat`/`Watch` mengawasi perubahan, dan cara `Ketika`/`When` menangani interaksi pengguna.

When the templates feel comfortable, [First App](first-app.md) invites you to build something truly yours. This is where PromptJS's core concepts are introduced one by one: how `Buat`/`Create` brings elements to life, how `data` makes state reactive, how `Saat`/`Watch` observes change, and how `Ketika`/`When` handles user interaction.

Kunci yang membuat PromptJS terasa berbeda di perhentian ini adalah **reaktivitas yang eksplisit**. Kamu memutuskan apa yang reaktif dengan mendeklarasikannya sebagai `data` atau `turunan`, lalu mengawasinya dengan `Saat`. Tidak ada "sihir" auto-tracking yang berjalan diam-diam di belakangmu — semua yang berubah, berubah karena kamu memintanya. Buat banyak orang, justru di sinilah pemrograman mulai terasa jujur dan bisa dipercaya.

The key that makes PromptJS feel different at this stop is **explicit reactivity**. You decide what is reactive by declaring it as `data` or `turunan`, then watching it with `Saat`. There is no auto-tracking "magic" running silently behind you — everything that changes, changes because you asked it to. For many people, this is exactly where programming starts to feel honest and trustworthy.

### Perhentian 5 — Membawa Karya ke Dunia / Stop 5 — Taking Your Work to the World

Perhentian terakhir adalah saat aplikasimu siap dilihat orang lain: [Deployment](deployment.md). Satu perintah, `pjs build`, secara otomatis mendeteksi apakah proyekmu adalah SPA (kalau ada folder `pages/` dengan halaman ber-`router: benar`) atau MPA, lalu menghasilkan output produksi yang sesuai.

The final stop is when your app is ready for others to see: [Deployment](deployment.md). A single command, `pjs build`, automatically detects whether your project is an SPA (if there's a `pages/` folder with a page using `router: benar`) or an MPA, then produces the matching production output.

PromptJS menyediakan tiga adapter deployment bawaan — `static` (untuk CDN dengan asset hashing dan sitemap), `node` (server mandiri lengkap dengan Dockerfile), dan `vercel` (Build Output API v3). Pilih yang sesuai dengan tujuanmu, jalankan build, dan karyamu siterbang ke dunia sebagai JavaScript vanilla murni — ringan, tanpa beban runtime.

PromptJS provides three built-in deployment adapters — `static` (for a CDN with asset hashing and a sitemap), `node` (a self-contained server with a Dockerfile), and `vercel` (Build Output API v3). Pick the one that fits your goal, run the build, and your work takes flight into the world as pure vanilla JavaScript — light, with no runtime burden.

---

## Peta Perjalanan dalam Sekejap / The Journey at a Glance

| Perhentian / Stop | Tujuan / Goal | Halaman / Page |
|---|---|---|
| 1 — Memahami "Kenapa" / The "Why" | Pahami jiwa & motto bahasa / Grasp the soul & motto | [Getting Started](getting-started.md) |
| 2 — Menyiapkan Alat / Tools | Pasang Node + `pjs`, verifikasi versi / Install Node + `pjs`, verify | [Installation](installation.md) |
| 3 — Lima Menit Pertama / First 5 Minutes | Scaffold, serve, lihat live reload / Scaffold, serve, see live reload | [Quick Start](quick-start.md) |
| 4 — Membangun Sungguh-sungguh / Build for Real | Kuasai `Buat`, `data`, `Saat`, `Ketika` / Master the core keywords | [First App](first-app.md) |
| 5 — Membawa ke Dunia / To the World | Build + pilih adapter + deploy / Build + adapter + deploy | [Deployment](deployment.md) |

---

## Tersesat? Itu Wajar / Lost? That's Normal

Tersesat di tengah jalan bukan tanda kamu gagal — itu tanda kamu sedang belajar sungguhan. Saat sebuah istilah terasa asing, buka [Glosarium](../reference/glossary.md): setiap kata kunci Indonesia punya padanan English dan deskripsi singkat. Saat sebuah error muncul di layar, jangan panik — pesan error PromptJS sengaja ditulis ramah, lengkap dengan kode dan saran perbaikan, dan semuanya terdaftar di [Error Codes](../reference/error-codes.md).

Getting lost along the way isn't a sign of failure — it's a sign you're truly learning. When a term feels unfamiliar, open the [Glossary](../reference/glossary.md): every Indonesian keyword has an English counterpart and a short description. When an error appears on screen, don't panic — PromptJS error messages are deliberately friendly, complete with a code and a suggested fix, all catalogued in [Error Codes](../reference/error-codes.md).

Dan kalau kamu benar-benar baru di dunia coding, ketahuilah: PromptJS Academy sedang disiapkan khusus untukmu — modul ajar berurutan dari "Apa itu coding" sampai proyek full-stack. Kisah lengkapnya ada di [Roadmap](../project/roadmap-narrative.md).

And if you're entirely new to coding, know this: the PromptJS Academy is being prepared just for you — sequential learning modules from "What is coding" all the way to a full-stack project. The full story is in the [Roadmap](../project/roadmap-narrative.md).

---

← [Getting Started](getting-started.md) · [Glossary →](../reference/glossary.md)
