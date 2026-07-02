# PromptJS Standalone — Browser CDN

Compile `.pjs` langsung di browser. Tanpa Node. Tanpa npm. Tanpa build.

## Quick Start

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PromptJS</title>
  <script src="https://cdn.jsdelivr.net/npm/@raarion/prompt-js/dist/promptjs.standalone.min.js"></script>
</head>
<body>
  <script type="text/pjs">
    Halaman Utama:
        data hitung = 0

        Buat h1: "PromptJS di Browser 🌀"
        Buat tombol: "Klik: " + hitung
            Ketika diklik:
                simpan hitung tambah 1 ke hitung
  </script>
</body>
</html>
```

Buka di browser — langsung jalan.

## Cara Pakai

### A. Inline (`<script type="text/pjs">`)

Tulis kode PromptJS langsung di HTML:

```html
<script src="https://cdn.jsdelivr.net/npm/@raarion/prompt-js/dist/promptjs.standalone.min.js"></script>
<script type="text/pjs">
  Halaman Utama:
      Buat h1: "Halo Dunia"
</script>
```

### B. External (`<link rel="pjs">`)

Pisahkan kode PromptJS ke file terpisah:

```html
<script src="https://cdn.jsdelivr.net/npm/@raarion/prompt-js/dist/promptjs.standalone.min.js"></script>
<link rel="pjs" href="./app.pjs">
```

### C. Programmatic API

```js
const result = window.PromptJS.compile(source, {
  loadDataFiles: false,
  source: 'app.pjs',
});

if (result.success) {
  // result.js  — compiled JavaScript
  // result.css — extracted CSS
  console.log(result.js);
}
```

## Keamanan

- **Zero `eval()`** — compiled JS di-inject via `<script>` tag element (DOM API standar)
- **Zero `new Function()`**
- **CSP-compatible** — nonce dari `<script>` pemanggil otomatis dipropagate
- **Fail-closed** — atribut event-handler & URL berbahaya diblokir
- **Sanitizer allowlist** — XSS sanitation pada konten dinamis

## Keterbatasan

- **Module system (`kirim`/`terima`)** — belum didukung di standalone. Gunakan single-file `.pjs`.
- **Front-matter file references** — belum didukung (butuh `fs`). Gunakan data inline.
- **CLI commands** (`pjs build`, `pjs init`) — tidak tersedia. Hanya `compile()` API.

## CDN

```
unminified: https://cdn.jsdelivr.net/npm/@raarion/prompt-js/dist/promptjs.standalone.js
minified:   https://cdn.jsdelivr.net/npm/@raarion/prompt-js/dist/promptjs.standalone.min.js
```

## Build Sendiri

```bash
npm run standalone
# Output: dist/promptjs.standalone.js
#         dist/promptjs.standalone.min.js
```
