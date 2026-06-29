# Modul / Modules

> docs/language/ → **Modules**
> ← [Auth](auth.md) · [Plugins](plugins.md) →

---

Sistem modul PromptJS memungkinkan berbagi simbol antar file `.pjs` melalui direktif front-matter. Satu file mengekspor simbol, file lain mengimpor. Ini adalah sistem statis pada waktu kompilasi — bukan runtime module loader.

The PromptJS module system allows sharing symbols between `.pjs` files via front-matter directives. One file exports a symbol, another imports it. This is a static system at compile time — not a runtime module loader.

> Verifikasi sumber / Source verification: `src/engine/modules.js` — `extractModuleDirectives()` (parsing `kirim`/`share`, `terima`/`get`), `resolveImports()` (resolusi rekursif, deteksi siklus, batas kedalaman 10).

---

## Ekspor / Export

Gunakan `kirim` (atau `share`) di dalam front-matter eksplisit. Dua bentuk tersedia:

Use `kirim` (or `share`) inside explicit front-matter. Two forms are available:

### Inline Value / Nilai Inline

```pjs
---
kirim: apiKey = "abc123"
kirim: versi = 2
---

Halaman:
    Buat span: $apiKey
```

Nilai string di-parse sebagai JSON jika memungkinkan (`JSON.parse`), jika gagal tetap sebagai string. Jadi `versi = 2` menjadi angka `2`, sedangkan `apiKey = "abc123"` menjadi string `"abc123"`.

String values are parsed as JSON if possible (`JSON.parse`); if parsing fails, kept as a string. So `versi = 2` becomes the number `2`, while `apiKey = "abc123"` becomes the string `"abc123"`.

### Re-ekspor / Re-export

```pjs
---
kirim: formatTanggal dari "utils.pjs"
---

Halaman:
    Buat span: $formatTanggal
```

Simbol `formatTanggal` dari `utils.pjs` di-resolve secara rekursif (ditandai internal `__reExport`) dan tersedia sebagai `$formatTanggal`.

The `formatTanggal` symbol from `utils.pjs` is resolved recursively (marked internally as `__reExport`) and available as `$formatTanggal`.

---

## Impor / Import

Gunakan `terima` (atau `get`) di front-matter eksplisit:

Use `terima` (or `get`) in explicit front-matter:

```pjs
---
terima: apiKey dari "config.pjs"
terima: baseUrl dari "config.pjs"
---

Halaman:
    Buat span: $baseUrl
```

Path relatif terhadap file yang mengimpor. Simbol yang diimpor tersedia sebagai `$nama` di seluruh file.

Paths are relative to the importing file. Imported symbols are available as `$name` throughout the file.

---

## Contoh Lengkap Dua File / Complete Two-File Example

**`config.pjs`** — mengekspor / exports:

```pjs
---
kirim: apiKey = "sk-demo-123"
kirim: baseUrl = "https://api.contoh.id"
---
```

**`beranda.pjs`** — mengimpor & memakai / imports & uses:

```pjs
---
terima: apiKey dari "config.pjs"
terima: baseUrl dari "config.pjs"
---

Halaman:
    Buat h1: "Beranda"
    Buat code: $baseUrl
    Ketika tombol#muat diklik:
        ambil dari $baseUrl + "/produk" dengan header "Authorization": $apiKey -> simpan ke produk:
```

Saat `beranda.pjs` dikompilasi, resolver membaca `config.pjs`, mengekstrak `kirim`, lalu menyuntikkan `apiKey` dan `baseUrl` ke data front-matter `beranda.pjs`.

When `beranda.pjs` is compiled, the resolver reads `config.pjs`, extracts its `kirim` entries, then injects `apiKey` and `baseUrl` into `beranda.pjs`'s front-matter data.

---

## Resolusi / Resolution

Alur resolusi modul / Module resolution flow:

```
beranda.pjs (terima: apiKey dari "config.pjs")
   │
   ├─ 1. Ekstrak direktif kirim/terima dari front-matter
   │     Extract kirim/terima directives from front-matter
   │
   ├─ 2. Untuk tiap terima → baca file sumber (config.pjs)
   │     For each terima → read source file
   │
   ├─ 3. Ekstrak front-matter file sumber
   │     Extract source file's front-matter
   │
   ├─ 4. Cari simbol yang diminta dalam kirim file sumber
   │     Find requested symbol in source's kirim
   │
   ├─ 5. Jika re-ekspor → resolve rekursif (maks 10 level)
   │     If re-export → resolve recursively (max depth 10)
   │
   └─ 6. Merge nilai ter-resolve ke front-matter konsumen
         Merge resolved values into consumer front-matter
```

Kedalaman maksimum resolusi rekursif adalah **10 level**; melebihi itu menghasilkan error `E0000` dan kompilasi dihentikan.

Maximum recursive resolution depth is **10 levels**; exceeding it produces error `E0000` and compilation halts.

---

## Deteksi Siklus / Cycle Detection

Sistem menggunakan `Set` untuk melacak file yang sudah dikunjungi (`visited`). Jika file yang sama ditemukan lagi, peringatan `W0000` dipancarkan dan impor dilewati — sehingga siklus tidak membuat kompilasi hang.

The system uses a `Set` to track visited files (`visited`). If the same file is encountered again, warning `W0000` is emitted and the import is skipped — so a cycle never hangs compilation.

```pjs
# config.pjs
kirim: apiKey dari "helper.pjs"

# helper.pjs
terima: apiKey dari "config.pjs"
# → W0000: Circular dependency detected: config.pjs already visited.
```

---

## Penanganan Error / Error Handling

| Kondisi / Condition | Kode / Code | Perilaku / Behavior |
|---------------------|-------------|---------------------|
| File sumber tidak ditemukan / Source file not found | `W0000` | Warning; simbol jadi `undefined` saat runtime / symbol becomes `undefined` at runtime |
| Simbol tidak ditemukan di file sumber / Symbol not found in source | `W0000` | Warning; impor dilewati / import skipped |
| Siklus terdeteksi / Cycle detected | `W0000` | Warning; impor dilewati / import skipped |
| File sumber tanpa front-matter / Source without front-matter | `W0000` | Warning; tidak ada simbol untuk dibagi / no symbols to share |
| Kedalaman melebihi 10 / Depth exceeds 10 | `E0000` | Error; kompilasi dihentikan / compilation halts |

> Penjelasan setiap kode: [Error Codes](../reference/error-codes.md).

---

## Batasan / Limitations

- Hanya berbagi simbol pada level front-matter. Tidak ada runtime module system.
- Hanya file `.pjs` yang dapat dirujuk. Tidak bisa mengimpor dari `.js` atau `.json` secara langsung.
- Tidak ada named export — seluruh simbol di file sumber tersedia untuk diimpor.
- Nilai yang dibagikan harus serialisasi sebagai JSON atau string sederhana.

Only shares symbols at the front-matter level. No runtime module system exists.

Only `.pjs` files can be referenced. Cannot import from `.js` or `.json` files directly.

No named exports — all symbols in the source file are available for import.

Shared values must be serializable as JSON or simple strings.

---

← [Auth](auth.md) · [Plugins](plugins.md) →
