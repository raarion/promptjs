# PromptJS — Blueprint Eksekusi v0.5 → v1.0
### Jalur Realistis Menuju Full-Stack yang Setia pada Identitas

> **Dokumen ini menggantikan roadmap sebelumnya sepenuhnya.**
> Setiap keputusan telah diaudit terhadap 9 prinsip dasar PromptJS
> dan dikoreksi di mana ditemukan pelanggaran.

---

## Prinsip yang Mengikat Roadmap Ini

Dari Spec v0.2 (prinsip desain) + README (visi identitas):

```
① Zero dependency di production output
② Build tool boleh punya dependency
③ Readability setinggi prompt AI
④ Reactivity eksplisit, bukan auto-tracking
⑤ Tidak ada eval() / new Function()
⑥ Bilingual keyword sebagai prinsip arsitektural
⑦ Jembatan antara coding, vibe-coding, dan prompting
⑧ Zero syntax symbol — mengalir seperti menulis prompt
⑨ Meruntuhkan dinding pembatas dalam belajar pemrograman
```

**Setiap fitur di bawah ini HARUS memperkuat prinsip-prinsip di atas,
bukan memperlemahnya.** Kalau sebuah fitur memperlemah — fitur itu salah.

---

## Arsitektur Modular: Core vs Plugin

Keputusan arsitektural terpenting sebelum eksekusi dimulai:

```
promptjs                             ← CORE: compiler pipeline
│                                      Lexer → Parser → Resolver →
│                                      Analyzer → Compiler
│                                      ──────────────────────────
│                                      Saat ini: 10.984 baris
│                                      Target v1.0: ≤ 11.700 baris
│                                      Pertumbuhan maks: ~6%
│
├── @promptjs/engine                 ← ORCHESTRATOR: pipeline wiring
│   ├── promptjs.js                    + CSS extraction + module system
│   ├── css.js                         Sudah ada (904 baris)
│   └── modules.js                     Bisa terpisah tapi tidak wajib
│
├── @promptjs/cli                    ← TOOLING: compile, serve, build, init
│   └── commands/                      Sudah ada (1.687 baris)
│                                      Boleh membesar (prinsip ②)
│
├── @promptjs/router                 ← PLUGIN: client-side SPA router
│   └── router-runtime.js             ~150 baris, opt-in via front-matter
│                                      Di-embed saat compile jika diaktifkan
│
├── @promptjs/adapter-static         ← PLUGIN: static export (CDN deploy)
├── @promptjs/adapter-node           ← PLUGIN: Node.js server runtime
├── @promptjs/adapter-vercel         ← PLUGIN: Vercel serverless
└── @promptjs/adapter-netlify        ← PLUGIN: Netlify functions
```

**Aturan pemisahan:**
- Kalau mengubah **output compiled JS** → masuk core
- Kalau mengubah **cara file di-serve/deploy** → masuk plugin/CLI
- Kalau **bukan domain DSL** (database, auth server, ORM) → bukan tugas PromptJS

**Catatan implementasi:**
Pada tahap awal, "plugin" tidak harus literal npm package terpisah.
Cukup **file terpisah** di repo yang sama, di-require conditionally.
Splitting ke npm package dilakukan saat user base menuntutnya.

---

## FASE 0 — COMPILER INFRASTRUCTURE (v0.5)
### ⏱ 2–3 minggu · Core bertambah ~300 baris · Cek prinsip: ①③⑤ ✅

Fondasi yang membuat semua fase berikutnya tidak dibangun di atas pasir.
Tidak menyentuh sintaks, tidak mengubah identitas. Murni infrastruktur.

### 0.1 Source Maps

**Apa:** Mapping output JS `line:col` → source `.pjs` `line:col`.

**Kenapa di core:** Ini jurisdiksi compiler — setiap `this.emit()` perlu memancarkan
posisi source bersamaan dengan kode.

**Yang sudah ada:**
- Setiap AST node punya `loc` dengan `start.line`, `start.column` ✅
- Compiler emit komentar `// @source 5:1 BuatStatement` ✅ (bisa dikonversi)

**Yang harus dikerjakan:**
```
compiler/promptjs-compiler.js:
  - Tambah property this.sourceMap = { version: 3, mappings: [], ... }
  - Setiap this.emit(code) → catat mapping output line → source line
  - Method generateSourceMap() → return JSON string

compiler/utils/codegen.js:
  - emit() sekarang menerima optional loc parameter
  - Encode mapping ke format VLQ (Base64)

engine/promptjs.js:
  - compile() return { js, css, sourceMap, ... }
```

**Estimasi:** ~200 baris. Source map V3 = JSON + VLQ encoding, tidak butuh library.

**Di `pjs serve`:** Inline source map (`//# sourceMappingURL=data:...`)
**Di `pjs build`:** File terpisah (`output.js.map`)

### 0.2 Tree Shaking Runtime Helpers

**Apa:** Emit hanya helper yang benar-benar dipakai di output.

**Yang sudah ada:**
- `this.helpers` = Set di compiler ✅ (sudah ada tapi belum dipakai untuk filter)
- Runtime helpers terdaftar: `__createReactive`, `__createComputed`, `__watch`,
  `__setState`, `__createElement`, `__mount`, `__cleanup` (7 buah)
- Builtin helpers: `__promptjs_panjang`, `__promptjs_apakahKosong`, `__promptjs_apakahAda` (3 buah)

**Yang harus dikerjakan:**
```
compiler/emitters/runtime.js:
  - Pisahkan RUNTIME_HELPERS string monolith → object per-helper
  - emitRuntimeHelpers(compiler) → iterate compiler.helpers,
    emit hanya yang ada di Set

compiler/emitters/statements.js:
  - Setiap visitor menambah helper yang dipakai ke this.helpers
  - visitDataDeclaration → this.helpers.add('__createReactive')
  - visitBuatStatement → this.helpers.add('__createElement') — sudah pakai
    document.createElement langsung, jadi sebenarnya __createElement bisa dihapus
  - visitSaatStatement → this.helpers.add('__watch')
```

**Hasil:**
- `Buat h1: "Halo"` → output ~20 baris (bukan 150)
- App dengan reaktivitas → output tetap sama (semua helper dipakai)

**Estimasi:** ~60 baris perubahan (refactor, bukan kode baru).

### 0.3 Error Boundaries

**Apa:** Event handler dan lifecycle hook yang throw error tidak mematikan seluruh halaman.

**Yang harus dikerjakan:**
```
compiler/emitters/statements.js — visitKetikaStatement:
  SEBELUM:
    el.addEventListener("click", (event) => {
      simpan(hitung, hitung.value + 1);
    });

  SESUDAH:
    el.addEventListener("click", (event) => {
      try {
        simpan(hitung, hitung.value + 1);
      } catch(__e) {
        __pjs_handleError(__e, "Halaman", "on_klik");
      }
    });

compiler/emitters/runtime.js — tambah helper baru:
    function __pjs_handleError(error, context, hook) {
      console.error(`[PromptJS] Error di ${context}.${hook}:`, error);
      // Di dev mode: kirim ke error overlay (sudah ada infra di serve.js)
      if (window.__pjsClearError) { /* ... */ }
    }
```

**Estimasi:** ~40 baris.

**Cek prinsip:**
- ① Zero dep: ✅ (try/catch + console.error, no library)
- ⑤ No eval: ✅ (murni codegen statis)

### Deliverable Fase 0
```
□ pjs compile file.pjs → output JS + source map
□ Output tanpa reaktivitas = ≤30 baris (bukan 150)
□ Event handler yang throw → error tertangkap, halaman tetap hidup
□ 100% backward compatible — semua 263 tes tetap lulus
```

---

## FASE 1 — SPA CAPABILITY (v0.6)
### ⏱ 2–3 minggu · Core ~100 baris + Plugin ~150 baris · Cek prinsip: ①③⑧ ✅

### 1.1 Lifecycle Mount/Unmount yang Benar [CORE]

**Masalah saat ini:**
```js
// dipasang → DOMContentLoaded (sekali seumur hidup page)
// dilepas  → beforeunload (hanya saat tab ditutup)
```
Ini tidak cukup untuk SPA. Saat navigasi antar halaman,
halaman lama harus di-unmount (bersihkan watcher, hapus DOM)
dan halaman baru di-mount.

**Perubahan di compiler — visitBuatStatement untuk `Halaman X:`:**

```js
// SEBELUM: langsung append ke document.body
const __el_1 = document.createElement("div");
// ... children ...
document.body.appendChild(__el_1);

// SESUDAH: bungkus dalam factory function
function __page_Beranda() {
  const __root = document.createElement("div");
  __root.id = "beranda";
  // ... children, event listeners, watchers ...

  return {
    el: __root,
    mount(parent) {
      parent.appendChild(__root);
      // jalankan semua dipasang: hooks
    },
    unmount() {
      // jalankan semua dilepas: hooks
      // cleanup semua watcher (__cleanup sudah ada ✅)
      __root.remove();
    }
  };
}

// Auto-mount jika bukan SPA mode:
const __p = __page_Beranda();
__p.mount(document.body);
```

**Kenapa di core:** Ini mengubah BAGAIMANA compiler meng-emit halaman.
Bukan fitur tambahan — ini refactor codegen yang lebih benar.

**Yang harus dilacak compiler:**
- Daftar watcher (`__watch` calls) per halaman → cleanup saat unmount
- Daftar event listener → optional removeEventListener saat unmount
- Daftar `dipasang:` dan `dilepas:` hooks

**Estimasi:** ~100 baris perubahan di `statements.js`.

### 1.2 Client-Side Router [PLUGIN — @promptjs/router]

**Aktivasi di `.pjs`:**
```pjs
---
router: benar
---
```

Compiler melihat `router: benar` di front-matter → embed router runtime di output.
Tanpa `router: benar` → output TIDAK berubah, zero overhead. **(Prinsip ① terjaga.)**

**Runtime router (~150 baris) — di-embed saat compile, bukan di-import:**

```js
function __pjsRouter(routes) {
  let current = null;
  const app = document.getElementById("app");

  function navigate(path, pushState) {
    if (current) current.unmount();
    if (pushState !== false) history.pushState(null, "", path);

    const factory = matchRoute(routes, path);
    if (factory) {
      current = factory();
      current.mount(app);
    }
  }

  function matchRoute(routes, path) {
    // Exact match dulu
    if (routes[path]) return routes[path];
    // Dynamic segments: /blog/:slug
    for (const [pattern, factory] of Object.entries(routes)) {
      if (pattern.includes(":")) {
        const regex = new RegExp("^" + pattern.replace(/:(\w+)/g, "([^/]+)") + "$");
        const match = path.match(regex);
        if (match) return () => factory(extractParams(pattern, match));
      }
    }
    return routes["*"] || null; // 404 fallback
  }

  // Intercept <a href="/internal">
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (a && a.href.startsWith(location.origin) && !a.hasAttribute("external")) {
      e.preventDefault();
      navigate(new URL(a.href).pathname);
    }
  });

  window.addEventListener("popstate", () => navigate(location.pathname, false));
  navigate(location.pathname, false); // Initial route
}
```

**Integrasi di compiler:**
- `builder.js` sudah punya `fileToRoute()` ✅
- Multi-page build sekarang emit route table, bukan `if (window.__PJS_ROUTE__)` guard
- `arahkan "/tentang"` (keyword yang sudah ada ✅) compile ke `__pjsRouter.navigate("/tentang")`
  bukan `window.location.href` — jika `router: benar` aktif

**Integrasi dengan DSL (tidak ada keyword baru — prinsip ⑧ terjaga):**
```pjs
arahkan "/tentang"                 ← sudah ada, sekarang SPA-aware
Buat tautan:                       ← <a href> otomatis di-intercept
    "Tentang Kami"
    href = "/tentang"
```

### Deliverable Fase 1
```
□ Halaman bisa mount/unmount tanpa full reload
□ Navigasi antar halaman = SPA (no flicker, no full reload)
□ Watcher di-cleanup saat halaman unmount (no memory leak)
□ `router: benar` di front-matter → aktifkan router
□ Tanpa `router: benar` → output identik dengan v0.5 (zero regression)
□ arahkan "/path" → SPA navigate, bukan location.href
□ <a href="/internal"> → otomatis SPA navigate
```

---

## FASE 2 — DATA FETCHING (v0.7)
### ⏱ 3–4 minggu · Core ~150 baris · Cek prinsip: ③⑦⑧⑨ ✅

### KEPUTUSAN DESAIN KRITIS: Tidak ada keyword `async`/`await`

**Alasan (dari analisis keselarasan):**
- `async` adalah jargon programmer — melanggar prinsip ⑧ (zero syntax symbol) dan ⑨ (meruntuhkan dinding)
- Orang yang "baru terbiasa berkomunikasi dengan AI" tidak tahu apa itu async
- `Ambil dari URL:` sudah deklaratif dan intuitif — compiler yang memutuskan
  bahwa operasi ini async, bukan developer

**Prinsip:** Kalau compiler bisa menyembunyikan kompleksitas tanpa mengorbankan
kemampuan, ia WAJIB menyembunyikannya. Ini yang membedakan DSL dari bahasa general-purpose.

### 2.1 Memperkuat `Ambil dari` yang Sudah Ada

**Yang sudah ada di v0.4:**
- `AmbilLuarStatement` di AST ✅
- Parser: `_parseAmbilStatement` ✅
- Compiler: `visitAmbilLuarStatement` → emit `fetch().then().catch()` ✅
- Branches: `berhasil:` / `gagal:` / `selalu:` ✅

**Yang belum ada dan harus ditambah:**

#### a) Loading State Otomatis

```pjs
Halaman Produk:
    data produk = []
    data sedangMemuat = benar

    Ambil dari "https://api.com/produk":
        berhasil:
            simpan __data ke produk
        gagal:
            tampilkan "Gagal memuat data"
        selalu:
            simpan salah ke sedangMemuat
```

**Ini sudah bisa ditulis hari ini** — sintaksnya sudah ada.
Yang perlu diperbaiki: compiler harus emit `async/await` wrapper
secara otomatis di balik layar, bukan `.then()` chains yang sulit di-debug.

```js
// SEBELUM (v0.4 — .then chains):
fetch(url, {}).then(r => r.json()).then(data => { ... }).catch(e => { ... })

// SESUDAH (v0.7 — async IIFE yang di-generate compiler):
(async () => {
  try {
    const __response = await fetch(url, {});
    if (!__response.ok) throw new Error("HTTP " + __response.status);
    const __data = await __response.json();
    // berhasil: branch
    __setState(produk, __data);
  } catch (__error) {
    // gagal: branch
    console.error("Gagal memuat data");
  } finally {
    // selalu: branch
    __setState(sedangMemuat, false);
  }
})();
```

**Developer menulis `Ambil dari`. Compiler menulis `async/await`.
Developer TIDAK PERLU TAHU kata "async" ada.** (Prinsip ⑨ ✅)

**Perubahan di compiler:** ~50 baris di `visitAmbilLuarStatement`.

#### b) Request Options (Method, Headers, Body)

```pjs
Ambil dari "https://api.com/produk":
    metode = "POST"
    isi = { nama: "Kopi", harga: 45000 }
    berhasil:
        tampilkan "Berhasil ditambahkan"
```

**Yang sudah ada:** `AmbilLuarStatement` punya `options` array di AST ✅
**Yang belum:** Parser belum mem-parse options sebelum branches.
**Estimasi:** ~40 baris di parser.

#### c) Request Cancellation

Saat halaman unmount (SPA navigate), request yang belum selesai harus di-cancel.
Ini terhubung dengan lifecycle di Fase 1.

```js
// Compiler emit:
const __ctrl = new AbortController();
__cleanupFns.push(() => __ctrl.abort()); // Cleanup saat unmount

(async () => {
  try {
    const __response = await fetch(url, { signal: __ctrl.signal });
    // ...
  } catch (__error) {
    if (__error.name === 'AbortError') return; // Ignore cancel
    // gagal: branch
  }
})();
```

**Estimasi:** ~30 baris di compiler, 0 baris di DSL syntax (otomatis).

### 2.2 Event Modifier `.cegah` [CORE — ~10 baris]

```pjs
Buat form:
    on_dikirim.cegah = jalankan kirimData()
```

Compiler emit:
```js
el.addEventListener("submit", (event) => {
  event.preventDefault();
  kirimData();
});
```

**Perubahan:** Di `visitKetikaStatement`, cek apakah event name mengandung `.cegah`
(atau `.prevent`). Jika ya, emit `event.preventDefault()` sebelum body.

**Bisa diperluas nanti:** `.sekali` (`.once`), `.hentikan` (`.stop` = stopPropagation).

### 2.3 Reactive Rendering untuk Fetch Result

```pjs
Halaman:
    data produk = []
    data sedangMemuat = benar

    Jika sedangMemuat:
        Buat paragraf: "Memuat..."
    Lainnya:
        Ulangi untuk item dari produk:
            Buat div.kartu:
                Buat h3: item.nama

    Ambil dari "/api/produk":
        berhasil:
            simpan __data ke produk
            simpan salah ke sedangMemuat
```

**Ini sudah bisa hari ini** — `Jika`, `Ulangi`, `Saat`, `simpan ... ke ...`
semua sudah ada. Yang perlu dipastikan:
- `Saat produk:` re-render list ketika data berubah ← sudah bisa ✅
- `Jika sedangMemuat:` re-evaluate ketika state berubah ← perlu `Saat` wrapper

**Pola yang harus didokumentasikan (bukan kode baru):**
```pjs
Saat sedangMemuat:
    Jika sedangMemuat:
        Buat paragraf: "Memuat..."
    Lainnya:
        Buat paragraf: "Selesai"
```

### Deliverable Fase 2
```
□ Ambil dari URL: → compiler otomatis emit async/await (developer tidak tahu)
□ Branches berhasil/gagal/selalu bekerja end-to-end
□ Request options: metode, isi, header
□ Request auto-cancel saat halaman unmount (SPA)
□ on_dikirim.cegah = ... → preventDefault otomatis
□ Contoh lengkap: fetch + loading state + error handling + render list
□ TIDAK ADA keyword async/await/tunggu di DSL
```

---

## FASE 3 — FULL-STACK VIA ADAPTER (v0.8)
### ⏱ 3–4 minggu · Core 0 baris · Plugin ~400 baris · Cek prinsip: ①②⑦⑨ ✅

### KEPUTUSAN DESAIN KRITIS: PromptJS Konsumsi API, Tidak Menulis API

**Alasan (dari analisis keselarasan):**

> Roadmap lama mengusulkan API routes ditulis dalam JS biasa (`module.exports = { GET(req) {...} }`).
> Ini MELANGGAR prinsip ⑨: orang yang bisa menulis `module.exports = { async GET(req) { ... } }`
> tidak butuh PromptJS. Orang yang butuh PromptJS tidak bisa menulis itu.
> Dinding pembatas hanya dipindah, bukan diruntuhkan.

**Keputusan:**
- PromptJS adalah **konsumen API**, bukan penulis API
- Backend bisa ditulis dalam bahasa apapun (Express, Hono, Django, Laravel, Go, Rust)
- PromptJS hanya perlu tahu **cara bicara** dengan backend → `Ambil dari URL:` (sudah ada ✅)
- Adapter menangani **cara men-deploy** hasil compile PromptJS

### 3.1 Plugin System [ENGINE — ~80 baris]

Sebelum adapter bisa bekerja, engine butuh mekanisme plugin.

**Aktivasi via `promptjs.config.js`:**
```js
module.exports = {
    adapter: "static",         // atau "node", "vercel", "netlify"
    plugins: [
        require("./my-plugin"),
    ]
};
```

**Atau lebih PromptJS-style, via front-matter (untuk project sederhana):**
```pjs
---
adapter: static
---
```

**4 Transform Hooks:**
```js
// Kontrak plugin:
module.exports = {
    name: "nama-plugin",

    // Hook 1: sebelum compile (ubah source .pjs)
    transformSource(source, filename) { return source; },

    // Hook 2: setelah compile JS (ubah output JS)
    transformJS(js, filename) { return js; },

    // Hook 3: setelah compile CSS (ubah output CSS)
    transformCSS(css, filename) { return css; },

    // Hook 4: setelah generate HTML (ubah final HTML)
    transformHTML(html, filename) { return html; },
};
```

**Implementasi di engine:**
```js
// engine/promptjs.js — di akhir compile():
if (this.plugins) {
    for (const plugin of this.plugins) {
        if (plugin.transformJS) js = plugin.transformJS(js, filename);
        if (plugin.transformCSS) css = plugin.transformCSS(css, filename);
    }
}
```

### 3.2 Adapter: Static Export [PLUGIN — @promptjs/adapter-static, ~80 baris]

**Ini yang sudah hampir ada** — `pjs build` sudah menghasilkan `dist/` ✅.

Yang ditambahkan:
```
pjs build --adapter static

Output:
dist/
├── index.html           ← halaman + <script src="prompt.js">
├── about.html
├── prompt.js            ← bundled JS (semua halaman)
├── prompt.css           ← bundled CSS
├── prompt.js.map        ← source map (dari Fase 0)
└── assets/              ← static assets (copy dari src/assets/)
```

**Tambahan untuk production readiness:**
- Asset hashing: `prompt.a1b2c3.js` (content hash untuk cache busting)
- `<meta>` tags: `og:title`, `og:description`, `canonical`
- `sitemap.xml` auto-generate dari route list
- `404.html` fallback untuk SPA routes

**Deploy ke:** Netlify drag-and-drop, Vercel static, Cloudflare Pages,
GitHub Pages, S3 + CloudFront, atau web server manapun.

### 3.3 Adapter: Node Server [PLUGIN — @promptjs/adapter-node, ~150 baris]

**Untuk app yang butuh SSR atau API proxy:**

```
pjs build --adapter node

Output:
dist/
├── server.js            ← self-contained Node.js server
├── pages/               ← compiled page factories
├── prompt.css
└── assets/
```

`server.js` berisi:
- Static file serving untuk `assets/`, CSS, JS
- Route matching → serve HTML yang sudah di-compile
- Optional: SSR via jsdom (compile → jalankan di jsdom → kirim HTML)
- Optional: API proxy (`/api/*` → forward ke backend URL dari config)

```js
// dist/server.js (yang di-generate adapter):
const http = require("http");
const fs = require("fs");
const path = require("path");

const server = http.createServer((req, res) => {
    const url = req.url.split("?")[0];

    // API proxy
    if (url.startsWith("/api/")) {
        // Forward ke backend yang dikonfigurasi di promptjs.config.js
        proxyTo(config.apiUrl + url, req, res);
        return;
    }

    // Serve static files
    serveStatic(url, res);
});

server.listen(process.env.PORT || 3000);
```

**Deploy ke:** Railway, Fly.io, DigitalOcean App Platform, VPS, Docker.

**Dockerfile template (disediakan oleh `pjs init -t deploy-node`):**
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY dist/ .
EXPOSE 3000
CMD ["node", "server.js"]
```

### 3.4 Adapter: Vercel [PLUGIN — @promptjs/adapter-vercel, ~80 baris]

```
pjs build --adapter vercel

Output:
dist/
├── .vercel/
│   └── output/
│       ├── config.json
│       ├── static/           ← HTML, JS, CSS, assets
│       └── functions/        ← optional API proxy function
└── vercel.json
```

Mengikuti [Vercel Build Output API](https://vercel.com/docs/build-output-api/v3).

### Deliverable Fase 3
```
□ promptjs.config.js loader bekerja
□ 4 transform hooks (source, JS, CSS, HTML) berfungsi
□ pjs build --adapter static → dist/ siap deploy CDN
□ pjs build --adapter node → dist/server.js runnable
□ pjs build --adapter vercel → Vercel Build Output
□ Asset hashing untuk cache busting
□ TIDAK ADA kode backend/API ditulis dalam PromptJS
□ Core compiler: 0 baris tambahan
```

---

## FASE 4 — PROTECTED CONTENT & AUTH PATTERN (v0.9)
### ⏱ 2 minggu · Core ~50 baris · Cek prinsip: ⑦⑧⑨ ✅

### KEPUTUSAN DESAIN KRITIS: Auth = Deklaratif di Front-Matter, Bukan Server Middleware

**Alasan:**
- Session middleware, CSRF tokens, signed cookies = infrastruktur server yang
  sangat jauh dari "menulis prompt" → melanggar ⑦⑧⑨
- Tapi auth **guard di sisi client** bisa diekspresikan secara deklaratif
  dan intuitif → sejalan dengan semua prinsip

### 4.1 Protected Routes via Front-Matter [CORE — ~30 baris]

```pjs
---
butuhAuth: benar
redirect: "/login"
token: localStorage
---

Halaman Dashboard:
    Buat h1: "Selamat datang di dashboard"
```

**Compiler emit:**
```js
(function() {
    // Auth guard (generated by PromptJS)
    const __token = localStorage.getItem("auth_token");
    if (!__token) {
        window.location.href = "/login";
        return;
    }

    // ... page content ...
})();
```

**Variasi:**
```pjs
---
butuhAuth: benar
redirect: "/login"
token: sessionStorage      ← atau cookie, atau custom
peran: "admin"             ← optional role check
---
```

**Kenapa ini selaras:**
- `butuhAuth: benar` ← bisa dibaca seperti kalimat biasa (⑧ ✅)
- Implementasi detail (localStorage, redirect) disembunyikan compiler (⑨ ✅)
- Tidak ada simbol baru, tidak ada keyword baru (③ ✅)

### 4.2 Login Form Pattern [TIDAK ADA KODE BARU — hanya pattern]

```pjs
Halaman Login:
    data email = ""
    data sandi = ""
    data galat = ""

    Buat form:
        Buat masukan:
            tipe = "email"
            placeholder = "Email"
            on_diubah = simpan event.target.value ke email

        Buat masukan:
            tipe = "password"
            placeholder = "Sandi"
            on_diubah = simpan event.target.value ke sandi

        Buat tombol:
            "Masuk"

        on_dikirim.cegah = Ambil dari "/api/auth/login":
            metode = "POST"
            isi = { email: email, sandi: sandi }
            berhasil:
                simpan __data.token ke localStorage.auth_token
                arahkan "/dashboard"
            gagal:
                simpan "Email atau sandi salah" ke galat

    Jika galat:
        Buat paragraf.error: galat
```

**Ini sudah bisa ditulis dengan fitur yang ada + Fase 2.**
Tidak butuh kode baru — hanya dokumentasi dan contoh template.

### 4.3 Logout [TIDAK ADA KODE BARU]

```pjs
Buat tombol:
    "Keluar"
    on_klik = hapus localStorage.auth_token
    on_klik = arahkan "/login"
```

**Catatan:** `hapus localStorage.auth_token` perlu
lowering `hapus` pada MemberExpression → `localStorage.removeItem("auth_token")`.
Ini ~10 baris di expression lowering.

### 4.4 Fetch dengan Auth Header [TIDAK ADA KODE BARU]

```pjs
Ambil dari "/api/profil":
    header = { Authorization: "Bearer " + localStorage.auth_token }
    berhasil:
        simpan __data ke profil
```

**Ini sudah didukung** oleh `AmbilLuarStatement` options ✅.

### Deliverable Fase 4
```
□ butuhAuth: benar di front-matter → auth guard di output
□ redirect: "/login" → redirect kalau tidak auth
□ token: localStorage/sessionStorage → configurable
□ Contoh lengkap: login form + protected dashboard + logout
□ Core compiler: ~50 baris (auth guard codegen + localStorage lowering)
□ TIDAK ADA session middleware, CSRF library, atau server auth logic
```

---

## FASE 5 — POLISH, ECOSYSTEM & v1.0 RELEASE
### ⏱ 2–3 minggu · Core ~0 baris · Tooling + docs

### 5.1 Template `pjs init` yang Lengkap

```bash
pjs init -t landing      # Landing page (sudah ada ✅)
pjs init -t counter      # Counter interaktif (sudah ada ✅)
pjs init -t gallery      # Galeri data-driven (sudah ada ✅)
pjs init -t spa          # Multi-page SPA dengan router     [BARU]
pjs init -t fullstack    # SPA + auth + fetch API            [BARU]
pjs init -t blog         # Blog statis dari JSON/Markdown    [BARU]
```

### 5.2 Contoh App Nyata (Proof of Concept)

Minimal 2 app demo yang bisa di-deploy:

**App 1: Todo List + API** (deploy ke Vercel static + external API)
```
examples/
└── todo-app/
    ├── src/pages/
    │   ├── index.pjs        ← halaman utama + CRUD
    │   └── login.pjs        ← login form
    ├── promptjs.config.js   ← adapter: static, apiUrl: "https://..."
    └── README.md            ← cara deploy
```

**App 2: Portfolio Multi-Page** (deploy ke Netlify)
```
examples/
└── portfolio/
    ├── src/pages/
    │   ├── index.pjs        ← beranda
    │   ├── proyek.pjs       ← daftar proyek
    │   └── tentang.pjs      ← tentang saya
    ├── src/assets/
    └── promptjs.config.js   ← adapter: static
```

### 5.3 Dokumentasi v1.0

- **Tutorial "Dari Nol ke Deploy"** — 30 menit, dari `pjs init` sampai live di internet
- **Referensi Sintaks Lengkap** — setiap keyword, setiap event alias, setiap tag alias
- **Cookbook** — pattern untuk: auth, fetch, form, conditional rendering, list, komponen
- **Migration Guide** — dari HTML biasa ke `.pjs`
- **Plugin Authoring Guide** — cara buat adapter/plugin

### 5.4 CI/CD Pipeline Lengkap

```yaml
# .github/workflows/ci.yml
- lint + format check
- typecheck
- unit tests (263+ tests)
- compile all examples (smoke test)
- build with each adapter (static, node, vercel)
- deploy examples to GitHub Pages
```

### Deliverable Fase 5
```
□ 6 template init (3 existing + 3 new)
□ 2 app demo yang bisa di-deploy
□ Tutorial "Dari Nol ke Deploy"
□ Referensi sintaks lengkap
□ CI green di Node 20/22/24
□ npm publish: promptjs, @promptjs/router, @promptjs/adapter-*
□ GitHub Pages showcase dengan semua contoh
```

---

## RINGKASAN TIMELINE

```
                       SEKARANG (v0.4)
                           │
FASE 0 ── v0.5 ──────────►│  Source maps · tree shake · error boundaries
(2-3 minggu)               │  Core: +300 baris
                           │
FASE 1 ── v0.6 ──────────►│  Lifecycle · SPA router (opt-in plugin)
(2-3 minggu)               │  Core: +100 baris │ Plugin: +150 baris
                           │
FASE 2 ── v0.7 ──────────►│  Ambil dari (diperkuat) · .cegah · auto-cancel
(3-4 minggu)               │  Core: +150 baris │ TANPA keyword async
                           │
FASE 3 ── v0.8 ──────────►│  Plugin system · adapter static/node/vercel
(3-4 minggu)               │  Core: +0 baris │ Plugin: +400 baris
                           │
FASE 4 ── v0.9 ──────────►│  butuhAuth: benar · auth pattern · login flow
(2 minggu)                 │  Core: +50 baris │ Sisanya = pattern + docs
                           │
FASE 5 ── v1.0 ──────────►│  Templates · demo apps · docs · npm publish
(2-3 minggu)               │  Core: +0 baris │ Ecosystem + polish
                           │
                        ~14-19 MINGGU
                        (~3.5-5 BULAN)
```

---

## NERACA PERTUMBUHAN CORE

```
v0.4 (sekarang):      10.984 baris ─── baseline
                          │
Fase 0 (+300):         11.284 baris ─── source maps, tree shake, error boundaries
Fase 1 (+100):         11.384 baris ─── lifecycle mount/unmount
Fase 2 (+150):         11.534 baris ─── Ambil dari perkuat, .cegah
Fase 3 (+0):           11.534 baris ─── plugin system di engine, bukan core
Fase 4 (+50):          11.584 baris ─── auth guard codegen
Fase 5 (+0):           11.584 baris ─── docs & ecosystem
                          │
v1.0:                  11.584 baris ─── pertumbuhan total: +600 baris (5.5%)
```

**Bandingkan:**
- Roadmap lama (sebelum koreksi): ~+2.000 baris ke core (18%) ← GEMUK
- Roadmap ini (setelah koreksi): ~+600 baris ke core (5.5%) ← RAMPING

Seluruh fitur "full-stack" tetap tersedia, tapi hidup di plugin (~700 baris)
yang hanya di-embed jika diaktifkan.

---

## TABEL KELEMAHAN: SEBELUM vs SESUDAH

| Kelemahan | Tertutup di | Status | Cara |
|---|---|---|---|
| Routing dinamis → primitif | Fase 1 | ✅ | SPA router plugin, opt-in |
| State management → lokal | Fase 1 | ✅ | Module `kirim`/`terima` (sudah ada) + router context |
| SSR / Hydration → fake | Fase 3 | ⚠️ | SSR on-demand via adapter-node; real hydration = v1.1 |
| HTTP/API calls → belum | Fase 2 | ✅ | `Ambil dari` diperkuat; compiler auto-async |
| Form handling → manual | Fase 2 | ✅ | `.cegah` modifier; binding sudah ada |
| Error boundaries → tidak ada | Fase 0 | ✅ | try/catch di handlers + `__pjs_handleError` |
| Source maps → tidak ada | Fase 0 | ✅ | V3 source map, inline (dev) + file (build) |
| Tree shaking → tidak ada | Fase 0 | ✅ | Emit hanya helper yang dipakai |
| Plugin system → tidak ada | Fase 3 | ✅ | 4 transform hooks + config loader |
| Client-side routing | Fase 1 | ✅ | `@promptjs/router`, pushState + popstate |
| API integration | Fase 2 | ✅ | `Ambil dari` + auto-async + options |
| Backend/server | Fase 3 | ✅ | Adapter pattern; PromptJS konsumsi, tidak menulis |
| Authentication | Fase 4 | ✅ | `butuhAuth: benar` di front-matter; client-side guard |
| Deployment matang | Fase 3+5 | ✅ | Adapter static/node/vercel + asset hash + templates |

---

## 5 KEPUTUSAN YANG MEMBEDAKAN BLUEPRINT INI

### ❶ Tidak ada keyword `async`/`await`/`tunggu`

**Compiler menyembunyikan async di balik `Ambil dari`.**
Developer menulis instruksi deklaratif. Compiler menulis kode imperatif.
Ini bukan limitasi — ini desain yang sadar: membuang kompleksitas
yang tidak perlu diketahui pengguna.

### ❷ Tidak ada API routes dalam PromptJS

**PromptJS konsumsi API, tidak menulis API.**
Backend = bahasa apa saja, framework apa saja.
PromptJS hanya perlu tahu URL-nya.
Ini menjaga scope DSL tetap fokus dan tidak mengkhianati visi ⑨.

### ❸ Router = plugin opt-in, bukan default

**`router: benar` di front-matter = embed router.**
Tanpa itu = output tetap kecil, tanpa overhead.
Ini menjaga prinsip ① (zero dep output yang BENAR-BENAR minimal).

### ❹ Auth = deklaratif di front-matter, bukan server middleware

**`butuhAuth: benar` → compiler emit guard code.**
Session management, CSRF, signed cookies = tugas backend.
PromptJS hanya mendeklarasikan "halaman ini butuh auth."

### ❺ Core tumbuh 5.5%, bukan 18%

**Semua fitur "berat" hidup di plugin yang di-embed saat compile.**
Core compiler tetap fokus pada satu hal:
mengubah `.pjs` menjadi vanilla JS yang indah.

---

## SETELAH v1.0

```
v1.1  → Real hydration (marker-based, skip createElement saat hydrate)
v1.2  → LSP (Language Server Protocol) — autocomplete, go-to-def, hover docs
v1.5  → Component library bawaan (Dialog, Toast, Form, Table — ditulis di .pjs)
v2.0  → Rust/Go compiler port (binary tunggal, 10x faster compile)
```

Tapi itu semua setelah v1.0 terbukti bisa membuat app nyata
yang di-deploy dan dipakai manusia sungguhan.
Fitur terbaik bukan yang paling canggih — tapi yang paling berguna.
