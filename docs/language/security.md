# Keamanan / Security

> docs/language/ → **Security**
> ← [Auth](auth.md) · [Components](components.md) →

---

> ⚠️ **MODEL KEAMANAN / SECURITY MODEL**
>
> PromptJS bersikap **default ramah, fail-closed**: penulis halaman menulis
> markup tingkat tinggi, dan kompilator menyisipkan lapisan pertahanan secara
> otomatis. Konstruksi yang berpotensi berbahaya (innerHTML tak-tepercaya,
> atribut `on*`, URL `javascript:`) **diblokir secara diam-diam pada runtime**,
> bukan diteruskan. Tidak ada *opt-in* yang diperlukan untuk perlindungan dasar.
>
> Namun **auth guard bersifat client-side/advisory** — ia memandu alur UX, BUKAN
> menggantikan otorisasi server. Lihat [Auth](auth.md) dan bagian *Auth Guard* di
> bawah.
>
> ⚠️ *PromptJS is **friendly-by-default, fail-closed**: dangerous constructs are
> blocked at runtime, no opt-in needed. The auth guard, however, is
> **client-side/advisory** — never a substitute for server-side authorization.*

---

PromptJS memperlakukan setiap nilai yang berasal dari file `.pjs`, data
front-matter, atau input pengguna sebagai **tak-tepercaya**. Semua jalur yang
dapat menulis HTML atau atribut DOM dialirkan melalui titik tunggal yang
men-sanitasi nilai sebelum menyentuh dokumen. Semua logika keamanan dikompilasi
menjadi JavaScript vanila — tidak ada dependensi runtime eksternal.

PromptJS treats every value originating from a `.pjs` file, front-matter data,
or user input as **untrusted**. All paths that can write HTML or DOM attributes
are funneled through single choke points that sanitize the value before it
touches the document. All security logic compiles to vanilla JavaScript — no
external runtime dependency.

---

## Ringkasan Lapisan / Layer Overview

| Lapisan / Layer | Helper / Flag | Sumber Kode / Source | Sifat / Nature |
|-----------------|---------------|----------------------|----------------|
| Sanitasi HTML / HTML sanitization | `__sanitizeHTML` | `runtime.js:173–242` | Fail-closed, otomatis / automatic |
| Atribut aman / Safe attributes | `__safeAttr` | `runtime.js:244–265` | Fail-closed, otomatis / automatic |
| Auth guard peran / Role guard | `__pjs_verifyPeran` (seam) | `promptjs-compiler.js:136–156` | Client-side / advisory |
| Peringatan keamanan / Security warnings | `PJS-W1001`, `PJS-W1002` | `runtime.js:250, 257` | Runtime, console |
| Error keamanan / Security errors | `E5004`, `E5005` | `error-codes.js:124–125` | Compile-time, fail-closed |
| Penahanan path / Path containment | `isInsideRoot`, `safeResolve` | `utils/path-guard.js` | Fail-closed, otomatis / automatic |
| Content-Security-Policy | `--csp` / `config.csp` | `build.js:54`, `config.js:164–166`, `static.js:165–181` | Build-time, opt-in |

---

## Sanitasi HTML / HTML Sanitization

`__sanitizeHTML` adalah titik tunggal yang dilewati **setiap** penetapan
`innerHTML` yang dihasilkan kompilator (`statements.js:44`, `statements.js:641`,
`expression.js:260`). Helper memakai **allowlist** tag & atribut: tag di luar
daftar dihapus, atribut `on*` dan atribut pembawa-URL dengan skema
`javascript:`/`data:`/`vbscript:` dibuang, dan komentar HTML dihapus.

`__sanitizeHTML` is the single choke point through which **every**
compiler-generated `innerHTML` assignment passes. It uses an **allowlist** of
tags & attributes: non-listed tags are stripped, `on*` attributes and URL
attributes with `javascript:`/`data:`/`vbscript:` schemes are removed, and HTML
comments are dropped.

```pjs
data jahat = "<img src=x onerror=alert(1)><script>steal()</script>Hai"

Halaman:
    Buat div#keluar
        atur isi ke jahat
```

Output dikompilasi menyalurkan nilai lewat helper (bukan penetapan langsung):

The compiled output routes the value through the helper (never a raw
assignment):

```js
keluar.innerHTML = __sanitizeHTML(jahat);
// Hasil DOM / Resulting DOM: <img src="x">Hai
// → <script> dihapus (tag tak diizinkan), onerror dibuang (atribut on*)
// → <script> stripped (disallowed tag), onerror removed (on* attribute)
```

**Tag yang diizinkan / Allowed tags:** elemen teks & struktur umum (`A`, `B`,
`P`, `DIV`, `SPAN`, `UL`, `OL`, `LI`, `TABLE`, `IMG`, `H1`–`H6`, dll.).
**Atribut yang diizinkan / Allowed attributes:** `href`, `src`, `alt`, `title`,
`colspan`, `rowspan`, `id`, `class` — dengan `href`/`src` wajib lolos
pengecekan skema URL.

> 💡 **Catatan / Note:** Untuk HTML kaya tak-tepercaya yang kompleks, gunakan
> pustaka khusus seperti **DOMPurify** sebelum menyerahkan nilai ke PromptJS.
> `__sanitizeHTML` adalah pertahanan baseline, bukan pengganti sanitizer penuh.
>
> *For complex untrusted rich HTML, pre-sanitize with a dedicated library such
> as DOMPurify; `__sanitizeHTML` is a baseline defense, not a full replacement.*

---

## Atribut Aman / Safe Attributes

`__safeAttr` adalah titik tunggal untuk **setiap** `setAttribute` dinamis
(`statements.js:65`). Helper menolak dua kelas serangan dan mengembalikan
`false` saat memblokir:

`__safeAttr` is the single choke point for **every** dynamic `setAttribute`
(`statements.js:65`). It rejects two attack classes and returns `false` when it
blocks:

1. **Atribut event-handler inline** (`onclick`, `onerror`, `onmouseover`, …) —
   ditolak total (semua nama berawalan `on`).
2. **Atribut pembawa-URL** (`href`, `src`, `action`, `formaction`, `poster`,
   `xlink:href`, `background`, `cite`, `srcset`, `data`) dengan skema
   `javascript:`/`data:`/`vbscript:` — ditolak.

```pjs
Buat tombol#kirim[onclick="jahat()"]: "Kirim"
Buat tautan#luar[href="javascript:alert(1)"]: "Klik"
```

```js
// on* diblokir → atribut tidak pernah ter-set, PJS-W1001 di console
__safeAttr(kirim, "onclick", "jahat()");   // false (diblokir)
// skema URL berbahaya diblokir → PJS-W1002 di console
__safeAttr(luar, "href", "javascript:alert(1)"); // false (diblokir)
```

Sifat **fail-closed**: bila ragu, atribut tidak di-set. Nilai aman (mis.
`href="/beranda"`, `src="https://…"`) lolos normal.

**Fail-closed** by nature: when in doubt, the attribute is not set. Safe values
(e.g. `href="/beranda"`, `src="https://…"`) pass through normally.

---

## Auth Guard & Peran / Auth Guard & Roles

Auth guard memeriksa token di storage sebelum mengeksekusi kode halaman, lalu
(opsional) memeriksa peran. **Multi-peran didukung** lewat daftar dipisah-koma,
dengan normalisasi `trim`/`lowercase` (`promptjs-compiler.js:139–148`).

The auth guard checks a storage token before executing page code, then
optionally checks a role. **Multi-role is supported** via a comma-separated
list, with `trim`/`lowercase` normalization (`promptjs-compiler.js:139–148`).

```pjs
---
butuhAuth: benar
redirect: "/login"
token: localStorage
tokenKey: auth_token
peran: admin,editor
---

Halaman Dashboard:
    Buat judul: "Panel Admin/Editor"
```

```js
var __peran = localStorage.getItem('__peran');
var __allowedPeran = "admin,editor";
var __allowedList = String(__allowedPeran).split(',').map(function(s){return s.trim().toLowerCase();});
var __peranNorm = __peran == null ? '' : String(__peran).trim().toLowerCase();
var __peranOk = __allowedList.indexOf(__peranNorm) !== -1;
if (typeof window !== 'undefined' && typeof window.__pjs_verifyPeran === 'function') {
  __peranOk = !!window.__pjs_verifyPeran(__peran, __allowedPeran);
} else if (typeof console !== 'undefined') {
  console.warn('[PromptJS] Pemeriksaan peran bersifat client-side/advisory — verifikasi otorisasi WAJIB di server. Pasang window.__pjs_verifyPeran untuk validasi sungguhan.');
}
if (!__peranOk) { window.location.href = '/login'; return; }
```

### Seam Verifikasi Server / Server Verification Seam

`window.__pjs_verifyPeran(peran, allowed)` adalah **titik kait (seam)** agar
developer memasang verifikasi sungguhan (mis. memeriksa klaim JWT terhadap
endpoint server). Bila fungsi ini terdaftar dan mengembalikan nilai falsy, akses
ditolak. Bila tidak terdaftar, guard hanya bersifat advisory dan menampilkan
peringatan sekali jalan.

`window.__pjs_verifyPeran(peran, allowed)` is a **seam** for developers to plug
in real verification (e.g. checking JWT claims against a server endpoint). If
registered and it returns a falsy value, access is denied. If not registered,
the guard is advisory only and emits a one-time warning.

```js
// Pasang sebelum kode halaman PromptJS berjalan
// Install before PromptJS page code runs
window.__pjs_verifyPeran = function (peran, allowed) {
  // Contoh: validasi terhadap sesi server / Example: validate against server session
  return fetch('/api/verify-role', { credentials: 'include' })
    .then(function (r) { return r.ok; }); // → kembalikan boolean sinkron di produksi nyata
};
```

> ⚠️ **Auth guard BUKAN keamanan sungguhan / The auth guard is NOT real
> security.** Nilai `__peran` di `localStorage` dapat dipalsukan via DevTools.
> Otorisasi sesungguhnya **WAJIB** di server. Lihat [Auth](auth.md) untuk
> peringatan lengkap dan rujuk roadmap server-side untuk arah ke depan.
>
> *The `__peran` value can be forged via DevTools; real authorization MUST live
> on the server.*

---

## Peringatan Keamanan Berkode / Coded Security Warnings

Helper runtime memancarkan peringatan **berformat berkode** ke `console.warn`
saat memblokir konstruksi berbahaya. Format konsisten:
`[PromptJS] PJS-WXXXX: pesan (saran: …)`.

Runtime helpers emit **coded, structured** warnings to `console.warn` when they
block a dangerous construct. Consistent format:
`[PromptJS] PJS-WXXXX: message (suggestion: …)`.

| Kode / Code | Pemicu / Trigger | Sumber / Source | Penanganan / Handling |
|-------------|------------------|-----------------|------------------------|
| `PJS-W1001` | Atribut event-handler inline (`on*`) diblokir / Inline `on*` event-handler attribute blocked | `runtime.js:250` | Gunakan `addEventListener` atau pengikat acara PromptJS, bukan atribut `on*` inline |
| `PJS-W1002` | URL skema tidak aman (`javascript:`/`data:`/`vbscript:`) diblokir / Unsafe-scheme URL blocked | `runtime.js:257` | Gunakan URL `http(s):`, `mailto:`, atau path relatif |

```text
[PromptJS] PJS-W1001: atribut event-handler diblokir demi keamanan: onclick
  (saran: gunakan addEventListener atau pengikat acara PromptJS, jangan atribut on* inline)
[PromptJS] PJS-W1002: URL skema tidak aman diblokir pada atribut href: javascript:alert(1)
  (saran: gunakan URL http(s):, mailto:, atau path relatif)
```

Peringatan ini bersifat **informatif** — perilaku tetap fail-closed (atribut
sudah diblokir). Lihat [Error Codes](../reference/error-codes.md) untuk daftar
lengkap kode.

These warnings are **informational** — behavior remains fail-closed (the
attribute is already blocked). See [Error Codes](../reference/error-codes.md)
for the full code list.

---

## Error Keamanan Compile-Time / Compile-Time Security Errors

Dua error compile-time menjaga konfigurasi auth agar tidak memuat nilai
berbahaya. Keduanya **fail-closed** — kompilasi gagal alih-alih memancarkan kode
tak-aman.

Two compile-time errors guard the auth configuration against dangerous values.
Both are **fail-closed** — compilation fails rather than emitting unsafe code.

| Kode / Code | Arti / Meaning | Sumber / Source |
|-------------|----------------|-----------------|
| `E5004` | Sumber penyimpanan token auth tidak valid — hanya `localStorage`/`sessionStorage` diizinkan / Invalid auth token storage source (whitelist) | `error-codes.js:124` |
| `E5005` | Skema URL redirect auth tidak aman (`javascript:`/`data:`) / Unsafe auth redirect URL scheme | `error-codes.js:125` |

```text
E5004: Sumber penyimpanan token auth tidak valid: "cookieJar".
       Hanya "localStorage" atau "sessionStorage" yang diizinkan
       → Setel front-matter "token:" ke "localStorage" atau "sessionStorage"

E5005: Target redirect auth memakai skema tidak aman: "javascript:alert(1)".
       Gunakan path relatif/absolut, bukan "javascript:" atau "data:"
       → Setel "redirect:" ke path seperti "/login" atau URL http(s)
```

---

## Penahanan Path / Path Containment — v1.0.1

Selain pertahanan DOM/XSS di atas, PromptJS memuat **guard penahanan path**
terpusat untuk setiap titik yang menggabungkan segmen path **tak-tepercaya**
(path URL, nama entri direktori) ke sebuah direktori akar. Ini menutup kelas
**path traversal** (`../../etc/passwd`, path absolut, escape direktori-saudara)
di mana sebuah permintaan/aset mencoba keluar dari root yang seharusnya.

Beyond the DOM/XSS defenses above, PromptJS ships a **centralized path
containment guard** for every point that joins an **untrusted** path segment (a
URL path, a directory-entry name) onto a root directory. It closes the **path
traversal** class (`../../etc/passwd`, absolute paths, sibling-directory escape)
where a request/asset tries to break out of its intended root.

Guard ini **diekstraksi ke satu utilitas bersama** (`src/utils/path-guard.js`)
sehingga dev-server CLI **dan** seluruh adapter memakai pemeriksaan yang sama dan
benar — bukan salinan ad-hoc per-adapter yang berisiko menyimpang.

The guard is **extracted into one shared utility** (`src/utils/path-guard.js`)
so the CLI dev-server **and** every adapter use the same, correct check — not
per-adapter ad-hoc copies that risk drifting apart.

| Fungsi / Function | Peran / Role | Sumber / Source |
|-------------------|--------------|-----------------|
| `isInsideRoot(rootDir, candidatePath)` | Mengembalikan `true` hanya jika kandidat berada di dalam (atau sama dengan) root / Returns `true` only when candidate is inside (or equal to) root | `utils/path-guard.js` |
| `safeResolve(rootDir, childPath)` | Menggabungkan segmen tak-tepercaya ke root lalu melaporkan `{ inside, resolved }` / Joins an untrusted segment onto root, reports `{ inside, resolved }` | `utils/path-guard.js` |

**Pemakaian di seluruh basis kode / Usage across the codebase:**

| Lokasi / Location | Yang dilindungi / What it protects |
|-------------------|------------------------------------|
| `cli/commands/serve.js:276` | Permintaan dev-server tidak boleh menyajikan file di luar root proyek / Dev-server requests cannot serve files outside the project root |
| `engine/adapters/static.js:325` | Penyalinan aset statis melewati entri yang keluar dari root / Static asset copy skips entries that escape the root |
| `engine/adapters/vercel.js:193` | Pemetaan output Vercel menolak src/dest yang keluar dari root / Vercel output mapping rejects src/dest escaping the root |

> 💡 **Mengapa `path.relative`, bukan `resolved.startsWith(root)` / Why
> `path.relative`, not `resolved.startsWith(root)`:** pemeriksaan awalan naif
> punya celah saudara-direktori — root `/srv/app` salah menerima
> `/srv/app-secret/x` karena string-nya berawalan root. `path.relative(root,
> target)` menghasilkan langkah dari root ke target; jika langkah itu memanjat
> keluar (`..`) atau absolut, target berada di luar root. Benar lintas POSIX &
> Windows.
>
> *The naive prefix check has a sibling-directory escape; `path.relative` yields
> the step from root to target — if it climbs out (`..`) or is absolute, the
> target is outside. Correct on POSIX and Windows.*

Sifat **fail-closed**: saat ragu (di luar root), entri di-skip / permintaan
ditolak. Utilitas ini **murni & zero-dependency** (tidak menyentuh filesystem,
deterministik) dan **tertutup 100% oleh tes** (`tests/v6-path-guard.test.js`).

**Fail-closed** by nature: when in doubt (outside root), the entry is skipped /
the request is rejected. The utility is **pure & zero-dependency** (no
filesystem access, deterministic) and **100% test-covered**
(`tests/v6-path-guard.test.js`).

---

## Content-Security-Policy / CSP

PromptJS dapat menyuntikkan CSP berbasis **nonce** ke output build. Aktifkan
lewat flag CLI `--csp` atau `csp: true` di `pjs.config.js`. CLI args meng-override
config (`config.js:164–166`).

PromptJS can inject a **nonce-based** CSP into the build output. Enable it via
the `--csp` CLI flag or `csp: true` in `pjs.config.js`. CLI args override config
(`config.js:164–166`).

```bash
# Aktifkan CSP saat build / Enable CSP at build time
pjs build src --csp
```

```js
// pjs.config.js
export default {
  adapter: 'static',
  csp: true,
};
```

Saat aktif, adapter `static` menyisipkan tag `<meta http-equiv="Content-Security-Policy">`
sebelum `</head>` dan menambahkan atribut `nonce` ke seluruh tag `<script>`
(`static.js:165–184`):

When enabled, the `static` adapter injects a
`<meta http-equiv="Content-Security-Policy">` tag before `</head>` and adds a
`nonce` attribute to every `<script>` tag (`static.js:165–184`):

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self';
  script-src 'self' 'nonce-<acak>'; style-src 'self' 'nonce-<acak>';
  img-src 'self' data: https:; connect-src 'self' https:;
  font-src 'self'; frame-src 'none'">
```

> 💡 **Dampak / Impact:** Dengan CSP nonce aktif, skrip inline tanpa nonce yang
> cocok **tidak akan dieksekusi** oleh browser — lapisan pertahanan kedua di
> atas sanitasi runtime. Lihat [Adapters](adapters.md) dan
> [Deployment](../user/deployment.md) untuk detail per-adapter.
>
> *With nonce CSP enabled, inline scripts without a matching nonce will not
> execute — a second line of defense atop runtime sanitization.*

---

## Praktik Terbaik / Best Practices

**Lakukan / Do:**

- ✅ Andalkan sanitasi otomatis untuk konten dinamis — biarkan `__sanitizeHTML`
  dan `__safeAttr` bekerja; jangan mengakali keduanya.
- ✅ Pasang `window.__pjs_verifyPeran` dengan verifikasi server bila memakai
  `peran`. / Install a server-backed `__pjs_verifyPeran` when using `peran`.
- ✅ Aktifkan `--csp` untuk build produksi sebagai pertahanan berlapis. / Enable
  `--csp` for production builds as defense-in-depth.
- ✅ Validasi & otorisasi **semua** data sensitif di server/API. / Validate and
  authorize **all** sensitive data on the server/API.

**Jangan / Don't:**

- ❌ Jangan memperlakukan auth guard sebagai kontrol keamanan — ia hanya UX. /
  Don't treat the auth guard as a security control — it's UX only.
- ❌ Jangan menyimpan rahasia (kunci API, kredensial) di `localStorage`. / Don't
  store secrets in `localStorage`.
- ❌ Jangan menonaktifkan/mengakali helper sanitasi untuk "menghemat" — itu
  membuka XSS. / Don't bypass the sanitization helpers — that opens XSS.
- ❌ Jangan mengandalkan CSP saja tanpa sanitasi server-side untuk HTML
  tak-tepercaya kompleks. / Don't rely on CSP alone for complex untrusted HTML.

---

## Lihat Juga / See Also

- [Auth](auth.md) — Direktif auth guard & alur login/logout.
- [Error Codes](../reference/error-codes.md) — Daftar lengkap `E5004`, `E5005`,
  `PJS-W1001`, `PJS-W1002`.
- [Glossary](../reference/glossary.md) — Istilah keamanan (`__sanitizeHTML`,
  `__safeAttr`, `__pjs_verifyPeran`, fail-closed, advisory).
- [Adapters](adapters.md) — Adapter `static`/`vercel` & guard penahanan path
  bersama (`isInsideRoot`).
- [Deployment](../user/deployment.md) — Penerapan CSP per-adapter di produksi.

---

← [Auth](auth.md) · [Components](components.md) →
